-- 024_pagarme_subscriptions.sql
-- Pagar.me subscriptions, webhook event log, recipient & charge tracking

-- ── Subscriptions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('parceiro')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'canceled', 'failed')),
  pagarme_subscription_id TEXT UNIQUE,
  pagarme_customer_id TEXT,
  amount_cents INTEGER NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  last_failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_owner_read ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY subscriptions_admin_all ON public.subscriptions
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ── Pagar.me webhook event log (idempotency + audit) ───────────────────────
CREATE TABLE IF NOT EXISTS public.pagarme_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pagarme_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pagarme_events_admin_all ON public.pagarme_webhook_events
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pagarme_events_type ON public.pagarme_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pagarme_events_created ON public.pagarme_webhook_events(created_at DESC);

-- ── Marketplace: Pagar.me recipient per professional ──────────────────────
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pagarme_recipient_status TEXT;

-- ── Payments: add Pagar.me tracking columns ───────────────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pagarme_order_id TEXT,
  ADD COLUMN IF NOT EXISTS pagarme_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS pagarme_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'boleto', 'credit_card', 'debit_card'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_pagarme_charge
  ON public.payments(pagarme_charge_id)
  WHERE pagarme_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_pagarme_order
  ON public.payments(pagarme_order_id)
  WHERE pagarme_order_id IS NOT NULL;

-- ── Updated_at trigger on subscriptions ───────────────────────────────────
CREATE OR REPLACE FUNCTION public._set_updated_at_subscriptions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public._set_updated_at_subscriptions();
