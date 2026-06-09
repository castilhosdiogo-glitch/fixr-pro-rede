-- ============================================================
-- 039_onboarding_rpcs.sql
-- Extrai as 3 RPCs de onboarding da migration 030 SEM rodar a
-- 030 inteira (030 sobrescreveria dispatch_broadcast_request,
-- regredindo 033 — Haversine/raio).
--
-- CONTEXTO
--   - 030 nunca rodou em prod; 037 só trouxe as colunas.
--   - Front em [src/hooks/useOnboarding.ts] chama as 3 RPCs.
--   - Sem elas: wizard de onboarding quebrado em prod.
--
-- Este arquivo copia literalmente as funções das seções 5/6/7 da
-- 030 — bytes idênticos, só sem a seção 4 (dispatch).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Estado do onboarding (usado pelo useOnboardingState)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_get_onboarding_state(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type         TEXT;
  v_onboarding_completo BOOLEAN;
  v_passo_db          INT;
  v_category_id       TEXT;
  v_description       TEXT;
  v_recipient_id      TEXT;
  v_avatar_url        TEXT;
  v_has_kyc           BOOLEAN;
  v_has_endereco      BOOLEAN;
  v_missing           TEXT[] := '{}';
  v_completo          BOOLEAN := false;
  v_passo             INT := 1;
BEGIN
  SELECT user_type::TEXT, avatar_url
    INTO v_user_type, v_avatar_url
    FROM public.profiles WHERE user_id = _user_id;

  IF v_user_type IS NULL THEN
    RETURN jsonb_build_object(
      'user_type', NULL,
      'completo', false,
      'passo_atual', 1,
      'missing', jsonb_build_array('profile_inexistente')
    );
  END IF;

  IF v_user_type = 'professional' THEN
    SELECT onboarding_completo, onboarding_passo_atual, category_id, description, pagarme_recipient_id
      INTO v_onboarding_completo, v_passo_db, v_category_id, v_description, v_recipient_id
      FROM public.professional_profiles
     WHERE user_id = _user_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'user_type', 'professional',
        'completo', false,
        'passo_atual', 1,
        'missing', jsonb_build_array('professional_profile_inexistente')
      );
    END IF;

    v_completo := COALESCE(v_onboarding_completo, false);
    v_passo    := COALESCE(v_passo_db, 1);

    IF v_category_id IS NULL THEN v_missing := v_missing || 'categoria'; END IF;
    IF v_avatar_url IS NULL THEN v_missing := v_missing || 'foto_perfil'; END IF;
    IF v_description IS NULL OR LENGTH(TRIM(v_description)) < 20 THEN v_missing := v_missing || 'bio'; END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.kyc_submissions
       WHERE user_id = _user_id AND status IN ('approved', 'pending')
    ) INTO v_has_kyc;
    IF NOT v_has_kyc THEN v_missing := v_missing || 'kyc'; END IF;

    IF v_recipient_id IS NULL THEN v_missing := v_missing || 'dados_bancarios'; END IF;

    RETURN jsonb_build_object(
      'user_type',   'professional',
      'completo',    v_completo,
      'passo_atual', v_passo,
      'total_passos', 6,
      'missing',     to_jsonb(v_missing)
    );
  ELSE
    -- client
    SELECT (endereco_principal IS NOT NULL AND LENGTH(TRIM(endereco_principal)) > 0)
      INTO v_has_endereco
      FROM public.profiles WHERE user_id = _user_id;

    IF NOT COALESCE(v_has_endereco, false) THEN v_missing := v_missing || 'endereco_principal'; END IF;

    v_completo := COALESCE(v_has_endereco, false);
    v_passo    := CASE WHEN v_completo THEN 3 ELSE 2 END;

    RETURN jsonb_build_object(
      'user_type',   'client',
      'completo',    v_completo,
      'passo_atual', v_passo,
      'total_passos', 3,
      'missing',     to_jsonb(v_missing)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fixr_get_onboarding_state(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. Marca onboarding do pro como concluído (passo 6 finalizado)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_complete_pro_onboarding(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden: can only complete own onboarding';
  END IF;

  UPDATE public.professional_profiles
     SET onboarding_completo     = true,
         onboarding_passo_atual  = 6,
         onboarding_concluido_em = now(),
         updated_at              = now()
   WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fixr_complete_pro_onboarding(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. Atualiza o passo atual do wizard (1..6)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_set_pro_onboarding_step(_user_id UUID, _step INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _step < 1 OR _step > 6 THEN
    RAISE EXCEPTION 'invalid step %', _step;
  END IF;

  UPDATE public.professional_profiles
     SET onboarding_passo_atual = _step,
         updated_at             = now()
   WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fixr_set_pro_onboarding_step(UUID, INT) TO authenticated;
