-- ============================================================
-- 004_matching_engine.sql
-- Smart request distribution / matching engine for PROFIX.
--
-- Architecture:
--   broadcast_requests  → client posts "I need service X in city Y"
--   request_dispatches  → engine selects top-N pros and notifies them
--   professional_metrics → denormalized scoring data (updated in real-time)
--   matching_config     → admin-tunable weights and parameters (singleton)
--
-- Scoring formula (all components normalized to [0,1]):
--   raw_score =
--     W_rating        × (rating − 1) / 4
--     + W_distance    × city_match_factor
--     + W_response    × 1 / (1 + avg_response_min / 30)
--     + W_acceptance  × acceptance_rate
--     + W_completed   × ln(1 + min(completed, 100)) / ln(101)
--     + W_activity    × exp(−days_since_active / 7)
--     + W_plan        × {premium: 1.0, basic: 0.6, free: 0.2}
--
--   final_score = raw_score
--     × fairness_multiplier(hours_since_last_dispatch)   ← round-robin
--     + inactivity_boost(days_since_last_dispatch)        ← re-engage idle pros
-- ============================================================

-- ─── 1. MATCHING CONFIG (singleton) ──────────────────────────
-- Primary key is a fixed text so only one row can ever exist.
CREATE TABLE IF NOT EXISTS matching_config (
  id                      TEXT PRIMARY KEY DEFAULT 'default',
  -- Ranking weights (must sum ≈ 1.00 for interpretability, not enforced)
  weight_rating           NUMERIC(5,4) NOT NULL DEFAULT 0.25,
  weight_distance         NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  weight_response_time    NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  weight_acceptance_rate  NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  weight_completed        NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  weight_activity         NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  weight_plan             NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  -- Dispatch parameters
  dispatch_limit          INT          NOT NULL DEFAULT 5  CHECK (dispatch_limit BETWEEN 1 AND 20),
  response_window_minutes INT          NOT NULL DEFAULT 5  CHECK (response_window_minutes BETWEEN 1 AND 60),
  max_concurrent_per_pro  INT          NOT NULL DEFAULT 3  CHECK (max_concurrent_per_pro BETWEEN 1 AND 10),
  expansion_batch_size    INT          NOT NULL DEFAULT 3  CHECK (expansion_batch_size BETWEEN 1 AND 10),
  -- Fairness tuning
  fairness_half_life_hours NUMERIC(6,2) NOT NULL DEFAULT 6.0,   -- hours until penalty decays to 50%
  inactivity_boost_7d     NUMERIC(5,4) NOT NULL DEFAULT 0.15,   -- bonus after 7 days without dispatch
  inactivity_boost_3d     NUMERIC(5,4) NOT NULL DEFAULT 0.08,   -- bonus after 3 days
  inactivity_boost_1d     NUMERIC(5,4) NOT NULL DEFAULT 0.03,   -- bonus after 1 day
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 2. PROFESSIONAL METRICS ─────────────────────────────────
-- Denormalized scoring counters, updated incrementally on each dispatch/response.
-- This avoids expensive aggregations on every match query.
CREATE TABLE IF NOT EXISTS professional_metrics (
  user_id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_response_minutes NUMERIC(8,2) NOT NULL DEFAULT 60.0  CHECK (avg_response_minutes >= 0),
  acceptance_rate      NUMERIC(5,4) NOT NULL DEFAULT 0.5   CHECK (acceptance_rate BETWEEN 0 AND 1),
  completed_count      INT          NOT NULL DEFAULT 0      CHECK (completed_count >= 0),
  last_active_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_dispatched_at   TIMESTAMPTZ,
  concurrent_active    INT          NOT NULL DEFAULT 0      CHECK (concurrent_active >= 0),
  total_dispatched     INT          NOT NULL DEFAULT 0,
  total_accepted       INT          NOT NULL DEFAULT 0,
  total_declined       INT          NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── 3. BROADCAST REQUESTS ───────────────────────────────────
-- A client posts "I need service X in city Y". The engine dispatches
-- to 3-5 professionals per round. Client never picks a specific pro upfront.
CREATE TABLE IF NOT EXISTS broadcast_requests (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id              TEXT        NOT NULL REFERENCES categories(id),
  city                     TEXT        NOT NULL,
  description              TEXT        NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'dispatching'
                             CHECK (status IN ('dispatching', 'expanding', 'accepted', 'expired', 'cancelled')),
  current_round            INT         NOT NULL DEFAULT 1,
  accepted_professional_id UUID        REFERENCES auth.users(id),
  service_request_id       UUID        REFERENCES service_requests(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. REQUEST DISPATCHES ───────────────────────────────────
-- One row per professional notification per broadcast.
-- Unique constraint prevents double-dispatch of same pro to same broadcast.
CREATE TABLE IF NOT EXISTS request_dispatches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id    UUID        NOT NULL REFERENCES broadcast_requests(id) ON DELETE CASCADE,
  professional_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round           INT         NOT NULL DEFAULT 1,
  score           NUMERIC(8,4) NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  dispatched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  UNIQUE (broadcast_id, professional_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_request_dispatches_pro_status
  ON request_dispatches (professional_id, status);
CREATE INDEX IF NOT EXISTS idx_request_dispatches_broadcast
  ON request_dispatches (broadcast_id, status);
CREATE INDEX IF NOT EXISTS idx_request_dispatches_expires
  ON request_dispatches (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_broadcast_requests_client
  ON broadcast_requests (client_id, status);

-- ─── 5. SCORING FUNCTION ─────────────────────────────────────
-- Pure, stable function: computes the final match score for one professional.
-- Called per-candidate row during dispatch; reads matching_config inline.
CREATE OR REPLACE FUNCTION _score_professional(
  p_user_id      UUID,
  p_category_id  TEXT,
  p_client_city  TEXT
)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH
  cfg AS (
    SELECT * FROM matching_config WHERE id = 'default'
  ),
  pro AS (
    SELECT
      COALESCE(pp.rating, 3.0)                                         AS rating,
      COALESCE(pp.plan, 'free')                                        AS plan,
      COALESCE(pm.avg_response_minutes, 60.0)                          AS avg_resp,
      COALESCE(pm.acceptance_rate, 0.5)                                AS acc_rate,
      COALESCE(pm.completed_count, 0)                                  AS completed,
      COALESCE(pm.last_active_at, now() - INTERVAL '30 days')          AS last_active,
      pm.last_dispatched_at,
      COALESCE(pr.city, '')                                            AS pro_city
    FROM professional_profiles pp
    JOIN profiles pr ON pr.user_id = pp.user_id
    LEFT JOIN professional_metrics pm ON pm.user_id = pp.user_id
    WHERE pp.user_id = p_user_id
      AND pp.category_id = p_category_id
  )
  SELECT
    -- ── raw weighted score ──────────────────────────────────
    (
      cfg.weight_rating          * ((p.rating - 1.0) / 4.0)
      + cfg.weight_distance      * CASE WHEN p.pro_city = p_client_city THEN 1.0 ELSE 0.3 END
      + cfg.weight_response_time * (1.0 / (1.0 + p.avg_resp / 30.0))
      + cfg.weight_acceptance_rate * p.acc_rate
      + cfg.weight_completed     * (LN(1.0 + LEAST(p.completed::NUMERIC, 100.0)) / LN(101.0))
      + cfg.weight_activity      * EXP(
          -EXTRACT(EPOCH FROM (now() - p.last_active))
          / (7.0 * 86400.0)
        )
      + cfg.weight_plan          * CASE p.plan
          WHEN 'premium' THEN 1.0
          WHEN 'basic'   THEN 0.6
          ELSE                0.2
        END
    )
    -- ── fairness multiplier (round-robin: penalize recently dispatched) ──
    * CASE
        WHEN p.last_dispatched_at IS NULL THEN 1.0
        ELSE GREATEST(
          0.40,
          1.0 - 0.60 * EXP(
            -EXTRACT(EPOCH FROM (now() - p.last_dispatched_at))
            / (cfg.fairness_half_life_hours * 3600.0)
          )
        )
      END
    -- ── inactivity boost (re-engage idle professionals) ──────
    + CASE
        WHEN p.last_dispatched_at IS NULL                             THEN cfg.inactivity_boost_7d + 0.05
        WHEN now() - p.last_dispatched_at > INTERVAL '7 days'        THEN cfg.inactivity_boost_7d
        WHEN now() - p.last_dispatched_at > INTERVAL '3 days'        THEN cfg.inactivity_boost_3d
        WHEN now() - p.last_dispatched_at > INTERVAL '1 day'         THEN cfg.inactivity_boost_1d
        ELSE 0.0
      END
  FROM pro p
  CROSS JOIN cfg
$$;

-- ─── 6. DISPATCH FUNCTION ────────────────────────────────────
-- Selects and notifies the top-N professionals for a broadcast request.
-- Called on INSERT (trigger) and again on each expansion round.
CREATE OR REPLACE FUNCTION dispatch_broadcast_request(p_broadcast_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_client_id    UUID;
  v_category_id  TEXT;
  v_city         TEXT;
  v_round        INT;
  v_cfg          RECORD;
  v_batch_limit  INT;
  v_window       INTERVAL;
  v_excluded     UUID[];
  v_selected     UUID[];
  rec            RECORD;
BEGIN
  -- Load broadcast
  SELECT br.client_id, br.category_id, br.city, br.current_round
  INTO v_client_id, v_category_id, v_city, v_round
  FROM broadcast_requests br
  WHERE br.id = p_broadcast_id
    AND br.status IN ('dispatching', 'expanding');

  IF NOT FOUND THEN RETURN; END IF;

  -- Load config
  SELECT * INTO v_cfg FROM matching_config WHERE id = 'default';

  v_window := (v_cfg.response_window_minutes || ' minutes')::INTERVAL;
  v_batch_limit := CASE WHEN v_round = 1
    THEN v_cfg.dispatch_limit
    ELSE v_cfg.expansion_batch_size
  END;

  -- Collect already-contacted professionals (all rounds)
  SELECT ARRAY_AGG(rd.professional_id) INTO v_excluded
  FROM request_dispatches rd
  WHERE rd.broadcast_id = p_broadcast_id;

  -- Score eligible professionals and pick top-N
  SELECT ARRAY_AGG(sub.user_id)
  INTO v_selected
  FROM (
    SELECT
      pp.user_id,
      _score_professional(pp.user_id, v_category_id, v_city) AS score
    FROM professional_profiles pp
    JOIN profiles pr ON pr.user_id = pp.user_id
    LEFT JOIN professional_metrics pm ON pm.user_id = pp.user_id
    WHERE pp.category_id = v_category_id
      AND pp.user_id != v_client_id
      AND (v_excluded IS NULL OR pp.user_id != ALL(v_excluded))
      AND COALESCE(pm.concurrent_active, 0) < v_cfg.max_concurrent_per_pro
    ORDER BY score DESC
    LIMIT v_batch_limit
  ) sub;

  -- No candidates: expire the broadcast
  IF v_selected IS NULL OR array_length(v_selected, 1) = 0 THEN
    UPDATE broadcast_requests
    SET status = 'expired', updated_at = now()
    WHERE id = p_broadcast_id;
    RETURN;
  END IF;

  -- Insert dispatch records
  INSERT INTO request_dispatches (broadcast_id, professional_id, round, score, expires_at)
  SELECT
    p_broadcast_id,
    u,
    v_round,
    _score_professional(u, v_category_id, v_city),
    now() + v_window
  FROM UNNEST(v_selected) AS u;

  -- Update professional_metrics: increment concurrent + track last dispatched
  INSERT INTO professional_metrics (user_id, concurrent_active, last_dispatched_at, total_dispatched, updated_at)
  SELECT u, 1, now(), 1, now() FROM UNNEST(v_selected) AS u
  ON CONFLICT (user_id) DO UPDATE SET
    concurrent_active  = professional_metrics.concurrent_active + 1,
    last_dispatched_at = EXCLUDED.last_dispatched_at,
    total_dispatched   = professional_metrics.total_dispatched + 1,
    updated_at         = EXCLUDED.updated_at;

  RETURN QUERY SELECT UNNEST(v_selected);
END;
$$;

-- ─── 7. RESPONSE HANDLER ─────────────────────────────────────
-- Called when a professional accepts or declines a dispatch.
-- Updates metrics, propagates accepted state, creates service_request.
CREATE OR REPLACE FUNCTION handle_dispatch_response(
  p_dispatch_id UUID,
  p_response    TEXT   -- 'accepted' | 'declined'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_broadcast_id  UUID;
  v_pro_id        UUID;
  v_dispatched_at TIMESTAMPTZ;
  v_resp_minutes  NUMERIC;
  v_cancelled     UUID[];
BEGIN
  -- Fetch dispatch (must be pending)
  SELECT rd.broadcast_id, rd.professional_id, rd.dispatched_at
  INTO v_broadcast_id, v_pro_id, v_dispatched_at
  FROM request_dispatches rd
  WHERE rd.id = p_dispatch_id AND rd.status = 'pending';

  IF NOT FOUND THEN RETURN; END IF;

  v_resp_minutes := EXTRACT(EPOCH FROM (now() - v_dispatched_at)) / 60.0;

  -- Mark this dispatch
  UPDATE request_dispatches
  SET status = p_response, responded_at = now()
  WHERE id = p_dispatch_id;

  -- Update professional metrics (running averages)
  UPDATE professional_metrics SET
    concurrent_active    = GREATEST(0, concurrent_active - 1),
    -- Welford running mean for response time
    avg_response_minutes = CASE
      WHEN total_dispatched = 0 THEN v_resp_minutes
      ELSE (avg_response_minutes * total_dispatched + v_resp_minutes) / (total_dispatched + 1)
    END,
    total_accepted  = total_accepted  + (p_response = 'accepted')::INT,
    total_declined  = total_declined  + (p_response = 'declined')::INT,
    -- Acceptance rate: recompute from totals (post-update totals)
    acceptance_rate = (total_accepted + (p_response = 'accepted')::INT)::NUMERIC
                      / NULLIF(total_dispatched, 0),
    last_active_at  = now(),
    updated_at      = now()
  WHERE user_id = v_pro_id;

  IF p_response = 'accepted' THEN
    -- Collect all other pending dispatches before cancelling them
    SELECT ARRAY_AGG(rd.professional_id) INTO v_cancelled
    FROM request_dispatches rd
    WHERE rd.broadcast_id = v_broadcast_id
      AND rd.id            != p_dispatch_id
      AND rd.status         = 'pending';

    -- Cancel them
    UPDATE request_dispatches
    SET status = 'cancelled', responded_at = now()
    WHERE broadcast_id = v_broadcast_id
      AND id           != p_dispatch_id
      AND status        = 'pending';

    -- Release concurrent slots for cancelled professionals
    IF v_cancelled IS NOT NULL THEN
      UPDATE professional_metrics
      SET concurrent_active = GREATEST(0, concurrent_active - 1), updated_at = now()
      WHERE user_id = ANY(v_cancelled);
    END IF;

    -- Mark broadcast as accepted
    UPDATE broadcast_requests SET
      status                   = 'accepted',
      accepted_professional_id = v_pro_id,
      updated_at               = now()
    WHERE id = v_broadcast_id;

    -- Create confirmed service_request
    INSERT INTO service_requests (client_id, professional_id, description, status)
    SELECT br.client_id, v_pro_id, br.description, 'accepted'
    FROM broadcast_requests br
    WHERE br.id = v_broadcast_id
    ON CONFLICT DO NOTHING;

  END IF;
END;
$$;

-- ─── 8. EXPIRY + EXPANSION ───────────────────────────────────
-- Designed to be called by a cron job every minute (or via pg_cron).
-- 1. Expires individual pending dispatches past their deadline.
-- 2. If a broadcast's entire round expired with no acceptance → expand.
-- 3. If no more pros to expand to → expire the broadcast.
CREATE OR REPLACE FUNCTION expire_pending_dispatches()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_expired_pros UUID[];
  v_broadcast    RECORD;
BEGIN
  -- ── step 1: expire individual dispatches ──────────────────
  SELECT ARRAY_AGG(rd.professional_id) INTO v_expired_pros
  FROM request_dispatches rd
  WHERE rd.status = 'pending' AND rd.expires_at < now();

  UPDATE request_dispatches
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();

  -- Release concurrent slots for expired professionals
  IF v_expired_pros IS NOT NULL THEN
    UPDATE professional_metrics
    SET concurrent_active = GREATEST(0, concurrent_active - 1), updated_at = now()
    WHERE user_id = ANY(v_expired_pros);
  END IF;

  -- ── step 2: broadcasts that lost all pending dispatches ────
  FOR v_broadcast IN
    SELECT br.id, br.current_round
    FROM broadcast_requests br
    WHERE br.status IN ('dispatching', 'expanding')
      AND NOT EXISTS (
        SELECT 1 FROM request_dispatches rd
        WHERE rd.broadcast_id = br.id AND rd.status = 'pending'
      )
      AND NOT EXISTS (
        SELECT 1 FROM request_dispatches rd
        WHERE rd.broadcast_id = br.id AND rd.status = 'accepted'
      )
  LOOP
    -- Increment round, attempt expansion
    UPDATE broadcast_requests
    SET status = 'expanding', current_round = current_round + 1, updated_at = now()
    WHERE id = v_broadcast.id;

    PERFORM dispatch_broadcast_request(v_broadcast.id);
    -- dispatch_broadcast_request internally expires the broadcast if no pros remain
  END LOOP;
END;
$$;

-- ─── 9. AUTO-DISPATCH TRIGGER ────────────────────────────────
CREATE OR REPLACE FUNCTION _trigger_dispatch_on_broadcast()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM dispatch_broadcast_request(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_dispatch_broadcast ON broadcast_requests;
CREATE TRIGGER auto_dispatch_broadcast
  AFTER INSERT ON broadcast_requests
  FOR EACH ROW
  EXECUTE FUNCTION _trigger_dispatch_on_broadcast();

-- ─── 10. updated_at TRIGGERS ─────────────────────────────────
CREATE OR REPLACE FUNCTION _set_updated_at_matching()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS broadcast_requests_updated_at ON broadcast_requests;
CREATE TRIGGER broadcast_requests_updated_at
  BEFORE UPDATE ON broadcast_requests FOR EACH ROW
  EXECUTE FUNCTION _set_updated_at_matching();

DROP TRIGGER IF EXISTS matching_config_updated_at ON matching_config;
CREATE TRIGGER matching_config_updated_at
  BEFORE UPDATE ON matching_config FOR EACH ROW
  EXECUTE FUNCTION _set_updated_at_matching();

-- ─── 11. ROW LEVEL SECURITY ──────────────────────────────────
ALTER TABLE matching_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_metrics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_dispatches    ENABLE ROW LEVEL SECURITY;

-- matching_config: public read, admin write
CREATE POLICY "matching_config_read"     ON matching_config FOR SELECT USING (true);
CREATE POLICY "matching_config_admin"    ON matching_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- professional_metrics: any authenticated user can read (needed for search page score display)
CREATE POLICY "metrics_read"             ON professional_metrics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "metrics_own_update"       ON professional_metrics FOR UPDATE USING (auth.uid() = user_id);

-- broadcast_requests: client sees own; dispatched-to professionals see via dispatch join
CREATE POLICY "broadcast_client_own"     ON broadcast_requests FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "broadcast_client_insert"  ON broadcast_requests FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "broadcast_client_cancel"  ON broadcast_requests FOR UPDATE
  USING (auth.uid() = client_id AND status IN ('dispatching', 'expanding'))
  WITH CHECK (status = 'cancelled');
CREATE POLICY "broadcast_admin_all"      ON broadcast_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- request_dispatches: professional sees own pending; client sees dispatches for their broadcast
CREATE POLICY "dispatch_pro_see_own"     ON request_dispatches FOR SELECT
  USING (auth.uid() = professional_id);
CREATE POLICY "dispatch_client_see"      ON request_dispatches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM broadcast_requests br
      WHERE br.id = request_dispatches.broadcast_id AND br.client_id = auth.uid()
    )
  );
CREATE POLICY "dispatch_admin_all"       ON request_dispatches FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ─── 12. SEED DEFAULT CONFIG ─────────────────────────────────
INSERT INTO matching_config (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ─── 13. SEED METRICS FOR EXISTING PROFESSIONALS ─────────────
-- Backfill professional_metrics for pros already in the system.
INSERT INTO professional_metrics (user_id)
SELECT pp.user_id FROM professional_profiles pp
ON CONFLICT (user_id) DO NOTHING;

-- GRANT read access to views and functions
GRANT EXECUTE ON FUNCTION _score_professional TO authenticated;
GRANT EXECUTE ON FUNCTION dispatch_broadcast_request TO authenticated;
GRANT EXECUTE ON FUNCTION handle_dispatch_response TO authenticated;
