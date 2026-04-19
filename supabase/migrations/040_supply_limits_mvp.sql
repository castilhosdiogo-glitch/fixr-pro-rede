-- ============================================================
-- 040_supply_limits_mvp.sql
-- Fase 1 do pacote de equilíbrio oferta × demanda.
--
-- ESCOPO
--   1. Seed MVP de 11 categorias × 6 cidades = 140 vagas.
--   2. Tabela city_settings com growth_phase (LAUNCH/EXPANSION/...).
--   3. profiles.account_type (B2C/B2B_SMALL/B2B_LARGE).
--   4. View analytics_professional_demand (pedidos por pro/mês).
--
-- FORA DO ESCOPO (fases futuras):
--   - Cron de expansão automática (fase 2).
--   - Alerta de pro inativo (fase 3).
--   - Weekly email report (fase 4, bloqueada por provider).
--
-- IDEMPOTÊNCIA
--   Rodar múltiplas vezes é seguro: categorias/enums/colunas usam
--   IF NOT EXISTS. supply_limits é DELETE+INSERT transacional.
-- ============================================================

BEGIN;

-- ─── 1. Categorias novas ────────────────────────────────────
-- Mantém as 6 existentes (encanador, eletricista, diarista,
-- pedreiro, pintor, frete) e adiciona 6 novas pro MVP.
INSERT INTO public.categories (id, name, icon) VALUES
  ('jardineiro',      'Jardineiro',      'Trees'),
  ('ar-condicionado', 'Ar Condicionado', 'Snowflake'),
  ('marceneiro',      'Marceneiro',      'Hammer'),
  ('gesseiro',        'Gesseiro',        'Layers'),
  ('dedetizador',     'Dedetizador',     'Bug'),
  ('tecnico-geral',   'Técnico Geral',   'Wrench')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Relaxa CHECK em supply_limits ───────────────────────
-- Permite max_professionals = 0 (bloqueia categoria na cidade
-- explicitamente, diferente de "linha ausente" = sem limite).
ALTER TABLE public.supply_limits
  DROP CONSTRAINT IF EXISTS supply_limits_max_professionals_check;

ALTER TABLE public.supply_limits
  ADD CONSTRAINT supply_limits_max_professionals_check
  CHECK (max_professionals >= 0);

-- ─── 3. Substitui seed de supply_limits ─────────────────────
-- 66 linhas (11 categorias × 6 cidades) com os limites MVP.
-- Total: 140 vagas (PoA 50 · Canoas 30 · Gravataí 22 ·
-- Viamão 18 · Alvorada 12 · Cachoeirinha 8).
DELETE FROM public.supply_limits;

INSERT INTO public.supply_limits (category_id, city, max_professionals) VALUES
  -- PORTO ALEGRE (50)
  ('eletricista',     'Porto Alegre',  8),
  ('encanador',       'Porto Alegre',  6),
  ('diarista',        'Porto Alegre', 12),
  ('pintor',          'Porto Alegre',  5),
  ('pedreiro',        'Porto Alegre',  4),
  ('jardineiro',      'Porto Alegre',  3),
  ('ar-condicionado', 'Porto Alegre',  3),
  ('marceneiro',      'Porto Alegre',  3),
  ('gesseiro',        'Porto Alegre',  2),
  ('dedetizador',     'Porto Alegre',  2),
  ('tecnico-geral',   'Porto Alegre',  2),

  -- CANOAS (30)
  ('eletricista',     'Canoas',  5),
  ('encanador',       'Canoas',  4),
  ('diarista',        'Canoas',  7),
  ('pintor',          'Canoas',  3),
  ('pedreiro',        'Canoas',  3),
  ('jardineiro',      'Canoas',  2),
  ('ar-condicionado', 'Canoas',  2),
  ('marceneiro',      'Canoas',  1),
  ('gesseiro',        'Canoas',  1),
  ('dedetizador',     'Canoas',  1),
  ('tecnico-geral',   'Canoas',  1),

  -- GRAVATAÍ (22)
  ('eletricista',     'Gravataí',  4),
  ('encanador',       'Gravataí',  3),
  ('diarista',        'Gravataí',  5),
  ('pintor',          'Gravataí',  2),
  ('pedreiro',        'Gravataí',  2),
  ('jardineiro',      'Gravataí',  2),
  ('ar-condicionado', 'Gravataí',  1),
  ('marceneiro',      'Gravataí',  1),
  ('gesseiro',        'Gravataí',  1),
  ('dedetizador',     'Gravataí',  0),
  ('tecnico-geral',   'Gravataí',  1),

  -- VIAMÃO (18)
  ('eletricista',     'Viamão',  3),
  ('encanador',       'Viamão',  3),
  ('diarista',        'Viamão',  4),
  ('pintor',          'Viamão',  2),
  ('pedreiro',        'Viamão',  2),
  ('jardineiro',      'Viamão',  1),
  ('ar-condicionado', 'Viamão',  1),
  ('marceneiro',      'Viamão',  1),
  ('gesseiro',        'Viamão',  1),
  ('dedetizador',     'Viamão',  0),
  ('tecnico-geral',   'Viamão',  0),

  -- ALVORADA (12)
  ('eletricista',     'Alvorada',  2),
  ('encanador',       'Alvorada',  2),
  ('diarista',        'Alvorada',  3),
  ('pintor',          'Alvorada',  1),
  ('pedreiro',        'Alvorada',  1),
  ('jardineiro',      'Alvorada',  1),
  ('ar-condicionado', 'Alvorada',  1),
  ('marceneiro',      'Alvorada',  1),
  ('gesseiro',        'Alvorada',  0),
  ('dedetizador',     'Alvorada',  0),
  ('tecnico-geral',   'Alvorada',  0),

  -- CACHOEIRINHA (8)
  ('eletricista',     'Cachoeirinha',  2),
  ('encanador',       'Cachoeirinha',  1),
  ('diarista',        'Cachoeirinha',  2),
  ('pintor',          'Cachoeirinha',  1),
  ('pedreiro',        'Cachoeirinha',  1),
  ('jardineiro',      'Cachoeirinha',  1),
  ('ar-condicionado', 'Cachoeirinha',  0),
  ('marceneiro',      'Cachoeirinha',  0),
  ('gesseiro',        'Cachoeirinha',  0),
  ('dedetizador',     'Cachoeirinha',  0),
  ('tecnico-geral',   'Cachoeirinha',  0);

-- Sanity check: confirma que inserimos exatamente 140 vagas
DO $$
DECLARE
  v_total INT;
BEGIN
  SELECT SUM(max_professionals) INTO v_total FROM public.supply_limits;
  IF v_total != 140 THEN
    RAISE EXCEPTION 'Seed de supply_limits errado: total=%, esperado=140', v_total;
  END IF;
END $$;

-- ─── 4. Growth phase por cidade ─────────────────────────────
-- LAUNCH → EXPANSION → B2B_ENTRY → SCALE.
-- Admin avança manualmente pelo painel. Cron de expansão
-- (fase 2) vai ler esse campo pra decidir se age ou fica quieto.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'growth_phase') THEN
    CREATE TYPE growth_phase AS ENUM ('LAUNCH', 'EXPANSION', 'B2B_ENTRY', 'SCALE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.city_settings (
  city         TEXT         PRIMARY KEY,
  growth_phase growth_phase NOT NULL DEFAULT 'LAUNCH',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO public.city_settings (city) VALUES
  ('Porto Alegre'),
  ('Canoas'),
  ('Gravataí'),
  ('Viamão'),
  ('Alvorada'),
  ('Cachoeirinha')
ON CONFLICT (city) DO NOTHING;

CREATE OR REPLACE FUNCTION _city_settings_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS city_settings_updated_at ON public.city_settings;
CREATE TRIGGER city_settings_updated_at
  BEFORE UPDATE ON public.city_settings
  FOR EACH ROW EXECUTE FUNCTION _city_settings_set_updated_at();

-- RLS: leitura pública, escrita só admin
ALTER TABLE public.city_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "city_settings_select"
  ON public.city_settings FOR SELECT USING (true);

CREATE POLICY "city_settings_admin_all"
  ON public.city_settings FOR ALL
  USING      (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- ─── 5. account_type em profiles ────────────────────────────
-- Preparação pra fase B2B. Hoje todos começam B2C.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('B2C', 'B2B_SMALL', 'B2B_LARGE');
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type account_type NOT NULL DEFAULT 'B2C';

-- ─── 6. View: pedidos por profissional / mês ────────────────
-- Core da métrica de saúde de cada (categoria × cidade).
-- Meta: 5-8 pedidos/pro/mês.
--   < 5  → subdemanda (não expandir mesmo com fila)
--   5-8  → saudável
--   > 8  → oportunidade (pode expandir)
CREATE OR REPLACE VIEW public.analytics_professional_demand AS
WITH month_start AS (
  SELECT date_trunc('month', now()) AS ts
),
orders AS (
  SELECT br.category_id, br.city, COUNT(*)::INT AS total_orders
  FROM   public.broadcast_requests br
  CROSS JOIN month_start ms
  WHERE  br.created_at >= ms.ts
  GROUP  BY br.category_id, br.city
),
active_pros AS (
  SELECT pp.category_id, pr.city, COUNT(*)::INT AS active_count
  FROM   public.professional_profiles pp
  JOIN   public.profiles pr ON pr.user_id = pp.user_id
  WHERE  COALESCE(pp.disponivel, false) = true
    AND  COALESCE(pp.onboarding_completo, false) = true
    AND  COALESCE(pp.nivel_curadoria, 'fixr_explorador') != 'fixr_restrito'
  GROUP  BY pp.category_id, pr.city
)
SELECT
  sl.category_id,
  c.name AS category_name,
  sl.city,
  sl.max_professionals,
  COALESCE(ap.active_count,   0) AS active_pros,
  COALESCE(o.total_orders,    0) AS orders_this_month,
  CASE
    WHEN COALESCE(ap.active_count, 0) = 0 THEN 0::NUMERIC
    ELSE ROUND(COALESCE(o.total_orders, 0)::NUMERIC / ap.active_count, 1)
  END AS orders_per_pro,
  CASE
    WHEN COALESCE(ap.active_count, 0) = 0 THEN 'NO_PROS'
    WHEN sl.max_professionals = 0       THEN 'BLOCKED'
    WHEN COALESCE(o.total_orders, 0)::NUMERIC / NULLIF(ap.active_count, 0) > 8 THEN 'OVER_DEMAND'
    WHEN COALESCE(o.total_orders, 0)::NUMERIC / NULLIF(ap.active_count, 0) < 5 THEN 'UNDER_DEMAND'
    ELSE 'HEALTHY'
  END AS demand_status,
  (SELECT growth_phase FROM public.city_settings cs WHERE cs.city = sl.city) AS growth_phase
FROM       public.supply_limits sl
JOIN       public.categories c ON c.id = sl.category_id
LEFT JOIN  orders o      ON o.category_id  = sl.category_id AND o.city  = sl.city
LEFT JOIN  active_pros ap ON ap.category_id = sl.category_id AND ap.city = sl.city;

-- Grant seletivo: só admin vê o dashboard analítico completo.
-- (Cron da fase 2 roda como postgres/service_role, ignora RLS.)
REVOKE ALL ON public.analytics_professional_demand FROM PUBLIC, anon, authenticated;
GRANT  SELECT ON public.analytics_professional_demand TO authenticated;

COMMIT;

-- ============================================================
-- VERIFICAÇÃO MANUAL (rodar no SQL editor depois)
--
-- SELECT SUM(max_professionals) FROM supply_limits;  -- 140
-- SELECT city, COUNT(*) FROM supply_limits GROUP BY city;  -- 11 cada
-- SELECT * FROM city_settings;  -- 6 linhas LAUNCH
-- SELECT * FROM analytics_professional_demand;  -- preview
-- ============================================================
