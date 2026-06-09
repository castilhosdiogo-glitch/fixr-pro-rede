-- ============================================================
-- 042_commission_rates_fix.sql
-- Alinha commission_rate com a tabela comercial vigente
-- (decisão 2026-06-09):
--
--   Parceiro     (plan_name = 'explorador', grátis)      → 12%
--   Profissional (plan_name = 'parceiro', R$ 29,90/mês)  → 10%
--   elite        (legado, mapeado pra Profissional no front) → 10%
--
-- CONTEXTO
--   Migration 016 setou explorador=15, parceiro=12, elite=10.
--   Front (usePlanGate/PricingSection/FAQ) anunciava grátis=15%,
--   pago=10% — divergência DB x marketing. Valores canônicos
--   confirmados pelo owner: 12 / 10.
--
--   Nota de naming: as KEYS no banco ('explorador'/'parceiro')
--   ficaram defasadas dos LABELS de marketing ('Parceiro'/
--   'Profissional'). Não renomear keys aqui — CHECK constraint,
--   front e RPCs dependem delas.
-- ============================================================

-- 1. Corrige rows existentes
UPDATE public.professional_profiles
SET commission_rate = 12.00
WHERE plan_name = 'explorador' AND commission_rate IS DISTINCT FROM 12.00;

UPDATE public.professional_profiles
SET commission_rate = 10.00
WHERE plan_name IN ('parceiro', 'elite') AND commission_rate IS DISTINCT FROM 10.00;

-- 2. Default da coluna (signups novos entram como explorador → 12%)
ALTER TABLE public.professional_profiles
  ALTER COLUMN commission_rate SET DEFAULT 12.00;

-- 3. Verificação (deve retornar 0 rows fora da tabela)
SELECT plan_name, commission_rate, COUNT(*)
FROM public.professional_profiles
WHERE (plan_name = 'explorador' AND commission_rate <> 12.00)
   OR (plan_name IN ('parceiro', 'elite') AND commission_rate <> 10.00)
GROUP BY plan_name, commission_rate;
