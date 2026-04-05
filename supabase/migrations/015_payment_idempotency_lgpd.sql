-- 015_payment_idempotency_lgpd.sql
-- Add idempotency + LGPD consent tracking

-- ── Add idempotency_key to payments ────────────────────────────────────────
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- Create index for fast idempotency lookup
CREATE INDEX IF NOT EXISTS idx_payments_idempotency
  ON public.payments(idempotency_key);

-- ── Add LGPD consent tracking ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_consents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_accepted   boolean NOT NULL DEFAULT false,
  marketing_accepted boolean NOT NULL DEFAULT false,
  accepted_at        timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_own_read ON public.user_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY consent_own_insert ON public.user_consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY consent_own_update ON public.user_consents
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Trigger to auto-update updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public._set_updated_at_consents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_updated_at ON public.user_consents;
CREATE TRIGGER trg_consent_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public._set_updated_at_consents();

-- ── Add payment input validation function ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_payment_amount(p_amount_cents integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Min: R$1.00 (100 cents)
  -- Max: R$100,000.00 (10,000,000 cents)
  IF p_amount_cents < 100 OR p_amount_cents > 10000000 THEN
    RAISE EXCEPTION 'invalid_amount: must be between 1.00 and 100000.00 BRL';
  END IF;
  RETURN true;
END;
$$;

-- ── Add CHECK constraint to payments ───────────────────────────────────────
ALTER TABLE public.payments
ADD CONSTRAINT check_payment_amount
  CHECK (amount_paid_cents >= 100 AND amount_paid_cents <= 10000000);

-- ── GDPR/LGPD: Add user data deletion function ─────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
BEGIN
  -- Only user can delete their own data, or admin
  IF v_current_user_id != p_user_id AND NOT (SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_current_user_id AND role = 'admin')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Anonymize profiles
  UPDATE profiles
  SET full_name = 'Usuário Deletado',
      phone = NULL,
      avatar_url = NULL,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Anonymize professional profiles
  UPDATE professional_profiles
  SET description = '[Conta deletada]',
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Delete messages (permanent)
  DELETE FROM messages
  WHERE sender_id = p_user_id OR recipient_id = p_user_id;

  -- Anonymize reviews (keep for reputation system)
  UPDATE reviews
  SET comment = '[Comentário removido]'
  WHERE client_id = p_user_id OR professional_id = p_user_id;

  -- Delete push subscriptions
  DELETE FROM push_subscriptions
  WHERE user_id = p_user_id;

  -- Delete waiting list entries
  DELETE FROM waiting_list
  WHERE user_id = p_user_id;

  -- Delete consents
  DELETE FROM user_consents
  WHERE user_id = p_user_id;

  -- Log deletion
  INSERT INTO public.audit_log (user_id, action, details)
  VALUES (p_user_id, 'user_data_deleted', jsonb_build_object('timestamp', now()));
END;
$$;

-- ── Create audit log table for LGPD compliance ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action    text NOT NULL,
  details   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_admin_read ON public.audit_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
