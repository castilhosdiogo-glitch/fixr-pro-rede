-- ============================================================
-- 007_completion_and_fixes.sql
-- 1. Service completion flow
-- 2. Client notifications table
-- 3. Fix matching engine bugs (race condition, Welford, acceptance rate)
-- 4. FK on professional_profiles.category_id
-- 5. Comment sanitization trigger
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. SERVICE STATUS TRANSITION GUARD
-- Only valid transitions allowed; prevents fake completions
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _validate_service_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Allow same status (no-op)
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Valid transitions
  IF NOT (
    (OLD.status = 'pending'   AND NEW.status IN ('accepted', 'cancelled')) OR
    (OLD.status = 'accepted'  AND NEW.status IN ('completed', 'cancelled')) OR
    (OLD.status = 'scheduled' AND NEW.status IN ('completed', 'cancelled', 'accepted'))
  ) THEN
    RAISE EXCEPTION 'Transição inválida: % → %', OLD.status, NEW.status;
  END IF;

  -- Only the professional can mark as completed
  IF NEW.status = 'completed' AND auth.uid() != NEW.professional_id THEN
    -- Also allow admin
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

DROP TRIGGER IF EXISTS trg_service_status_guard ON service_requests;
CREATE TRIGGER trg_service_status_guard
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION _validate_service_status_transition();

-- ────────────────────────────────────────────────────────────
-- 2. IN-APP NOTIFICATIONS TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,         -- 'service_accepted' | 'service_completed' | 'review_available' | 'review_received'
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  data         JSONB DEFAULT '{}',    -- arbitrary payload (service_request_id, professional_id, etc.)
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users mark own notifications read"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System inserts via SECURITY DEFINER functions below
CREATE POLICY "system inserts notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- ────────────────────────────────────────────────────────────
-- 3. TRIGGER: notify client when professional accepts dispatch
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _notify_on_service_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pro_name   TEXT;
  v_pro_id     UUID;
BEGIN
  v_pro_id := NEW.professional_id;

  -- Get professional name
  SELECT full_name INTO v_pro_name
  FROM profiles WHERE user_id = v_pro_id;

  -- Service accepted → notify client
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

  -- Service completed → notify client to leave review
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

    -- Also notify professional that they were rated (placeholder — fires after review)
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

DROP TRIGGER IF EXISTS trg_notify_service_change ON service_requests;
CREATE TRIGGER trg_notify_service_change
  AFTER UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION _notify_on_service_change();

-- ────────────────────────────────────────────────────────────
-- 4. FIX MATCHING ENGINE BUGS
-- ────────────────────────────────────────────────────────────

-- 4a. Fix handle_dispatch_response():
--     - Use SELECT ... FOR UPDATE to prevent concurrent_active race condition
--     - Fix Welford denominator (read old total BEFORE increment)
--     - Fix acceptance_rate denominator (use accepted+declined, not total_dispatched)

CREATE OR REPLACE FUNCTION handle_dispatch_response(
  p_dispatch_id UUID,
  p_response    TEXT  -- 'accepted' | 'declined'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dispatch        RECORD;
  v_broadcast       RECORD;
  v_config          RECORD;
  v_resp_minutes    NUMERIC;
  v_old_total_accepted  INT;
  v_old_total_declined  INT;
  v_old_total_dispatched INT;
  v_old_avg_response    NUMERIC;
  v_new_avg_response    NUMERIC;
  v_new_acceptance_rate NUMERIC;
BEGIN
  -- Lock dispatch row for update
  SELECT * INTO v_dispatch
  FROM request_dispatches
  WHERE id = p_dispatch_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispatch not found or already responded';
  END IF;

  -- Lock broadcast row
  SELECT * INTO v_broadcast
  FROM broadcast_requests
  WHERE id = v_dispatch.broadcast_id
  FOR UPDATE;

  SELECT * INTO v_config FROM matching_config WHERE id = 'default';

  -- Calculate response time in minutes
  v_resp_minutes := EXTRACT(EPOCH FROM (NOW() - v_dispatch.dispatched_at)) / 60.0;

  -- ── Lock and read professional_metrics BEFORE any update ──
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
  FOR UPDATE;  -- ← Prevents race condition on concurrent_active and counters

  -- ── Update dispatch status ──
  UPDATE request_dispatches SET
    status       = p_response,
    responded_at = NOW()
  WHERE id = p_dispatch_id;

  IF p_response = 'accepted' THEN
    -- Cancel all other pending dispatches for this broadcast
    UPDATE request_dispatches SET
      status = 'cancelled'
    WHERE broadcast_id = v_dispatch.broadcast_id
      AND id != p_dispatch_id
      AND status = 'pending';

    -- Mark broadcast as accepted
    UPDATE broadcast_requests SET
      status                    = 'accepted',
      accepted_professional_id  = v_dispatch.professional_id
    WHERE id = v_dispatch.broadcast_id;

    -- Create the service_request
    INSERT INTO service_requests (client_id, professional_id, description, status)
    SELECT
      b.client_id,
      v_dispatch.professional_id,
      b.description,
      'accepted'
    FROM broadcast_requests b
    WHERE b.id = v_dispatch.broadcast_id;

  ELSE
    -- Declined: check if all dispatches for this round are done
    -- (expansion logic handled by expire_pending_dispatches)
    IF NOT EXISTS (
      SELECT 1 FROM request_dispatches
      WHERE broadcast_id = v_dispatch.broadcast_id
        AND round = v_dispatch.round
        AND status = 'pending'
    ) THEN
      -- All declined in this round — trigger expansion
      UPDATE broadcast_requests SET status = 'expanding'
      WHERE id = v_dispatch.broadcast_id AND status = 'dispatching';
    END IF;
  END IF;

  -- ── Update professional_metrics (safe: row is locked FOR UPDATE) ──

  -- Fix Welford: use v_old_total_dispatched (before increment) as denominator
  IF p_response = 'accepted' AND v_old_total_dispatched IS NOT NULL THEN
    v_new_avg_response := CASE
      WHEN v_old_total_dispatched = 0 THEN v_resp_minutes
      ELSE (v_old_avg_response * v_old_total_dispatched + v_resp_minutes)
           / (v_old_total_dispatched + 1)
    END;
  ELSE
    v_new_avg_response := v_old_avg_response;
  END IF;

  -- Fix acceptance_rate: divide by (accepted + declined), not total_dispatched
  DECLARE
    v_new_accepted  INT := v_old_total_accepted + (p_response = 'accepted')::INT;
    v_new_declined  INT := v_old_total_declined + (p_response = 'declined')::INT;
  BEGIN
    v_new_acceptance_rate := v_new_accepted::NUMERIC
                             / NULLIF(v_new_accepted + v_new_declined, 0);
  END;

  UPDATE professional_metrics SET
    total_dispatched    = COALESCE(v_old_total_dispatched, 0) + 1,
    total_accepted      = COALESCE(v_old_total_accepted, 0)  + (p_response = 'accepted')::INT,
    total_declined      = COALESCE(v_old_total_declined, 0)  + (p_response = 'declined')::INT,
    avg_response_minutes = COALESCE(v_new_avg_response, avg_response_minutes),
    acceptance_rate     = COALESCE(v_new_acceptance_rate, acceptance_rate),
    -- Fix concurrent_active: only modify when row is locked (no race condition)
    concurrent_active   = CASE
                            WHEN p_response = 'accepted'
                            THEN COALESCE(concurrent_active, 0) + 1
                            ELSE concurrent_active
                          END,
    last_dispatched_at  = NOW(),
    updated_at          = NOW()
  WHERE user_id = v_dispatch.professional_id;

END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. FK: professional_profiles.category_id → categories(id)
-- ────────────────────────────────────────────────────────────

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
      ON DELETE RESTRICT;  -- Prevent deleting category that has professionals
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 6. COMMENT SANITIZATION TRIGGER
-- Strips HTML tags server-side before storing reviews
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _sanitize_review_comment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.comment IS NOT NULL THEN
    -- Strip HTML tags
    NEW.comment := regexp_replace(NEW.comment, '<[^>]+>', '', 'g');
    -- Collapse whitespace
    NEW.comment := regexp_replace(NEW.comment, '\s+', ' ', 'g');
    -- Trim
    NEW.comment := TRIM(NEW.comment);
    -- Enforce max length
    IF LENGTH(NEW.comment) > 500 THEN
      NEW.comment := LEFT(NEW.comment, 500);
    END IF;
    -- Empty after sanitization → NULL
    IF NEW.comment = '' THEN
      NEW.comment := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_review_comment ON reviews;
CREATE TRIGGER trg_sanitize_review_comment
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION _sanitize_review_comment();
