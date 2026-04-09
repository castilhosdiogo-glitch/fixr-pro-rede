-- ============================================================================
-- 018 — Elite-exclusive tables: schedules, quotes, team, MEI revenue tracking
-- ============================================================================

-- ─── Schedules (Agenda) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_owner" ON public.schedules
  FOR ALL USING (professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_schedules_professional ON public.schedules(professional_id);
CREATE INDEX idx_schedules_start ON public.schedules(start_at);

-- ─── Quotes (Orçamentos) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  description TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected')),
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_owner" ON public.quotes
  FOR ALL USING (professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "quote_items_owner" ON public.quote_items
  FOR ALL USING (quote_id IN (
    SELECT id FROM public.quotes WHERE professional_id IN (
      SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE INDEX idx_quotes_professional ON public.quotes(professional_id);

-- ─── Team Members (Equipe) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_owner" ON public.team_members
  FOR ALL USING (professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_team_professional ON public.team_members(professional_id);

-- ─── MEI Revenue Tracking ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mei_revenue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- first day of the month
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(professional_id, month)
);

ALTER TABLE public.mei_revenue_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mei_revenue_owner" ON public.mei_revenue_tracking
  FOR ALL USING (professional_id IN (
    SELECT id FROM public.professional_profiles WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_mei_revenue_professional ON public.mei_revenue_tracking(professional_id);
CREATE INDEX idx_mei_revenue_month ON public.mei_revenue_tracking(month);

-- ─── Updated_at triggers ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_schedules_updated BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_mei_revenue_updated BEFORE UPDATE ON public.mei_revenue_tracking
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
