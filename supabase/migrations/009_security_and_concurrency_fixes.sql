-- ============================================================
-- Migration 009: Security & Concurrency Fixes
-- Fixes:
--   1. Race condition in dispatch_broadcast_request (FOR UPDATE)
--   2. Race condition in expire_pending_dispatches (FOR UPDATE)
--   3. RLS gap: profiles public read → restrict to own + professionals
--   4. RLS gap: professional_metrics visible to all → own only
--   5. Server-side slot validation trigger
-- ============================================================

-- ─── 1. Fix dispatch_broadcast_request: lock metrics rows before increment ───

CREATE OR REPLACE FUNCTION dispatch_broadcast_request(p_broadcast_id UUID)
RETURNS TABLE (professional_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
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
  -- Lock the broadcast row to prevent concurrent dispatches
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

  -- Professionals already dispatched for this broadcast
  SELECT ARRAY_AGG(rd.professional_id)
  INTO v_excluded
  FROM request_dispatches rd
  WHERE rd.broadcast_id = p_broadcast_id;

  -- Score and select top candidates
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

  -- Insert dispatches
  INSERT INTO request_dispatches (broadcast_id, professional_id, status, score, dispatched_at, expires_at)
  SELECT
    p_broadcast_id,
    u,
    'pending',
    _score_professional(u, v_category_id, v_city),
    now(),
    now() + v_window
  FROM UNNEST(v_selected) AS u;

  -- Lock metric rows BEFORE incrementing to prevent race conditions
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

-- ─── 2. Fix expire_pending_dispatches: lock broadcast rows in loop ───────────

CREATE OR REPLACE FUNCTION expire_pending_dispatches()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_broadcast RECORD;
BEGIN
  -- Expire individual pending dispatches past their window
  UPDATE request_dispatches
  SET status = 'expired', responded_at = now()
  WHERE status = 'pending' AND expires_at < now();

  -- For broadcasts with no pending and no accepted dispatch, expand or expire
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
    FOR UPDATE  -- prevent concurrent cron jobs from double-dispatching
  LOOP
    UPDATE broadcast_requests
    SET status = 'expanding', current_round = current_round + 1, updated_at = now()
    WHERE id = v_broadcast.id;

    PERFORM dispatch_broadcast_request(v_broadcast.id);
  END LOOP;
END;
$$;

-- ─── 3. Fix profiles RLS: restrict public read ────────────────────────────────

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;

-- Own profile always readable
CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Professional profiles are public (needed for search/listing)
CREATE POLICY "profiles_professionals_public" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professional_profiles pp
      WHERE pp.user_id = profiles.user_id
    )
  );

-- Admins can read all
CREATE POLICY "profiles_admin_read" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 4. Fix professional_metrics RLS: restrict to own ────────────────────────

DROP POLICY IF EXISTS "metrics_read" ON professional_metrics;

-- Own metrics
CREATE POLICY "metrics_own_read" ON professional_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "metrics_admin_read" ON professional_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 5. Server-side slot validation trigger ───────────────────────────────────

CREATE OR REPLACE FUNCTION _validate_slot_on_register()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_available BOOLEAN;
BEGIN
  SELECT check_slot_available(NEW.category_id, (
    SELECT city FROM profiles WHERE user_id = NEW.user_id
  )) INTO v_available;

  -- If no supply_limits row exists, allow registration (no cap configured)
  IF v_available IS NULL OR v_available = TRUE THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'SLOTS_FULL: No available slots for category % in this city', NEW.category_id
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_slot_on_register ON professional_profiles;
CREATE TRIGGER trg_validate_slot_on_register
  BEFORE INSERT ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION _validate_slot_on_register();

-- ─── Grants ───────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION dispatch_broadcast_request TO authenticated;
GRANT EXECUTE ON FUNCTION expire_pending_dispatches   TO authenticated;
