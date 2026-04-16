-- ============================================================
-- 036_pro_tipo_pessoa.sql
-- Classificação PF/PJ do profissional + CNPJ opcional
--
-- Campo simples: autônomo (PF) ou pessoa jurídica (PJ).
-- Se PJ, guarda CNPJ apenas dígitos (14 chars). A validação
-- de DV é feita no front; aqui só o CHECK estrutural.
-- ============================================================

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT NOT NULL DEFAULT 'pf'
    CHECK (tipo_pessoa IN ('pf','pj')),
  ADD COLUMN IF NOT EXISTS cnpj        TEXT;

-- Invariante: se tipo_pessoa = 'pj', cnpj tem 14 dígitos.
-- Aceita NULL quando PF.
ALTER TABLE public.professional_profiles
  DROP CONSTRAINT IF EXISTS professional_profiles_cnpj_when_pj;
ALTER TABLE public.professional_profiles
  ADD  CONSTRAINT professional_profiles_cnpj_when_pj
  CHECK (
    tipo_pessoa = 'pf'
    OR (tipo_pessoa = 'pj' AND cnpj IS NOT NULL AND cnpj ~ '^[0-9]{14}$')
  );

COMMENT ON COLUMN public.professional_profiles.tipo_pessoa IS
  'Classificação fiscal: pf=autônomo (CPF apenas), pj=pessoa jurídica (MEI/ME/EPP/LTDA).';
COMMENT ON COLUMN public.professional_profiles.cnpj IS
  'CNPJ somente dígitos (14 chars) quando tipo_pessoa=pj. NULL quando pf.';

CREATE INDEX IF NOT EXISTS idx_professional_profiles_cnpj
  ON public.professional_profiles (cnpj)
  WHERE cnpj IS NOT NULL;
