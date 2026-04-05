-- ============================================================
-- 008_fraud_ratelimit_fixes.sql
-- 1. Real server-side fraud detection for referrals
-- 2. Rate limiting on broadcast_requests
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. FRAUD DETECTION — Server-side IP tracking
-- ────────────────────────────────────────────────────────────

-- Track IPs used by each user at login/signup time
-- This is populated by the application layer on auth events
CREATE TABLE IF NOT EXISTS user_ip_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash      TEXT NOT NULL,   -- SHA-256 of IP address (never store raw IP)
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_ip_log_user
  ON user_ip_log(user_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_ip_log_ip
  ON user_ip_log(ip_hash, recorded_at DESC);

ALTER TABLE user_ip_log ENABLE ROW LEVEL SECURITY;

-- Only system (SECURITY DEFINER) can write; users can't read others' IPs
CREATE POLICY "system_insert_ip_log"
  ON user_ip_log FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "users_read_own_ip_log"
  ON user_ip_log FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Store referrer's IP hash on the referral_codes row
-- ────────────────────────────────────────────────────────────

ALTER TABLE referral_codes
  ADD COLUMN IF NOT EXISTS last_ip_hash TEXT;

-- ────────────────────────────────────────────────────────────
-- Replace apply_referral() with server-side fraud detection
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION apply_referral(
  p_referred_id       UUID,
  p_code              TEXT,
  p_referred_ip_hash  TEXT  DEFAULT NULL,
  p_fingerprint       TEXT  DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id       UUID;
  v_referrer_ip_hash  TEXT;
  v_fraud_reason      TEXT := NULL;
  v_is_fraud          BOOLEAN := FALSE;
  v_same_ip_referrer  BOOLEAN := FALSE;
  v_same_ip_recent    BOOLEAN := FALSE;
BEGIN
  -- Resolve referrer from code
  SELECT user_id, last_ip_hash
  INTO v_referrer_id, v_referrer_ip_hash
  FROM referral_codes
  WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND THEN RETURN 'code_not_found'; END IF;

  -- Self-referral guard
  IF v_referrer_id = p_referred_id THEN RETURN 'self_referral'; END IF;

  -- Already referred by someone (not fraud)
  IF EXISTS (
    SELECT 1 FROM referrals
    WHERE referred_id = p_referred_id
      AND status NOT IN ('fraud')
  ) THEN
    RETURN 'already_referred';
  END IF;

  -- ── Fraud Check 1: IP matches referrer's recorded IP ──────
  IF p_referred_ip_hash IS NOT NULL AND v_referrer_ip_hash IS NOT NULL THEN
    IF p_referred_ip_hash = v_referrer_ip_hash THEN
      v_is_fraud := TRUE;
      v_fraud_reason := 'same_ip_as_referrer';
    END IF;
  END IF;

  -- ── Fraud Check 2: referrer's known IPs from user_ip_log ──
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

  -- ── Fraud Check 3: same IP used by multiple recent signups ──
  IF NOT v_is_fraud AND p_referred_ip_hash IS NOT NULL THEN
    -- If this IP hash was used by 3+ different users in the last 7 days → suspicious
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

  -- ── Fraud Check 4: device fingerprint reuse ───────────────
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

  -- ── Insert referral (with fraud flag if applicable) ───────
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

  -- Increment click counter only for non-fraud
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

-- ────────────────────────────────────────────────────────────
-- Function to record a user's IP on login/signup
-- Called from application layer after successful auth
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION record_user_ip(
  p_user_id  UUID,
  p_ip_hash  TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert new IP log entry
  INSERT INTO user_ip_log (user_id, ip_hash)
  VALUES (p_user_id, p_ip_hash)
  ON CONFLICT DO NOTHING;

  -- Also update referral_codes.last_ip_hash for this user
  UPDATE referral_codes SET last_ip_hash = p_ip_hash
  WHERE user_id = p_user_id;

  -- Keep only last 10 IPs per user (prune old entries)
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

GRANT EXECUTE ON FUNCTION record_user_ip TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. RATE LIMITING — broadcast_requests
-- Max 5 broadcasts per client per hour
-- ────────────────────────────────────────────────────────────

-- Replace the existing INSERT policy with one that checks rate
DROP POLICY IF EXISTS "broadcast_client_insert" ON broadcast_requests;

CREATE POLICY "broadcast_client_insert_ratelimited"
  ON broadcast_requests FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND (
      SELECT COUNT(*) FROM broadcast_requests
      WHERE client_id = auth.uid()
        AND created_at > NOW() - INTERVAL '1 hour'
        AND status NOT IN ('cancelled')
    ) < 5
  );

-- ────────────────────────────────────────────────────────────
-- 3. Rate limiting on referral code application attempts
-- Max 10 failed attempts per user per hour
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_attempt_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_tried   TEXT NOT NULL,
  result       TEXT NOT NULL,  -- 'ok' | 'code_not_found' | etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_attempts_user
  ON referral_attempt_log(user_id, created_at DESC);

ALTER TABLE referral_attempt_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_insert_attempt_log"
  ON referral_attempt_log FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "users_read_own_attempts"
  ON referral_attempt_log FOR SELECT USING (auth.uid() = user_id);

-- Wrap apply_referral with rate-limit check
CREATE OR REPLACE FUNCTION apply_referral_safe(
  p_referred_id       UUID,
  p_code              TEXT,
  p_referred_ip_hash  TEXT  DEFAULT NULL,
  p_fingerprint       TEXT  DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_attempt_count INT;
  v_result        TEXT;
BEGIN
  -- Check recent failed attempts (rate limit: 10 failed per hour)
  SELECT COUNT(*) INTO v_attempt_count
  FROM referral_attempt_log
  WHERE user_id = p_referred_id
    AND result NOT IN ('ok', 'already_referred')
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_attempt_count >= 10 THEN
    RETURN 'rate_limited';
  END IF;

  -- Call the actual function
  v_result := apply_referral(p_referred_id, p_code, p_referred_ip_hash, p_fingerprint);

  -- Log the attempt
  INSERT INTO referral_attempt_log (user_id, code_tried, result)
  VALUES (p_referred_id, UPPER(TRIM(p_code)), v_result);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_referral_safe TO authenticated;
