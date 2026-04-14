-- ============================================================================
-- 022 — Disputes (mediation between clients and professionals)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id  UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  raised_by           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason              TEXT NOT NULL,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved_client', 'resolved_professional', 'cancelled')),
  resolution_note     TEXT,
  resolved_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_service ON public.disputes(service_request_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created ON public.disputes(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public._disputes_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_updated_at ON public.disputes;
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public._disputes_set_updated_at();

-- RLS: involved parties can read/create, admins can do anything
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_involved_read" ON public.disputes;
CREATE POLICY "disputes_involved_read" ON public.disputes
  FOR SELECT USING (
    raised_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = disputes.service_request_id
        AND (sr.client_id = auth.uid() OR sr.professional_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "disputes_involved_insert" ON public.disputes;
CREATE POLICY "disputes_involved_insert" ON public.disputes
  FOR INSERT WITH CHECK (
    raised_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_request_id
        AND (sr.client_id = auth.uid() OR sr.professional_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "disputes_admin_all" ON public.disputes;
CREATE POLICY "disputes_admin_all" ON public.disputes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

GRANT ALL ON public.disputes TO authenticated;
