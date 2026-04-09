-- 016_pricing_tiers.sql
-- Estrutura de planos: Explorador / Parceiro / Elite

-- 1. Adicionar colunas de plano ao professional_profiles
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'explorador'
    CHECK (plan_name IN ('explorador', 'parceiro', 'elite')),
  ADD COLUMN IF NOT EXISTS monthly_request_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(4,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS search_boost INTEGER DEFAULT 0;

-- 2. Migrar valores existentes do campo plan/premium
UPDATE public.professional_profiles SET plan_name =
  CASE
    WHEN plan = 'premium' OR premium = true THEN 'elite'
    WHEN plan = 'professional' THEN 'parceiro'
    ELSE 'explorador'
  END
WHERE plan_name = 'explorador';

-- 3. Sincronizar commission_rate e search_boost
UPDATE public.professional_profiles SET
  commission_rate = CASE plan_name
    WHEN 'explorador' THEN 15.00
    WHEN 'parceiro'   THEN 12.00
    WHEN 'elite'      THEN 10.00
    ELSE 15.00
  END,
  search_boost = CASE plan_name
    WHEN 'explorador' THEN 0
    WHEN 'parceiro'   THEN 1
    WHEN 'elite'      THEN 2
    ELSE 0
  END;

-- 4. Função para contar requests do mês atual
CREATE OR REPLACE FUNCTION public.get_monthly_request_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM service_requests
    WHERE professional_id = p_user_id
      AND created_at >= date_trunc('month', now())
      AND status NOT IN ('cancelled')
  );
END;
$$;

-- 5. Função para verificar se profissional pode aceitar mais requests
CREATE OR REPLACE FUNCTION public.check_plan_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_count INTEGER;
BEGIN
  SELECT plan_name INTO v_plan
  FROM professional_profiles
  WHERE user_id = p_user_id;

  -- Parceiro e Elite têm requests ilimitados
  IF v_plan IN ('parceiro', 'elite') THEN
    RETURN TRUE;
  END IF;

  -- Explorador: máximo 8 requests por mês
  v_count := get_monthly_request_count(p_user_id);
  RETURN v_count < 8;
END;
$$;

-- 6. Índice para performance de queries por plano
CREATE INDEX IF NOT EXISTS idx_professional_profiles_plan_name
  ON public.professional_profiles(plan_name);
