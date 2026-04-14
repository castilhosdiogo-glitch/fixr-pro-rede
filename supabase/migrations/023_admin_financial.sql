-- 023_admin_financial.sql
-- Escrow lifecycle + admin refund controls on payments

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS escrow_status TEXT NOT NULL DEFAULT 'holding'
    CHECK (escrow_status IN ('holding', 'released', 'held_by_admin', 'refunded')),
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escrow_hold_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_hold_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escrow_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_escrow_status
  ON public.payments (escrow_status)
  WHERE status = 'succeeded';

CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON public.payments (created_at DESC);
