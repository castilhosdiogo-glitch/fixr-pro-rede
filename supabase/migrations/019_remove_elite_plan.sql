-- ============================================================================
-- 019 — Remove Elite plan, consolidate into Parceiro
-- ============================================================================

-- Migrate all Elite users to Parceiro
UPDATE public.professional_profiles
SET plan_name = 'parceiro',
    commission_rate = 10,
    search_boost = 2
WHERE plan_name = 'elite';

-- Update Parceiro pricing/commission
UPDATE public.professional_profiles
SET commission_rate = 10,
    search_boost = 2
WHERE plan_name = 'parceiro';

-- Update Explorador defaults
UPDATE public.professional_profiles
SET commission_rate = 15,
    search_boost = 0
WHERE plan_name = 'explorador';

-- Add CHECK constraint to prevent future Elite plans
-- (drop old one if exists, then create)
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS chk_plan_name;

ALTER TABLE public.professional_profiles
  ADD CONSTRAINT chk_plan_name
  CHECK (plan_name IN ('explorador', 'parceiro'));
