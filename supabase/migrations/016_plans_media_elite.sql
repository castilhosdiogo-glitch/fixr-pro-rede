-- ============================================================
-- 016_plans_media_elite.sql
-- Novos planos (Explorador/Parceiro/Elite), mídia no chat,
-- features Elite (agenda, orçamento, equipe, portfólio, MEI)
-- ============================================================

-- ─── 1. ENUM: message_type ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('texto', 'audio', 'foto', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. ENUM: plan_name ──────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.plan_name AS ENUM ('explorador', 'parceiro', 'elite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 3. ENUM: quote_status ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('pendente', 'aprovado', 'recusado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 4. Atualizar professional_profiles: plan renomeado ──────
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS plan_name public.plan_name DEFAULT 'explorador',
  ADD COLUMN IF NOT EXISTS monthly_request_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_request_reset TIMESTAMPTZ DEFAULT date_trunc('month', now()),
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(4,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS search_boost INTEGER DEFAULT 0;

-- Migrar planos antigos para novos nomes
UPDATE public.professional_profiles SET plan_name = 'explorador'
  WHERE plan IN ('free', 'starter') OR plan IS NULL;
UPDATE public.professional_profiles SET plan_name = 'parceiro'
  WHERE plan IN ('profissional', 'professional');
UPDATE public.professional_profiles SET plan_name = 'elite'
  WHERE plan IN ('premium', 'elite');

-- Atualizar comissões e boost conforme plano
UPDATE public.professional_profiles SET commission_rate = 15.00, search_boost = 0
  WHERE plan_name = 'explorador';
UPDATE public.professional_profiles SET commission_rate = 12.00, search_boost = 1
  WHERE plan_name = 'parceiro';
UPDATE public.professional_profiles SET commission_rate = 10.00, search_boost = 2
  WHERE plan_name = 'elite';

-- ─── 5. Atualizar tabela messages: campo tipo e mídia ────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS tipo public.message_type DEFAULT 'texto',
  ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
  ADD COLUMN IF NOT EXISTS duracao INTEGER; -- segundos (só áudio)

-- ─── 6. TABELA: schedules (Elite — Agenda integrada) ─────────
CREATE TABLE IF NOT EXISTS public.schedules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data             DATE        NOT NULL,
  hora_inicio      TIME        NOT NULL,
  hora_fim         TIME        NOT NULL,
  disponivel       BOOLEAN     DEFAULT true,
  servico_id       UUID,
  cliente_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  titulo           TEXT,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (hora_fim > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_schedules_pro_data ON public.schedules (profissional_id, data);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "schedules_professional_manage" ON public.schedules
  FOR ALL USING (auth.uid() = profissional_id);

CREATE POLICY IF NOT EXISTS "schedules_client_view" ON public.schedules
  FOR SELECT USING (disponivel = true OR auth.uid() = cliente_id);

-- ─── 7. TABELA: quotes (Elite — Orçamento personalizado) ─────
CREATE TABLE IF NOT EXISTS public.quotes (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id       UUID,
  profissional_id  UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id       UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  itens_json       JSONB             NOT NULL DEFAULT '[]',
  valor_total      NUMERIC(10,2)     NOT NULL,
  status           public.quote_status DEFAULT 'pendente',
  validade         DATE,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ       DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ       DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_profissional ON public.quotes (profissional_id);
CREATE INDEX IF NOT EXISTS idx_quotes_cliente ON public.quotes (cliente_id);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "quotes_profissional_manage" ON public.quotes
  FOR ALL USING (auth.uid() = profissional_id);

CREATE POLICY IF NOT EXISTS "quotes_cliente_view" ON public.quotes
  FOR SELECT USING (auth.uid() = cliente_id);

CREATE POLICY IF NOT EXISTS "quotes_cliente_update_status" ON public.quotes
  FOR UPDATE USING (auth.uid() = cliente_id)
  WITH CHECK (auth.uid() = cliente_id);

-- ─── 8. TABELA: team_members (Elite — Equipe) ────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             TEXT        NOT NULL,
  funcao           TEXT        NOT NULL,
  foto_url         TEXT,
  ativo            BOOLEAN     DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_members_pro ON public.team_members (profissional_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "team_members_manage" ON public.team_members
  FOR ALL USING (auth.uid() = profissional_id);

CREATE POLICY IF NOT EXISTS "team_members_public_view" ON public.team_members
  FOR SELECT USING (ativo = true);

-- ─── 9. TABELA: portfolio (Elite — Portfólio público) ────────
CREATE TABLE IF NOT EXISTS public.portfolio (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  foto_url         TEXT        NOT NULL,
  legenda          TEXT,
  servico_id       UUID,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_pro ON public.portfolio (profissional_id, created_at DESC);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "portfolio_manage" ON public.portfolio
  FOR ALL USING (auth.uid() = profissional_id);

CREATE POLICY IF NOT EXISTS "portfolio_public_view" ON public.portfolio
  FOR SELECT USING (true);

-- ─── 10. TABELA: mei_revenue_tracking (Elite — Alerta MEI) ───
CREATE TABLE IF NOT EXISTS public.mei_revenue_tracking (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cnpj             TEXT        NOT NULL,
  ano              INTEGER     NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  faturamento_fixr NUMERIC(12,2) DEFAULT 0,
  alerta_70_enviado  BOOLEAN   DEFAULT false,
  alerta_90_enviado  BOOLEAN   DEFAULT false,
  alerta_100_enviado BOOLEAN   DEFAULT false,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (profissional_id, ano)
);

ALTER TABLE public.mei_revenue_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "mei_tracking_own" ON public.mei_revenue_tracking
  FOR ALL USING (auth.uid() = profissional_id);

-- ─── 11. FUNÇÃO: verificar_limite_pedidos_explorador ─────────
CREATE OR REPLACE FUNCTION public.verificar_limite_pedidos_explorador()
RETURNS TRIGGER AS $$
DECLARE
  v_plan     public.plan_name;
  v_count    INTEGER;
  v_reset    TIMESTAMPTZ;
BEGIN
  -- Apenas para profissionais
  SELECT plan_name, monthly_request_count, monthly_request_reset
    INTO v_plan, v_count, v_reset
    FROM public.professional_profiles
    WHERE user_id = NEW.professional_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Reset mensal
  IF v_reset < date_trunc('month', now()) THEN
    UPDATE public.professional_profiles
      SET monthly_request_count = 0,
          monthly_request_reset = date_trunc('month', now())
      WHERE user_id = NEW.professional_id;
    v_count := 0;
  END IF;

  -- Bloquear Explorador acima de 8
  IF v_plan = 'explorador' AND v_count >= 8 THEN
    RAISE EXCEPTION 'LIMITE_EXPLORADOR: Limite de 8 pedidos/mês atingido. Seja Parceiro para pedidos ilimitados.';
  END IF;

  -- Incrementar contador
  UPDATE public.professional_profiles
    SET monthly_request_count = monthly_request_count + 1
    WHERE user_id = NEW.professional_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 12. TRIGGER: limite pedidos no dispatch ─────────────────
DROP TRIGGER IF EXISTS trg_limite_explorador ON public.request_dispatches;
CREATE TRIGGER trg_limite_explorador
  BEFORE INSERT ON public.request_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.verificar_limite_pedidos_explorador();

-- ─── 13. FUNÇÃO: check_team_limit (máx 3 no Elite) ──────────
CREATE OR REPLACE FUNCTION public.check_team_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan  public.plan_name;
  v_count INTEGER;
BEGIN
  SELECT plan_name INTO v_plan
    FROM public.professional_profiles WHERE user_id = NEW.profissional_id;

  IF v_plan != 'elite' THEN
    RAISE EXCEPTION 'PLANO_INSUFICIENTE: Gestão de equipe disponível apenas no plano Elite.';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.team_members
    WHERE profissional_id = NEW.profissional_id AND ativo = true;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'LIMITE_EQUIPE: Máximo de 3 colaboradores no plano Elite.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_team_limit ON public.team_members;
CREATE TRIGGER trg_check_team_limit
  BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.check_team_limit();

-- ─── 14. FUNÇÃO: check_portfolio_limit (máx 20 fotos) ────────
CREATE OR REPLACE FUNCTION public.check_portfolio_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan  public.plan_name;
  v_count INTEGER;
BEGIN
  SELECT plan_name INTO v_plan
    FROM public.professional_profiles WHERE user_id = NEW.profissional_id;

  IF v_plan != 'elite' THEN
    RAISE EXCEPTION 'PLANO_INSUFICIENTE: Portfólio disponível apenas no plano Elite.';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.portfolio WHERE profissional_id = NEW.profissional_id;

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'LIMITE_PORTFOLIO: Máximo de 20 fotos no portfólio Elite.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_portfolio_limit ON public.portfolio;
CREATE TRIGGER trg_check_portfolio_limit
  BEFORE INSERT ON public.portfolio
  FOR EACH ROW EXECUTE FUNCTION public.check_portfolio_limit();

-- ─── 15. VIEW: professionals_with_plan ───────────────────────
CREATE OR REPLACE VIEW public.professionals_with_plan AS
  SELECT
    pp.*,
    p.full_name,
    p.avatar_url,
    p.city,
    p.state,
    p.phone,
    CASE pp.plan_name
      WHEN 'elite'    THEN 2
      WHEN 'parceiro' THEN 1
      ELSE 0
    END AS plan_rank
  FROM public.professional_profiles pp
  JOIN public.profiles p ON p.user_id = pp.user_id;

-- ─── 16. Notificações: adicionar novos tipos ─────────────────
-- (notification type é TEXT, não enum restrito — apenas documentar)
-- Novos tipos: 'audio_recebido', 'foto_recebida', 'video_recebido',
--              'orcamento_enviado', 'orcamento_aprovado',
--              'mei_alerta_70', 'mei_alerta_90', 'mei_alerta_100',
--              'limite_pedidos_aviso' (Explorador em 6/8)
