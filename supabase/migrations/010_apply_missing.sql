-- ============================================================
-- 010_apply_missing.sql
-- Applies everything from migrations 003–009 that is NOT yet
-- present in the remote database.
--
-- Order: enums → tables → indexes → functions → views →
--        triggers → policies → grants → seed data
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE verification_level AS ENUM ('basic', 'verified', 'top');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- ─── supply_limits ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supply_limits (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id        TEXT        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  city               TEXT        NOT NULL,
  max_professionals  INTEGER     NOT NULL DEFAULT 10 CHECK (max_professionals > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, city)
);

-- ─── waiting_list ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waiting_list (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  category_id  TEXT        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  city         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at  TIMESTAMPTZ
);

-- ─── matching_config ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matching_config (
  id                       TEXT        PRIMARY KEY DEFAULT 'default',
  weight_rating            NUMERIC(5,4) NOT NULL DEFAULT 0.25,
  weight_distance          NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  weight_response_time     NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  weight_acceptance_rate   NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  weight_completed         NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  weight_activity          NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  weight_plan              NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  dispatch_limit           INT          NOT NULL DEFAULT 5  CHECK (dispatch_limit BETWEEN 1 AND 20),
  response_window_minutes  INT          NOT NULL DEFAULT 5  CHECK (response_window_minutes BETWEEN 1 AND 60),
  max_concurrent_per_pro   INT          NOT NULL DEFAULT 3  CHECK (max_concurrent_per_pro BETWEEN 1 AND 10),
  expansion_batch_size     INT          NOT NULL DEFAULT 3  CHECK (expansion_batch_size BETWEEN 1 AND 10),
  fairness_half_life_hours NUMERIC(6,2) NOT NULL DEFAULT 6.0,
  inactivity_boost_7d      NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  inactivity_boost_3d      NUMERIC(5,4) NOT NULL DEFAULT 0.08,
  inactivity_boost_1d      NUMERIC(5,4) NOT NULL DEFAULT 0.03,
  -- column added/used by migration 009
  max_batch_size           INT          NOT NULL DEFAULT 5,
  dispatch_window_seconds  INT          NOT NULL DEFAULT 300,
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── professional_metrics ────────────────────────────────────
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

-- ─── broadcast_requests ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_requests (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id              TEXT        NOT NULL REFERENCES categories(id),
  city                     TEXT        NOT NULL,
  description              TEXT        NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'dispatching'
                             CHECK (status IN ('dispatching', 'expanding', 'accepted', 'expired', 'cancelled', 'no_pros_available')),
  current_round            INT         NOT NULL DEFAULT 1,
  accepted_professional_id UUID        REFERENCES auth.users(id),
  service_request_id       UUID        REFERENCES service_requests(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── request_dispatches ──────────────────────────────────────
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

-- ─── referral_codes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code         TEXT        NOT NULL UNIQUE,
  clicks       INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_ip_hash TEXT
);

-- ─── referrals ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used            TEXT        NOT NULL REFERENCES referral_codes(code),
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','profile_complete','active','rewarded','fraud')),
  ip_hash              TEXT,
  referred_ip_hash     TEXT,
  device_fingerprint   TEXT,
  fraud_reason         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  profile_completed_at TIMESTAMPTZ,
  activated_at         TIMESTAMPTZ,
  rewarded_at          TIMESTAMPTZ,
  UNIQUE (referrer_id, referred_id),
  CHECK  (referrer_id != referred_id)
);

-- ─── referral_rewards ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_rewards (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id  UUID        NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  reward_type  TEXT        NOT NULL
                 CHECK (reward_type IN ('subscription_month','visibility_boost','ranking_boost')),
  months       INT,
  boost_days   INT,
  tier         INT         NOT NULL DEFAULT 1,
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','applied','expired')),
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ,
  applied_at   TIMESTAMPTZ
);

-- ─── trust_scores ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_scores (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score             INT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  level             verification_level NOT NULL DEFAULT 'basic',
  rating_points     NUMERIC(5,2) DEFAULT 0,
  completed_points  NUMERIC(5,2) DEFAULT 0,
  response_points   NUMERIC(5,2) DEFAULT 0,
  acceptance_points NUMERIC(5,2) DEFAULT 0,
  activity_points   NUMERIC(5,2) DEFAULT 0,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── reputation_tag_definitions ──────────────────────────────
CREATE TABLE IF NOT EXISTS reputation_tag_definitions (
  tag         TEXT PRIMARY KEY,
  label_pt    TEXT NOT NULL,
  icon        TEXT NOT NULL,
  description TEXT NOT NULL,
  positive    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── professional_tags ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_tags (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL REFERENCES reputation_tag_definitions(tag),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

-- ─── notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── user_ip_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_ip_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash     TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── referral_attempt_log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_attempt_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_tried TEXT NOT NULL,
  result     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ALTER TABLE — add columns to existing tables
-- ============================================================

-- professional_profiles: referral reward columns (from 005)
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS subscription_bonus_months INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility_boost_until    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ranking_boost_until       TIMESTAMPTZ;

-- reviews: link to service_request (from 006)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id);

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- request_dispatches
CREATE INDEX IF NOT EXISTS idx_request_dispatches_pro_status
  ON request_dispatches (professional_id, status);
CREATE INDEX IF NOT EXISTS idx_request_dispatches_broadcast
  ON request_dispatches (broadcast_id, status);
CREATE INDEX IF NOT EXISTS idx_request_dispatches_expires
  ON request_dispatches (expires_at) WHERE status = 'pending';

-- broadcast_requests
CREATE INDEX IF NOT EXISTS idx_broadcast_requests_client
  ON broadcast_requests (client_id, status);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer  ON referrals (referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred  ON referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code      ON referrals (code_used);

-- referral_rewards
CREATE INDEX IF NOT EXISTS idx_rewards_user ON referral_rewards (user_id, status);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- user_ip_log
CREATE INDEX IF NOT EXISTS idx_user_ip_log_user ON user_ip_log(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ip_log_ip   ON user_ip_log(ip_hash, recorded_at DESC);

-- referral_attempt_log
CREATE INDEX IF NOT EXISTS idx_referral_attempts_user
  ON referral_attempt_log(user_id, created_at DESC);

-- reviews: unique per service_request
CREATE UNIQUE INDEX IF NOT EXISTS reviews_service_request_unique
  ON reviews(service_request_id)
  WHERE service_request_id IS NOT NULL;

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- ─── slot_occupancy ──────────────────────────────────────────
CREATE OR REPLACE VIEW slot_occupancy AS
SELECT
  sl.id,
  sl.category_id,
  c.name                                                         AS category_name,
  sl.city,
  sl.max_professionals,
  COALESCE(COUNT(pp.id), 0)::INTEGER                             AS active_professionals,
  GREATEST(sl.max_professionals - COALESCE(COUNT(pp.id), 0), 0)::INTEGER AS available_slots,
  CASE
    WHEN sl.max_professionals = 0 THEN 0::NUMERIC
    ELSE ROUND((COALESCE(COUNT(pp.id), 0)::NUMERIC / sl.max_professionals) * 100, 1)
  END                                                            AS occupancy_pct,
  CASE
    WHEN COALESCE(COUNT(pp.id), 0) >= sl.max_professionals THEN 'FULL'
    WHEN sl.max_professionals > 0
      AND (COALESCE(COUNT(pp.id), 0)::NUMERIC / sl.max_professionals) >= 0.7 THEN 'ALMOST_FULL'
    ELSE 'OPEN'
  END                                                            AS status,
  (
    SELECT COUNT(*) FROM waiting_list wl
    WHERE wl.category_id = sl.category_id
      AND wl.city        = sl.city
      AND wl.notified_at IS NULL
  )::INTEGER                                                     AS waiting_count
FROM supply_limits sl
JOIN categories c ON c.id = sl.category_id
LEFT JOIN professional_profiles pp ON pp.category_id = sl.category_id
LEFT JOIN profiles pr
       ON pr.user_id = pp.user_id
      AND pr.city    = sl.city
GROUP BY sl.id, sl.category_id, c.name, sl.city, sl.max_professionals;


-- ─── check_slot_available ────────────────────────────────────
CREATE OR REPLACE FUNCTION check_slot_available(p_category_id TEXT, p_city TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT active_professionals < max_professionals
      FROM   slot_occupancy
      WHERE  category_id = p_category_id
        AND  city        = p_city
      LIMIT  1
    ),
    TRUE
  );
$$;

-- ─── notify_waiting_list ─────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_waiting_list(p_category_id TEXT, p_city TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE waiting_list
  SET    notified_at = now()
  WHERE  id = (
    SELECT id
    FROM   waiting_list
    WHERE  category_id  = p_category_id
      AND  city         = p_city
      AND  notified_at  IS NULL
    ORDER  BY created_at ASC
    LIMIT  1
  );
$$;

-- ─── _supply_limits_set_updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION _supply_limits_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── _score_professional ─────────────────────────────────────
CREATE OR REPLACE FUNCTION _score_professional(
  p_user_id      UUID,
  p_category_id  TEXT,
  p_client_city  TEXT
)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
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

-- ─── dispatch_broadcast_request (009 final version) ──────────
CREATE OR REPLACE FUNCTION dispatch_broadcast_request(p_broadcast_id UUID)
RETURNS TABLE (professional_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast     broadcast_requests%ROWTYPE;
  v_cfg           matching_config%ROWTYPE;
  v_category_id   TEXT;
  v_city          TEXT;
  v_client_id     UUID;
  v_batch_limit   INT;
  v_round         INT;
  v_window        INTERVAL;
  v_excluded      UUID[];
  v_selected      UUID[];
BEGIN
  SELECT * INTO v_broadcast
  FROM broadcast_requests
  WHERE id = p_broadcast_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_broadcast.status NOT IN ('dispatching', 'expanding') THEN RETURN; END IF;

  SELECT * INTO v_cfg FROM matching_config LIMIT 1;

  v_category_id := v_broadcast.category_id;
  v_city        := v_broadcast.city;
  v_client_id   := v_broadcast.client_id;
  v_round       := v_broadcast.current_round;
  v_batch_limit := v_cfg.max_batch_size;
  v_window      := (v_cfg.dispatch_window_seconds || ' seconds')::INTERVAL;

  SELECT ARRAY_AGG(rd.professional_id)
  INTO v_excluded
  FROM request_dispatches rd
  WHERE rd.broadcast_id = p_broadcast_id;

  SELECT ARRAY_AGG(sub.user_id)
  INTO v_selected
  FROM (
    SELECT pp.user_id, _score_professional(pp.user_id, v_category_id, v_city) AS score
    FROM professional_profiles pp
    JOIN profiles pr ON pr.user_id = pp.user_id
    LEFT JOIN professional_metrics pm ON pm.user_id = pp.user_id
    WHERE pp.category_id = v_category_id
      AND pr.city        = v_city
      AND pp.user_id    != v_client_id
      AND (v_excluded IS NULL OR pp.user_id != ALL(v_excluded))
      AND COALESCE(pm.concurrent_active, 0) < v_cfg.max_concurrent_per_pro
    ORDER BY score DESC
    LIMIT v_batch_limit
  ) sub;

  IF v_selected IS NULL OR array_length(v_selected, 1) = 0 THEN
    UPDATE broadcast_requests
    SET status = 'no_pros_available', updated_at = now()
    WHERE id = p_broadcast_id;
    RETURN;
  END IF;

  INSERT INTO request_dispatches (broadcast_id, professional_id, status, score, dispatched_at, expires_at)
  SELECT
    p_broadcast_id,
    u,
    'pending',
    _score_professional(u, v_category_id, v_city),
    now(),
    now() + v_window
  FROM UNNEST(v_selected) AS u;

  PERFORM 1 FROM professional_metrics
  WHERE user_id = ANY(v_selected)
  FOR UPDATE;

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

-- ─── handle_dispatch_response (007 final version) ────────────
CREATE OR REPLACE FUNCTION handle_dispatch_response(
  p_dispatch_id UUID,
  p_response    TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispatch              RECORD;
  v_broadcast             RECORD;
  v_config                RECORD;
  v_resp_minutes          NUMERIC;
  v_old_total_accepted    INT;
  v_old_total_declined    INT;
  v_old_total_dispatched  INT;
  v_old_avg_response      NUMERIC;
  v_new_avg_response      NUMERIC;
  v_new_acceptance_rate   NUMERIC;
BEGIN
  SELECT * INTO v_dispatch
  FROM request_dispatches
  WHERE id = p_dispatch_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispatch not found or already responded';
  END IF;

  SELECT * INTO v_broadcast
  FROM broadcast_requests
  WHERE id = v_dispatch.broadcast_id
  FOR UPDATE;

  SELECT * INTO v_config FROM matching_config WHERE id = 'default';

  v_resp_minutes := EXTRACT(EPOCH FROM (NOW() - v_dispatch.dispatched_at)) / 60.0;

  SELECT
    total_accepted,
    total_declined,
    total_dispatched,
    avg_response_minutes
  INTO
    v_old_total_accepted,
    v_old_total_declined,
    v_old_total_dispatched,
    v_old_avg_response
  FROM professional_metrics
  WHERE user_id = v_dispatch.professional_id
  FOR UPDATE;

  UPDATE request_dispatches SET
    status       = p_response,
    responded_at = NOW()
  WHERE id = p_dispatch_id;

  IF p_response = 'accepted' THEN
    UPDATE request_dispatches SET
      status = 'cancelled'
    WHERE broadcast_id = v_dispatch.broadcast_id
      AND id != p_dispatch_id
      AND status = 'pending';

    UPDATE broadcast_requests SET
      status                    = 'accepted',
      accepted_professional_id  = v_dispatch.professional_id
    WHERE id = v_dispatch.broadcast_id;

    INSERT INTO service_requests (client_id, professional_id, description, status)
    SELECT
      b.client_id,
      v_dispatch.professional_id,
      b.description,
      'accepted'
    FROM broadcast_requests b
    WHERE b.id = v_dispatch.broadcast_id;

  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM request_dispatches
      WHERE broadcast_id = v_dispatch.broadcast_id
        AND round = v_dispatch.round
        AND status = 'pending'
    ) THEN
      UPDATE broadcast_requests SET status = 'expanding'
      WHERE id = v_dispatch.broadcast_id AND status = 'dispatching';
    END IF;
  END IF;

  IF p_response = 'accepted' AND v_old_total_dispatched IS NOT NULL THEN
    v_new_avg_response := CASE
      WHEN v_old_total_dispatched = 0 THEN v_resp_minutes
      ELSE (v_old_avg_response * v_old_total_dispatched + v_resp_minutes)
           / (v_old_total_dispatched + 1)
    END;
  ELSE
    v_new_avg_response := v_old_avg_response;
  END IF;

  DECLARE
    v_new_accepted INT := v_old_total_accepted + (p_response = 'accepted')::INT;
    v_new_declined INT := v_old_total_declined + (p_response = 'declined')::INT;
  BEGIN
    v_new_acceptance_rate := v_new_accepted::NUMERIC
                             / NULLIF(v_new_accepted + v_new_declined, 0);
  END;

  UPDATE professional_metrics SET
    total_dispatched     = COALESCE(v_old_total_dispatched, 0) + 1,
    total_accepted       = COALESCE(v_old_total_accepted, 0)  + (p_response = 'accepted')::INT,
    total_declined       = COALESCE(v_old_total_declined, 0)  + (p_response = 'declined')::INT,
    avg_response_minutes = COALESCE(v_new_avg_response, avg_response_minutes),
    acceptance_rate      = COALESCE(v_new_acceptance_rate, acceptance_rate),
    concurrent_active    = CASE
                             WHEN p_response = 'accepted'
                             THEN COALESCE(concurrent_active, 0) + 1
                             ELSE concurrent_active
                           END,
    last_dispatched_at   = NOW(),
    updated_at           = NOW()
  WHERE user_id = v_dispatch.professional_id;
END;
$$;

-- ─── expire_pending_dispatches (009 final version) ───────────
CREATE OR REPLACE FUNCTION expire_pending_dispatches()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast RECORD;
BEGIN
  UPDATE request_dispatches
  SET status = 'expired', responded_at = now()
  WHERE status = 'pending' AND expires_at < now();

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
    FOR UPDATE
  LOOP
    UPDATE broadcast_requests
    SET status = 'expanding', current_round = current_round + 1, updated_at = now()
    WHERE id = v_broadcast.id;

    PERFORM dispatch_broadcast_request(v_broadcast.id);
  END LOOP;
END;
$$;

-- ─── _set_updated_at_matching ────────────────────────────────
CREATE OR REPLACE FUNCTION _set_updated_at_matching()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ─── _trigger_dispatch_on_broadcast ──────────────────────────
CREATE OR REPLACE FUNCTION _trigger_dispatch_on_broadcast()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM dispatch_broadcast_request(NEW.id);
  RETURN NEW;
END;
$$;

-- ─── _generate_referral_code ─────────────────────────────────
CREATE OR REPLACE FUNCTION _generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name  TEXT;
  v_base  TEXT;
  v_code  TEXT;
  v_try   INT := 0;
BEGIN
  SELECT UPPER(REGEXP_REPLACE(SPLIT_PART(COALESCE(full_name, 'PRO'), ' ', 1), '[^A-Za-z]', '', 'g'))
  INTO v_name
  FROM profiles WHERE user_id = p_user_id;

  v_base := SUBSTRING(COALESCE(NULLIF(v_name, ''), 'PRX') FROM 1 FOR 4);
  v_base := RPAD(v_base, 4, 'X');

  LOOP
    v_code := v_base || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code);
    v_try := v_try + 1;
    IF v_try > 15 THEN
      v_code := 'PRX' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
      EXIT;
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;

-- ─── get_or_create_referral_code ─────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  v_code := _generate_referral_code(p_user_id);
  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code)
  ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code
  RETURNING code INTO v_code;
  RETURN v_code;
END;
$$;

-- ─── apply_referral (008 final version with fraud detection) ──
CREATE OR REPLACE FUNCTION apply_referral(
  p_referred_id       UUID,
  p_code              TEXT,
  p_referred_ip_hash  TEXT  DEFAULT NULL,
  p_fingerprint       TEXT  DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id       UUID;
  v_referrer_ip_hash  TEXT;
  v_fraud_reason      TEXT := NULL;
  v_is_fraud          BOOLEAN := FALSE;
  v_same_ip_referrer  BOOLEAN := FALSE;
BEGIN
  SELECT user_id, last_ip_hash
  INTO v_referrer_id, v_referrer_ip_hash
  FROM referral_codes
  WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND THEN RETURN 'code_not_found'; END IF;

  IF v_referrer_id = p_referred_id THEN RETURN 'self_referral'; END IF;

  IF EXISTS (
    SELECT 1 FROM referrals
    WHERE referred_id = p_referred_id
      AND status NOT IN ('fraud')
  ) THEN
    RETURN 'already_referred';
  END IF;

  IF p_referred_ip_hash IS NOT NULL AND v_referrer_ip_hash IS NOT NULL THEN
    IF p_referred_ip_hash = v_referrer_ip_hash THEN
      v_is_fraud := TRUE;
      v_fraud_reason := 'same_ip_as_referrer';
    END IF;
  END IF;

  IF NOT v_is_fraud AND p_referred_ip_hash IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM user_ip_log
      WHERE user_id = v_referrer_id
        AND ip_hash = p_referred_ip_hash
        AND recorded_at > NOW() - INTERVAL '30 days'
    ) INTO v_same_ip_referrer;

    IF v_same_ip_referrer THEN
      v_is_fraud := TRUE;
      v_fraud_reason := 'referred_ip_matches_referrer_history';
    END IF;
  END IF;

  IF NOT v_is_fraud AND p_referred_ip_hash IS NOT NULL THEN
    IF (
      SELECT COUNT(DISTINCT user_id)
      FROM user_ip_log
      WHERE ip_hash = p_referred_ip_hash
        AND recorded_at > NOW() - INTERVAL '7 days'
    ) >= 3 THEN
      v_is_fraud := TRUE;
      v_fraud_reason := 'ip_shared_by_multiple_accounts';
    END IF;
  END IF;

  IF NOT v_is_fraud AND p_fingerprint IS NOT NULL AND p_fingerprint != '' THEN
    IF EXISTS (
      SELECT 1 FROM referrals r
      JOIN referral_codes rc ON rc.user_id = r.referrer_id
      WHERE r.device_fingerprint = p_fingerprint
        AND r.referrer_id = v_referrer_id
        AND r.status NOT IN ('fraud')
    ) THEN
      v_is_fraud := TRUE;
      v_fraud_reason := 'device_fingerprint_reused_by_referrer';
    END IF;
  END IF;

  INSERT INTO referrals (
    referrer_id, referred_id, code_used,
    referred_ip_hash, device_fingerprint,
    status, fraud_reason
  )
  VALUES (
    v_referrer_id, p_referred_id, UPPER(TRIM(p_code)),
    p_referred_ip_hash, p_fingerprint,
    CASE WHEN v_is_fraud THEN 'fraud' ELSE 'pending' END,
    v_fraud_reason
  );

  IF NOT v_is_fraud THEN
    UPDATE referral_codes SET clicks = clicks + 1
    WHERE code = UPPER(TRIM(p_code));
  END IF;

  IF v_is_fraud THEN
    RETURN 'fraud_detected';
  END IF;

  RETURN 'ok';
END;
$$;

-- ─── apply_referral_safe ─────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_referral_safe(
  p_referred_id       UUID,
  p_code              TEXT,
  p_referred_ip_hash  TEXT  DEFAULT NULL,
  p_fingerprint       TEXT  DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INT;
  v_result        TEXT;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM referral_attempt_log
  WHERE user_id = p_referred_id
    AND result NOT IN ('ok', 'already_referred')
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_attempt_count >= 10 THEN
    RETURN 'rate_limited';
  END IF;

  v_result := apply_referral(p_referred_id, p_code, p_referred_ip_hash, p_fingerprint);

  INSERT INTO referral_attempt_log (user_id, code_tried, result)
  VALUES (p_referred_id, UPPER(TRIM(p_code)), v_result);

  RETURN v_result;
END;
$$;

-- ─── record_user_ip ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_user_ip(
  p_user_id UUID,
  p_ip_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_ip_log (user_id, ip_hash)
  VALUES (p_user_id, p_ip_hash)
  ON CONFLICT DO NOTHING;

  UPDATE referral_codes SET last_ip_hash = p_ip_hash
  WHERE user_id = p_user_id;

  DELETE FROM user_ip_log
  WHERE user_id = p_user_id
    AND id NOT IN (
      SELECT id FROM user_ip_log
      WHERE user_id = p_user_id
      ORDER BY recorded_at DESC
      LIMIT 10
    );
END;
$$;

-- ─── process_referral_milestone ──────────────────────────────
CREATE OR REPLACE FUNCTION process_referral_milestone(p_referred_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref          RECORD;
  v_profile      RECORD;
  v_is_complete  BOOLEAN;
  v_is_active    BOOLEAN;
  v_active_count INT;
BEGIN
  SELECT * INTO v_ref FROM referrals WHERE referred_id = p_referred_id AND status != 'fraud';
  IF NOT FOUND THEN RETURN; END IF;

  SELECT p.full_name, p.phone, p.city, pp.description, pp.category_id,
         p.created_at AS signup_at
  INTO v_profile
  FROM profiles p
  LEFT JOIN professional_profiles pp ON pp.user_id = p.user_id
  WHERE p.user_id = p_referred_id;

  v_is_complete := (
    v_profile.full_name IS NOT NULL AND LENGTH(TRIM(v_profile.full_name)) > 2 AND
    v_profile.phone     IS NOT NULL AND LENGTH(TRIM(v_profile.phone))     > 5 AND
    v_profile.city      IS NOT NULL AND
    v_profile.description IS NOT NULL AND LENGTH(TRIM(v_profile.description)) > 10
  );

  IF v_is_complete AND v_ref.status = 'pending' THEN
    UPDATE referrals SET status = 'profile_complete', profile_completed_at = now()
    WHERE id = v_ref.id;

    INSERT INTO referral_rewards (user_id, referral_id, reward_type, months, tier, expires_at)
    VALUES (v_ref.referrer_id, v_ref.id, 'subscription_month', 1, 1, now() + INTERVAL '1 year')
    ON CONFLICT DO NOTHING;

    v_ref.status := 'profile_complete';
  END IF;

  v_is_active := (
    v_is_complete AND
    now() - v_profile.signup_at >= INTERVAL '7 days' AND
    (
      EXISTS (
        SELECT 1 FROM service_requests sr
        WHERE sr.professional_id = p_referred_id AND sr.status = 'completed'
      )
      OR
      EXISTS (
        SELECT 1 FROM reviews rv WHERE rv.professional_id = p_referred_id
      )
    )
  );

  IF v_is_active AND v_ref.status = 'profile_complete' THEN
    UPDATE referrals SET status = 'active', activated_at = now()
    WHERE id = v_ref.id;

    INSERT INTO referral_rewards (user_id, referral_id, reward_type, months, tier, expires_at)
    VALUES (v_ref.referrer_id, v_ref.id, 'subscription_month', 1, 2, now() + INTERVAL '1 year')
    ON CONFLICT DO NOTHING;

    INSERT INTO referral_rewards (user_id, referral_id, reward_type, boost_days, tier, expires_at)
    VALUES (v_ref.referrer_id, v_ref.id, 'visibility_boost', 30, 2, now() + INTERVAL '30 days')
    ON CONFLICT DO NOTHING;

    v_ref.status := 'active';
  END IF;

  IF v_ref.status = 'active' THEN
    SELECT COUNT(*) INTO v_active_count
    FROM referrals
    WHERE referrer_id = v_ref.referrer_id AND status IN ('active','rewarded');

    IF v_active_count IN (3, 10, 25) THEN
      INSERT INTO referral_rewards (user_id, referral_id, reward_type, boost_days, tier, expires_at)
      VALUES (
        v_ref.referrer_id, v_ref.id, 'ranking_boost',
        CASE v_active_count WHEN 3 THEN 60 WHEN 10 THEN 120 ELSE 365 END,
        3,
        now() + CASE v_active_count WHEN 3 THEN INTERVAL '60 days' WHEN 10 THEN INTERVAL '120 days' ELSE INTERVAL '365 days' END
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- ─── apply_pending_rewards ────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_pending_rewards(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_months INT;
  v_vis_boost    TIMESTAMPTZ;
  v_rank_boost   TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(SUM(months), 0) INTO v_total_months
  FROM referral_rewards
  WHERE user_id = p_user_id AND reward_type = 'subscription_month' AND status = 'pending';

  SELECT MAX(expires_at) INTO v_vis_boost
  FROM referral_rewards
  WHERE user_id = p_user_id AND reward_type = 'visibility_boost' AND status = 'pending';

  SELECT MAX(expires_at) INTO v_rank_boost
  FROM referral_rewards
  WHERE user_id = p_user_id AND reward_type = 'ranking_boost' AND status = 'pending';

  UPDATE professional_profiles SET
    subscription_bonus_months = subscription_bonus_months + v_total_months,
    visibility_boost_until = CASE
      WHEN v_vis_boost IS NULL THEN visibility_boost_until
      WHEN visibility_boost_until IS NULL OR visibility_boost_until < now() THEN v_vis_boost
      ELSE GREATEST(visibility_boost_until, v_vis_boost)
    END,
    ranking_boost_until = CASE
      WHEN v_rank_boost IS NULL THEN ranking_boost_until
      WHEN ranking_boost_until IS NULL OR ranking_boost_until < now() THEN v_rank_boost
      ELSE GREATEST(ranking_boost_until, v_rank_boost)
    END
  WHERE user_id = p_user_id;

  UPDATE referral_rewards
  SET status = 'applied', applied_at = now()
  WHERE user_id = p_user_id AND status = 'pending';
END;
$$;

-- ─── compute_trust_score ─────────────────────────────────────
CREATE OR REPLACE FUNCTION compute_trust_score(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_rating          NUMERIC := 0;
  v_review_count        INT     := 0;
  v_completed           INT     := 0;
  v_avg_response_min    NUMERIC := 120;
  v_acceptance_rate     NUMERIC := 0;
  v_last_active         TIMESTAMPTZ;

  v_rating_pts          NUMERIC := 0;
  v_completed_pts       NUMERIC := 0;
  v_response_pts        NUMERIC := 0;
  v_acceptance_pts      NUMERIC := 0;
  v_activity_pts        NUMERIC := 0;
  v_total_score         INT;
  v_level               verification_level;
  v_is_verified         BOOLEAN := FALSE;
  v_bayes_rating        NUMERIC := 0;
BEGIN
  SELECT
    COALESCE(pp.rating, 0),
    COALESCE(pp.review_count, 0),
    COALESCE(pp.verified, FALSE)
  INTO v_avg_rating, v_review_count, v_is_verified
  FROM professional_profiles pp
  WHERE pp.user_id = p_user_id;

  SELECT
    COALESCE(pm.avg_response_minutes, 120),
    COALESCE(pm.acceptance_rate, 0),
    COALESCE(pm.completed_count, 0),
    pm.last_active_at
  INTO v_avg_response_min, v_acceptance_rate, v_completed, v_last_active
  FROM professional_metrics pm
  WHERE pm.user_id = p_user_id;

  IF v_completed = 0 THEN
    SELECT COUNT(*) INTO v_completed
    FROM service_requests sr
    WHERE sr.professional_id = p_user_id AND sr.status = 'completed';
  END IF;

  v_bayes_rating := (v_avg_rating * v_review_count + 3.0 * 5) / (v_review_count + 5);
  v_rating_pts   := GREATEST(0, LEAST(35, ROUND(((v_bayes_rating - 1.0) / 4.0) * 35, 2)));
  v_completed_pts := ROUND(LEAST(v_completed::NUMERIC / 50.0, 1.0) * 25, 2);
  v_response_pts := ROUND(GREATEST(0, (1.0 - LEAST(v_avg_response_min / 60.0, 1.0))) * 20, 2);
  v_acceptance_pts := ROUND(v_acceptance_rate * 15, 2);
  v_activity_pts := CASE
    WHEN v_last_active IS NULL            THEN 0
    WHEN v_last_active > NOW() - INTERVAL '3 days'  THEN 5
    WHEN v_last_active > NOW() - INTERVAL '7 days'  THEN 4
    WHEN v_last_active > NOW() - INTERVAL '30 days' THEN 2
    ELSE 0
  END;

  v_total_score := LEAST(100, ROUND(v_rating_pts + v_completed_pts + v_response_pts + v_acceptance_pts + v_activity_pts));

  v_level := CASE
    WHEN v_total_score >= 85 AND v_review_count >= 10 AND v_acceptance_rate >= 0.80
      THEN 'top'::verification_level
    WHEN v_is_verified = TRUE
      THEN 'verified'::verification_level
    ELSE 'basic'::verification_level
  END;

  INSERT INTO trust_scores (
    user_id, score, level,
    rating_points, completed_points, response_points, acceptance_points, activity_points,
    computed_at, updated_at
  )
  VALUES (
    p_user_id, v_total_score, v_level,
    v_rating_pts, v_completed_pts, v_response_pts, v_acceptance_pts, v_activity_pts,
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    score             = EXCLUDED.score,
    level             = EXCLUDED.level,
    rating_points     = EXCLUDED.rating_points,
    completed_points  = EXCLUDED.completed_points,
    response_points   = EXCLUDED.response_points,
    acceptance_points = EXCLUDED.acceptance_points,
    activity_points   = EXCLUDED.activity_points,
    computed_at       = EXCLUDED.computed_at,
    updated_at        = EXCLUDED.updated_at;

  DELETE FROM professional_tags WHERE user_id = p_user_id;

  IF v_avg_response_min < 15 AND v_completed > 0 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'pontual') ON CONFLICT DO NOTHING;
  END IF;
  IF v_avg_response_min < 30 AND v_avg_response_min >= 15 AND v_completed > 0 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'rapido') ON CONFLICT DO NOTHING;
  END IF;
  IF v_acceptance_rate >= 0.85 AND v_completed >= 3 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'confiavel') ON CONFLICT DO NOTHING;
  END IF;
  IF v_completed >= 20 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'experiente') ON CONFLICT DO NOTHING;
  END IF;
  IF v_avg_rating >= 4.8 AND v_review_count >= 5 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'bem_avaliado') ON CONFLICT DO NOTHING;
  END IF;
  IF v_last_active IS NOT NULL AND v_last_active > NOW() - INTERVAL '7 days' THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'ativo') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_score >= 85 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'top_profissional') ON CONFLICT DO NOTHING;
  END IF;
  IF v_completed < 5 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'novo') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ─── _validate_service_status_transition ─────────────────────
CREATE OR REPLACE FUNCTION _validate_service_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NOT (
    (OLD.status = 'pending'   AND NEW.status IN ('accepted', 'cancelled')) OR
    (OLD.status = 'accepted'  AND NEW.status IN ('completed', 'cancelled')) OR
    (OLD.status = 'scheduled' AND NEW.status IN ('completed', 'cancelled', 'accepted'))
  ) THEN
    RAISE EXCEPTION 'Transição inválida: % → %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'completed' AND auth.uid() != NEW.professional_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Apenas o profissional pode marcar como concluído';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ─── _notify_on_service_change ───────────────────────────────
CREATE OR REPLACE FUNCTION _notify_on_service_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_name TEXT;
  v_pro_id   UUID;
BEGIN
  v_pro_id := NEW.professional_id;

  SELECT full_name INTO v_pro_name
  FROM profiles WHERE user_id = v_pro_id;

  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.client_id,
      'service_accepted',
      'Profissional encontrado!',
      COALESCE(v_pro_name, 'Um profissional') || ' aceitou seu pedido de serviço.',
      jsonb_build_object(
        'service_request_id', NEW.id,
        'professional_id',    v_pro_id,
        'professional_name',  v_pro_name
      )
    );
  END IF;

  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.client_id,
      'review_available',
      'Serviço concluído — avalie!',
      'Como foi o serviço de ' || COALESCE(v_pro_name, 'seu profissional') || '? Deixe uma avaliação.',
      jsonb_build_object(
        'service_request_id', NEW.id,
        'professional_id',    v_pro_id,
        'professional_name',  v_pro_name
      )
    );

    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_pro_id,
      'service_completed',
      'Serviço marcado como concluído',
      'Ótimo trabalho! O cliente poderá te avaliar em breve.',
      jsonb_build_object('service_request_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ─── _trigger_recompute_trust ────────────────────────────────
CREATE OR REPLACE FUNCTION _trigger_recompute_trust()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'reviews' THEN
    PERFORM compute_trust_score(NEW.professional_id);
  ELSIF TG_TABLE_NAME = 'service_requests' THEN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
      PERFORM compute_trust_score(NEW.professional_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'professional_metrics' THEN
    PERFORM compute_trust_score(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ─── validate_review_interaction ─────────────────────────────
CREATE OR REPLACE FUNCTION validate_review_interaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sr_status TEXT;
  v_sr_client UUID;
BEGIN
  IF NEW.service_request_id IS NOT NULL THEN
    SELECT status, client_id
    INTO v_sr_status, v_sr_client
    FROM service_requests
    WHERE id = NEW.service_request_id;

    IF v_sr_status != 'completed' THEN
      RAISE EXCEPTION 'Rating only allowed after service completion';
    END IF;

    IF v_sr_client != NEW.client_id THEN
      RAISE EXCEPTION 'Only the service client can submit a review';
    END IF;
  END IF;

  NEW.rating := GREATEST(1, LEAST(5, NEW.rating));
  RETURN NEW;
END;
$$;

-- ─── _sanitize_review_comment ────────────────────────────────
CREATE OR REPLACE FUNCTION _sanitize_review_comment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.comment IS NOT NULL THEN
    NEW.comment := regexp_replace(NEW.comment, '<[^>]+>', '', 'g');
    NEW.comment := regexp_replace(NEW.comment, '\s+', ' ', 'g');
    NEW.comment := TRIM(NEW.comment);
    IF LENGTH(NEW.comment) > 500 THEN
      NEW.comment := LEFT(NEW.comment, 500);
    END IF;
    IF NEW.comment = '' THEN
      NEW.comment := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── _trigger_create_referral_code ───────────────────────────
CREATE OR REPLACE FUNCTION _trigger_create_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM get_or_create_referral_code(NEW.user_id);
  RETURN NEW;
END;
$$;

-- ─── _trigger_check_referral_on_profile_update ───────────────
CREATE OR REPLACE FUNCTION _trigger_check_referral_on_profile_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM process_referral_milestone(NEW.user_id);
  RETURN NEW;
END;
$$;

-- ─── _trigger_check_referral_on_service ──────────────────────
CREATE OR REPLACE FUNCTION _trigger_check_referral_on_service()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM process_referral_milestone(NEW.professional_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ─── _validate_slot_on_register ──────────────────────────────
CREATE OR REPLACE FUNCTION _validate_slot_on_register()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available BOOLEAN;
BEGIN
  SELECT check_slot_available(NEW.category_id, (
    SELECT city FROM profiles WHERE user_id = NEW.user_id
  )) INTO v_available;

  IF v_available IS NULL OR v_available = TRUE THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'SLOTS_FULL: No available slots for category % in this city', NEW.category_id
    USING ERRCODE = 'P0001';
END;
$$;

-- ============================================================
-- 6. VIEWS
-- ============================================================

-- ─── referral_stats ──────────────────────────────────────────
CREATE OR REPLACE VIEW referral_stats AS
SELECT
  rc.user_id,
  rc.code,
  rc.clicks,
  COUNT(r.id)                                                               AS total_referrals,
  COUNT(r.id) FILTER (WHERE r.status = 'pending')                          AS pending_count,
  COUNT(r.id) FILTER (WHERE r.status = 'profile_complete')                 AS profile_complete_count,
  COUNT(r.id) FILTER (WHERE r.status IN ('active','rewarded'))             AS active_count,
  COUNT(r.id) FILTER (WHERE r.status = 'fraud')                            AS fraud_count,
  COALESCE(SUM(rr.months)     FILTER (WHERE rr.reward_type = 'subscription_month'), 0) AS months_earned,
  COALESCE(SUM(rr.boost_days) FILTER (WHERE rr.reward_type = 'visibility_boost'),    0) AS visibility_days_earned,
  COALESCE(SUM(rr.boost_days) FILTER (WHERE rr.reward_type = 'ranking_boost'),       0) AS ranking_days_earned
FROM referral_codes rc
LEFT JOIN referrals r         ON r.code_used = rc.code
LEFT JOIN referral_rewards rr ON rr.user_id = rc.user_id AND rr.referral_id = r.id
GROUP BY rc.user_id, rc.code, rc.clicks;

-- ─── referral_leaderboard ────────────────────────────────────
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT
  rc.user_id,
  p.full_name,
  p.city,
  pp.category_name,
  pp.verified,
  COUNT(r.id) FILTER (WHERE r.status IN ('active','rewarded'))  AS active_referrals,
  COUNT(r.id)                                                    AS total_referrals,
  COALESCE(SUM(rr.months) FILTER (WHERE rr.reward_type = 'subscription_month'), 0) AS months_earned,
  RANK() OVER (ORDER BY COUNT(r.id) FILTER (WHERE r.status IN ('active','rewarded')) DESC) AS position
FROM referral_codes rc
JOIN profiles p               ON p.user_id = rc.user_id
LEFT JOIN professional_profiles pp ON pp.user_id = rc.user_id
LEFT JOIN referrals r         ON r.code_used = rc.code
LEFT JOIN referral_rewards rr ON rr.user_id = rc.user_id AND rr.referral_id = r.id
GROUP BY rc.user_id, p.full_name, p.city, pp.category_name, pp.verified
HAVING COUNT(r.id) > 0
ORDER BY active_referrals DESC;

-- ─── professional_reputation ─────────────────────────────────
CREATE OR REPLACE VIEW professional_reputation AS
SELECT
  pp.user_id,
  pp.id                             AS professional_id,
  pp.category_id,
  pp.category_name,
  pr.full_name                      AS name,
  pr.city,
  pr.state,
  pr.avatar_url,
  pp.verified,
  pp.premium,
  pp.experience,
  COALESCE(ts.score, 0)             AS trust_score,
  COALESCE(ts.level, 'basic')       AS verification_level,
  ts.computed_at                    AS trust_computed_at,
  COALESCE(pp.rating, 0)            AS avg_rating,
  COALESCE(pp.review_count, 0)      AS review_count,
  COALESCE(pm.completed_count, 0)   AS completed_count,
  COALESCE(pm.avg_response_minutes, NULL) AS avg_response_minutes,
  COALESCE(pm.acceptance_rate, NULL) AS acceptance_rate,
  pm.last_active_at,
  CASE
    WHEN pm.last_active_at > NOW() - INTERVAL '1 hour'   THEN 'online'
    WHEN pm.last_active_at > NOW() - INTERVAL '24 hours' THEN 'hoje'
    WHEN pm.last_active_at > NOW() - INTERVAL '7 days'   THEN 'esta_semana'
    ELSE 'inativo'
  END                               AS activity_status,
  CASE
    WHEN pm.avg_response_minutes IS NULL          THEN NULL
    WHEN pm.avg_response_minutes < 60             THEN ROUND(pm.avg_response_minutes)::TEXT || ' min'
    WHEN pm.avg_response_minutes < 1440           THEN ROUND(pm.avg_response_minutes / 60)::TEXT || 'h'
    ELSE ROUND(pm.avg_response_minutes / 1440)::TEXT || 'd'
  END                               AS response_time_display,
  CASE
    WHEN pm.acceptance_rate IS NULL THEN NULL
    ELSE ROUND(pm.acceptance_rate * 100)
  END                               AS response_rate_pct,
  COALESCE(
    (SELECT json_agg(json_build_object(
        'tag',      pt.tag,
        'label_pt', td.label_pt,
        'icon',     td.icon
      ) ORDER BY td.tag)
     FROM professional_tags pt
     JOIN reputation_tag_definitions td ON td.tag = pt.tag
     WHERE pt.user_id = pp.user_id
       AND td.positive = TRUE
    ),
    '[]'::JSON
  )                                 AS tags
FROM professional_profiles pp
LEFT JOIN profiles           pr ON pr.user_id = pp.user_id
LEFT JOIN trust_scores       ts ON ts.user_id = pp.user_id
LEFT JOIN professional_metrics pm ON pm.user_id = pp.user_id;

-- ============================================================
-- 7. TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS supply_limits_updated_at ON supply_limits;
CREATE TRIGGER supply_limits_updated_at
  BEFORE UPDATE ON supply_limits
  FOR EACH ROW EXECUTE FUNCTION _supply_limits_set_updated_at();

DROP TRIGGER IF EXISTS auto_dispatch_broadcast ON broadcast_requests;
CREATE TRIGGER auto_dispatch_broadcast
  AFTER INSERT ON broadcast_requests
  FOR EACH ROW EXECUTE FUNCTION _trigger_dispatch_on_broadcast();

DROP TRIGGER IF EXISTS broadcast_requests_updated_at ON broadcast_requests;
CREATE TRIGGER broadcast_requests_updated_at
  BEFORE UPDATE ON broadcast_requests
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at_matching();

DROP TRIGGER IF EXISTS matching_config_updated_at ON matching_config;
CREATE TRIGGER matching_config_updated_at
  BEFORE UPDATE ON matching_config
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at_matching();

DROP TRIGGER IF EXISTS auto_create_referral_code ON professional_profiles;
CREATE TRIGGER auto_create_referral_code
  AFTER INSERT ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION _trigger_create_referral_code();

DROP TRIGGER IF EXISTS referral_profile_update ON professional_profiles;
CREATE TRIGGER referral_profile_update
  AFTER UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION _trigger_check_referral_on_profile_update();

DROP TRIGGER IF EXISTS referral_service_completed ON service_requests;
CREATE TRIGGER referral_service_completed
  AFTER UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION _trigger_check_referral_on_service();

DROP TRIGGER IF EXISTS trg_trust_on_review ON reviews;
CREATE TRIGGER trg_trust_on_review
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION _trigger_recompute_trust();

DROP TRIGGER IF EXISTS trg_trust_on_service ON service_requests;
CREATE TRIGGER trg_trust_on_service
  AFTER UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION _trigger_recompute_trust();

DROP TRIGGER IF EXISTS trg_trust_on_metrics ON professional_metrics;
CREATE TRIGGER trg_trust_on_metrics
  AFTER INSERT OR UPDATE ON professional_metrics
  FOR EACH ROW EXECUTE FUNCTION _trigger_recompute_trust();

DROP TRIGGER IF EXISTS trg_validate_review ON reviews;
CREATE TRIGGER trg_validate_review
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION validate_review_interaction();

DROP TRIGGER IF EXISTS trg_sanitize_review_comment ON reviews;
CREATE TRIGGER trg_sanitize_review_comment
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION _sanitize_review_comment();

DROP TRIGGER IF EXISTS trg_service_status_guard ON service_requests;
CREATE TRIGGER trg_service_status_guard
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION _validate_service_status_transition();

DROP TRIGGER IF EXISTS trg_notify_service_change ON service_requests;
CREATE TRIGGER trg_notify_service_change
  AFTER UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION _notify_on_service_change();

DROP TRIGGER IF EXISTS trg_validate_slot_on_register ON professional_profiles;
CREATE TRIGGER trg_validate_slot_on_register
  BEFORE INSERT ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION _validate_slot_on_register();

-- ============================================================
-- 8. ROW LEVEL SECURITY — Enable + Policies
-- ============================================================

ALTER TABLE supply_limits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list            ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_metrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_dispatches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ip_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attempt_log    ENABLE ROW LEVEL SECURITY;

-- ── supply_limits ─────────────────────────────────────────────
DROP POLICY IF EXISTS "supply_limits_select"    ON supply_limits;
DROP POLICY IF EXISTS "supply_limits_admin_all" ON supply_limits;
CREATE POLICY "supply_limits_select"    ON supply_limits FOR SELECT USING (true);
CREATE POLICY "supply_limits_admin_all" ON supply_limits FOR ALL
  USING      (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- ── waiting_list ──────────────────────────────────────────────
DROP POLICY IF EXISTS "waiting_list_insert"       ON waiting_list;
DROP POLICY IF EXISTS "waiting_list_admin_select" ON waiting_list;
DROP POLICY IF EXISTS "waiting_list_admin_update" ON waiting_list;
CREATE POLICY "waiting_list_insert"       ON waiting_list FOR INSERT WITH CHECK (true);
CREATE POLICY "waiting_list_admin_select" ON waiting_list FOR SELECT
  USING (has_role('admin'::app_role, auth.uid()));
CREATE POLICY "waiting_list_admin_update" ON waiting_list FOR UPDATE
  USING      (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- ── matching_config ───────────────────────────────────────────
DROP POLICY IF EXISTS "matching_config_read"  ON matching_config;
DROP POLICY IF EXISTS "matching_config_admin" ON matching_config;
CREATE POLICY "matching_config_read"  ON matching_config FOR SELECT USING (true);
CREATE POLICY "matching_config_admin" ON matching_config FOR ALL
  USING      (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- ── professional_metrics ──────────────────────────────────────
DROP POLICY IF EXISTS "metrics_own_update"  ON professional_metrics;
DROP POLICY IF EXISTS "metrics_own_read"    ON professional_metrics;
DROP POLICY IF EXISTS "metrics_admin_read"  ON professional_metrics;
CREATE POLICY "metrics_own_update" ON professional_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "metrics_own_read"   ON professional_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "metrics_admin_read" ON professional_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ── broadcast_requests ────────────────────────────────────────
DROP POLICY IF EXISTS "broadcast_client_own"                ON broadcast_requests;
DROP POLICY IF EXISTS "broadcast_client_insert"             ON broadcast_requests;
DROP POLICY IF EXISTS "broadcast_client_insert_ratelimited" ON broadcast_requests;
DROP POLICY IF EXISTS "broadcast_client_cancel"             ON broadcast_requests;
DROP POLICY IF EXISTS "broadcast_admin_all"                 ON broadcast_requests;
CREATE POLICY "broadcast_client_own"    ON broadcast_requests FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "broadcast_client_insert_ratelimited" ON broadcast_requests FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND (
      SELECT COUNT(*) FROM broadcast_requests
      WHERE client_id = auth.uid()
        AND created_at > NOW() - INTERVAL '1 hour'
        AND status NOT IN ('cancelled')
    ) < 5
  );
CREATE POLICY "broadcast_client_cancel" ON broadcast_requests FOR UPDATE
  USING (auth.uid() = client_id AND status IN ('dispatching', 'expanding'))
  WITH CHECK (status = 'cancelled');
CREATE POLICY "broadcast_admin_all" ON broadcast_requests FOR ALL
  USING (has_role('admin'::app_role, auth.uid()));

-- ── request_dispatches ────────────────────────────────────────
DROP POLICY IF EXISTS "dispatch_pro_see_own"  ON request_dispatches;
DROP POLICY IF EXISTS "dispatch_client_see"   ON request_dispatches;
DROP POLICY IF EXISTS "dispatch_admin_all"    ON request_dispatches;
CREATE POLICY "dispatch_pro_see_own" ON request_dispatches FOR SELECT
  USING (auth.uid() = professional_id);
CREATE POLICY "dispatch_client_see"  ON request_dispatches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM broadcast_requests br
      WHERE br.id = request_dispatches.broadcast_id AND br.client_id = auth.uid()
    )
  );
CREATE POLICY "dispatch_admin_all"   ON request_dispatches FOR ALL
  USING (has_role('admin'::app_role, auth.uid()));

-- ── referral_codes ────────────────────────────────────────────
DROP POLICY IF EXISTS "rc_own"    ON referral_codes;
DROP POLICY IF EXISTS "rc_public" ON referral_codes;
DROP POLICY IF EXISTS "rc_insert" ON referral_codes;
DROP POLICY IF EXISTS "rc_admin"  ON referral_codes;
CREATE POLICY "rc_own"    ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rc_public" ON referral_codes FOR SELECT USING (true);
CREATE POLICY "rc_insert" ON referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rc_admin"  ON referral_codes FOR ALL
  USING (has_role('admin'::app_role, auth.uid()));

-- ── referrals ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "ref_referrer" ON referrals;
DROP POLICY IF EXISTS "ref_referred" ON referrals;
DROP POLICY IF EXISTS "ref_insert"   ON referrals;
DROP POLICY IF EXISTS "ref_admin"    ON referrals;
CREATE POLICY "ref_referrer" ON referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "ref_referred" ON referrals FOR SELECT USING (auth.uid() = referred_id);
CREATE POLICY "ref_insert"   ON referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "ref_admin"    ON referrals FOR ALL
  USING (has_role('admin'::app_role, auth.uid()));

-- ── referral_rewards ──────────────────────────────────────────
DROP POLICY IF EXISTS "rr_own"   ON referral_rewards;
DROP POLICY IF EXISTS "rr_admin" ON referral_rewards;
CREATE POLICY "rr_own"   ON referral_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rr_admin" ON referral_rewards FOR ALL
  USING (has_role('admin'::app_role, auth.uid()));

-- ── trust_scores ──────────────────────────────────────────────
DROP POLICY IF EXISTS "public read trust_scores"  ON trust_scores;
DROP POLICY IF EXISTS "system write trust_scores" ON trust_scores;
CREATE POLICY "public read trust_scores"  ON trust_scores FOR SELECT USING (TRUE);
CREATE POLICY "system write trust_scores" ON trust_scores FOR ALL USING (auth.uid() = user_id);

-- ── professional_tags ─────────────────────────────────────────
DROP POLICY IF EXISTS "public read professional_tags" ON professional_tags;
CREATE POLICY "public read professional_tags" ON professional_tags FOR SELECT USING (TRUE);

-- ── reputation_tag_definitions ────────────────────────────────
DROP POLICY IF EXISTS "public read tag_definitions" ON reputation_tag_definitions;
CREATE POLICY "public read tag_definitions" ON reputation_tag_definitions FOR SELECT USING (TRUE);

-- ── notifications ─────────────────────────────────────────────
DROP POLICY IF EXISTS "users read own notifications"       ON notifications;
DROP POLICY IF EXISTS "users mark own notifications read"  ON notifications;
DROP POLICY IF EXISTS "system inserts notifications"       ON notifications;
CREATE POLICY "users read own notifications"      ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "users mark own notifications read" ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "system inserts notifications"      ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- ── user_ip_log ───────────────────────────────────────────────
DROP POLICY IF EXISTS "system_insert_ip_log"    ON user_ip_log;
DROP POLICY IF EXISTS "users_read_own_ip_log"   ON user_ip_log;
CREATE POLICY "system_insert_ip_log"  ON user_ip_log FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "users_read_own_ip_log" ON user_ip_log FOR SELECT USING (auth.uid() = user_id);

-- ── referral_attempt_log ──────────────────────────────────────
DROP POLICY IF EXISTS "system_insert_attempt_log" ON referral_attempt_log;
DROP POLICY IF EXISTS "users_read_own_attempts"   ON referral_attempt_log;
CREATE POLICY "system_insert_attempt_log" ON referral_attempt_log FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "users_read_own_attempts"   ON referral_attempt_log FOR SELECT
  USING (auth.uid() = user_id);

-- ── profiles — additional policies from 009 ──────────────────
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read"             ON profiles;
DROP POLICY IF EXISTS "profiles_own_read"                ON profiles;
DROP POLICY IF EXISTS "profiles_professionals_public"    ON profiles;
DROP POLICY IF EXISTS "profiles_admin_read"              ON profiles;
CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_professionals_public" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM professional_profiles pp WHERE pp.user_id = profiles.user_id)
  );
CREATE POLICY "profiles_admin_read" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ── reviews — additional policies from 006 ───────────────────
DROP POLICY IF EXISTS "public read positive reviews" ON reviews;
DROP POLICY IF EXISTS "client inserts review"        ON reviews;
CREATE POLICY "public read positive reviews" ON reviews FOR SELECT
  USING (
    rating >= 3
    OR professional_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "client inserts review" ON reviews FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- ============================================================
-- 9. GRANTS
-- ============================================================

GRANT SELECT ON slot_occupancy         TO authenticated, anon;
GRANT SELECT ON referral_stats         TO authenticated;
GRANT SELECT ON referral_leaderboard   TO authenticated, anon;

GRANT EXECUTE ON FUNCTION check_slot_available          TO authenticated;
GRANT EXECUTE ON FUNCTION _score_professional           TO authenticated;
GRANT EXECUTE ON FUNCTION dispatch_broadcast_request    TO authenticated;
GRANT EXECUTE ON FUNCTION handle_dispatch_response      TO authenticated;
GRANT EXECUTE ON FUNCTION expire_pending_dispatches     TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_referral_code   TO authenticated;
GRANT EXECUTE ON FUNCTION apply_referral                TO authenticated;
GRANT EXECUTE ON FUNCTION apply_referral_safe           TO authenticated;
GRANT EXECUTE ON FUNCTION apply_pending_rewards         TO authenticated;
GRANT EXECUTE ON FUNCTION record_user_ip                TO authenticated;

-- ============================================================
-- 10. FK CONSTRAINT (007)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_professional_profiles_category'
      AND table_name = 'professional_profiles'
  ) THEN
    ALTER TABLE professional_profiles
      ADD CONSTRAINT fk_professional_profiles_category
      FOREIGN KEY (category_id) REFERENCES categories(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- ============================================================
-- 11. SEED DATA
-- ============================================================

-- matching_config singleton
INSERT INTO matching_config (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- reputation tag definitions
INSERT INTO reputation_tag_definitions (tag, label_pt, icon, description, positive) VALUES
  ('pontual',         'Pontual',           'Clock',       'Responde em menos de 15 minutos',     TRUE),
  ('rapido',          'Resposta Rápida',   'Zap',         'Responde em menos de 30 minutos',     TRUE),
  ('confiavel',       'Confiável',         'ShieldCheck', 'Taxa de aceitação acima de 85%',      TRUE),
  ('experiente',      'Experiente',        'Award',       'Mais de 20 serviços concluídos',      TRUE),
  ('bem_avaliado',    'Bem Avaliado',      'ThumbsUp',    'Nota média acima de 4.8',             TRUE),
  ('ativo',           'Ativo Agora',       'Activity',    'Esteve ativo nos últimos 7 dias',     TRUE),
  ('top_profissional','Top Profissional',  'Crown',       'Trust Score acima de 85',             TRUE),
  ('novo',            'Novo na Plataforma','Sparkles',    'Menos de 5 serviços concluídos',      TRUE)
ON CONFLICT (tag) DO NOTHING;

-- professional_metrics for existing professionals
INSERT INTO professional_metrics (user_id)
SELECT pp.user_id FROM professional_profiles pp
ON CONFLICT (user_id) DO NOTHING;

-- supply_limits: 10 slots per category per city
INSERT INTO supply_limits (category_id, city, max_professionals)
SELECT c.id, city.name, 10
FROM categories c
CROSS JOIN (VALUES
  ('Porto Alegre'),
  ('Gravataí'),
  ('Canoas'),
  ('Cachoeirinha'),
  ('Viamão'),
  ('Alvorada')
) AS city(name)
ON CONFLICT (category_id, city) DO NOTHING;


-- referral codes for existing professionals
INSERT INTO referral_codes (user_id, code)
SELECT pp.user_id, _generate_referral_code(pp.user_id)
FROM professional_profiles pp
ON CONFLICT (user_id) DO NOTHING;

-- backfill trust scores for existing professionals
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM professional_profiles LOOP
    PERFORM compute_trust_score(r.user_id);
  END LOOP;
END $$;
