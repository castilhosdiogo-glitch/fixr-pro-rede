-- 014_payments.sql
-- Payment tracking and professional payouts with 15% commission

-- ── payments table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id      uuid NOT NULL UNIQUE REFERENCES public.service_requests(id) ON DELETE CASCADE,
  client_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid_cents       integer NOT NULL, -- stored in cents
  commission_percent      integer NOT NULL DEFAULT 15,
  commission_amount_cents integer NOT NULL,
  status                  text NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
  stripe_payment_intent   text UNIQUE,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_client_read ON public.payments
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY payments_pro_read ON public.payments
  FOR SELECT USING (professional_id = auth.uid());

CREATE POLICY payments_admin_all ON public.payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ── professional_payouts table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.professional_payouts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id          uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  amount_cents        integer NOT NULL, -- commission amount
  status              text NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed
  stripe_transfer_id  text UNIQUE,
  stripe_payout_id    text UNIQUE,
  failure_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY payouts_own_read ON public.professional_payouts
  FOR SELECT USING (professional_id = auth.uid());

CREATE POLICY payouts_admin_all ON public.professional_payouts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ── Trigger: auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._set_updated_at_payments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._set_updated_at_payouts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public._set_updated_at_payments();

DROP TRIGGER IF EXISTS trg_payouts_updated_at ON public.professional_payouts;
CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.professional_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public._set_updated_at_payouts();

-- ── Trigger: create payout when payment succeeds ───────────────────────────
CREATE OR REPLACE FUNCTION public._create_payout_on_payment_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    INSERT INTO public.professional_payouts (professional_id, payment_id, amount_cents)
    VALUES (NEW.professional_id, NEW.id, NEW.commission_amount_cents);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_payout ON public.payments;
CREATE TRIGGER trg_create_payout
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public._create_payout_on_payment_success();

-- ── View: professional earnings summary ────────────────────────────────────
CREATE OR REPLACE VIEW public.professional_earnings AS
SELECT
  p.professional_id,
  COUNT(DISTINCT p.id) as total_services,
  COALESCE(SUM(p.commission_amount_cents), 0) as total_earned_cents,
  COALESCE(SUM(CASE WHEN po.status = 'succeeded' THEN po.amount_cents ELSE 0 END), 0) as total_paid_cents,
  COALESCE(SUM(CASE WHEN po.status IN ('pending', 'processing') THEN po.amount_cents ELSE 0 END), 0) as pending_cents
FROM payments p
LEFT JOIN professional_payouts po ON p.id = po.payment_id
WHERE p.status = 'succeeded'
GROUP BY p.professional_id;

GRANT SELECT ON public.professional_earnings TO authenticated;
