-- ============================================================
-- 037_onboarding_columns_patch.sql
-- Patch cirúrgico: adiciona APENAS as colunas de 030_fixr_onboarding
-- sem reescrever dispatch_broadcast_request.
--
-- CONTEXTO
--   Em prod (2026-04-16) a migration 030 nunca foi aplicada, mas 033
--   (geo dispatch) foi. A 033 referencia pp.onboarding_completo em
--   runtime — descoberto no smoke test geo_dispatch_smoke.sql. Rodar
--   030 agora REGRIDE a função dispatch_broadcast_request (030
--   sobrescreve 033 com a versão sem Haversine/raio/disponivel).
--
--   Este patch pega só as colunas + backfill de 030. A função
--   dispatch_broadcast_request da 033 continua intocada.
--
-- ⚠️  NÃO RODAR 030_fixr_onboarding.sql EM PROD ⚠️
--   Se precisar das RPCs de onboarding (fixr_get_onboarding_state,
--   fixr_complete_pro_onboarding, fixr_set_pro_onboarding_step),
--   extrair elas em uma migration 038 separada, sem a função de
--   dispatch antiga.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Colunas em professional_profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completo      BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_passo_atual   INT           NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_concluido_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS categorias               TEXT[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS especialidades           TEXT[]        NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.professional_profiles.onboarding_completo IS
  'True quando o pro terminou todos os passos do onboarding. Pros com false não entram em dispatch.';
COMMENT ON COLUMN public.professional_profiles.onboarding_passo_atual IS
  'Passo em que o pro parou (1..6). Permite retomar de onde parou.';
COMMENT ON COLUMN public.professional_profiles.categorias IS
  'Múltiplas categorias que o pro atende (além de category_id que é a principal).';
COMMENT ON COLUMN public.professional_profiles.especialidades IS
  'Especialidades livres digitadas pelo pro (ex.: "aquecedor a gás", "pia granito").';

CREATE INDEX IF NOT EXISTS idx_pp_onboarding_completo
  ON public.professional_profiles (onboarding_completo)
  WHERE onboarding_completo = false;

-- ────────────────────────────────────────────────────────────
-- 2. Colunas em profiles (endereço principal do cliente)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS endereco_principal TEXT,
  ADD COLUMN IF NOT EXISTS endereco_lat       NUMERIC,
  ADD COLUMN IF NOT EXISTS endereco_lng       NUMERIC;

COMMENT ON COLUMN public.profiles.endereco_principal IS
  'Endereço principal do usuário (string livre ou formatted_address do Google Places).';

-- ────────────────────────────────────────────────────────────
-- 3. Backfill: pros existentes com bio completa viram 'onboarding_completo'
--    Evita que pros antigos legítimos fiquem de fora do dispatch.
-- ────────────────────────────────────────────────────────────

UPDATE public.professional_profiles pp
   SET onboarding_completo     = true,
       onboarding_passo_atual  = 6,
       onboarding_concluido_em = COALESCE(onboarding_concluido_em, pp.created_at)
 WHERE onboarding_completo = false
   AND pp.category_id IS NOT NULL
   AND pp.description IS NOT NULL
   AND LENGTH(TRIM(pp.description)) >= 20
   AND pp.created_at < now() - INTERVAL '1 day';
