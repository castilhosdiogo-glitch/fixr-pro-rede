-- ============================================================
-- 030_fixr_onboarding.sql
-- Tacada 1 — Onboarding Fixr (gate + colunas + RPCs)
--
-- Objetivo: pros incompletos não entram em dispatch; clientes têm
-- endereço principal; wizard controla passo atual e conclusão.
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
-- 3. Backfill: pros que já existem e têm bio + bank_info ficam completos
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

-- ────────────────────────────────────────────────────────────
-- 4. Gate em dispatch_broadcast_request
--    Só pros com onboarding_completo entram no leilão.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION dispatch_broadcast_request(p_broadcast_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_client_id    UUID;
  v_category_id  TEXT;
  v_city         TEXT;
  v_round        INT;
  v_cfg          RECORD;
  v_batch_limit  INT;
  v_window       INTERVAL;
  v_excluded     UUID[];
  v_selected     UUID[];
BEGIN
  SELECT br.client_id, br.category_id, br.city, br.current_round
  INTO v_client_id, v_category_id, v_city, v_round
  FROM broadcast_requests br
  WHERE br.id = p_broadcast_id
    AND br.status IN ('dispatching', 'expanding');

  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_cfg FROM matching_config WHERE id = 'default';

  v_window := (v_cfg.response_window_minutes || ' minutes')::INTERVAL;
  v_batch_limit := CASE WHEN v_round = 1
    THEN v_cfg.dispatch_limit
    ELSE v_cfg.expansion_batch_size
  END;

  SELECT ARRAY_AGG(rd.professional_id) INTO v_excluded
  FROM request_dispatches rd
  WHERE rd.broadcast_id = p_broadcast_id;

  SELECT ARRAY_AGG(sub.user_id)
  INTO v_selected
  FROM (
    SELECT
      pp.user_id,
      _score_professional(pp.user_id, v_category_id, v_city) AS score
    FROM professional_profiles pp
    JOIN profiles pr ON pr.user_id = pp.user_id
    LEFT JOIN professional_metrics pm ON pm.user_id = pp.user_id
    WHERE pp.category_id = v_category_id
      AND pp.user_id != v_client_id
      AND (v_excluded IS NULL OR pp.user_id != ALL(v_excluded))
      AND COALESCE(pm.concurrent_active, 0) < v_cfg.max_concurrent_per_pro
      AND COALESCE(pp.onboarding_completo, false) = true
      AND COALESCE(pp.nivel_curadoria, 'fixr_explorador') != 'fixr_restrito'
      AND (pp.bloqueado_ate IS NULL OR pp.bloqueado_ate < now())
    ORDER BY score DESC
    LIMIT v_batch_limit
  ) sub;

  IF v_selected IS NULL OR array_length(v_selected, 1) = 0 THEN
    UPDATE broadcast_requests
    SET status = 'expired', updated_at = now()
    WHERE id = p_broadcast_id;
    RETURN;
  END IF;

  INSERT INTO request_dispatches (broadcast_id, professional_id, round, score, expires_at)
  SELECT
    p_broadcast_id,
    u,
    v_round,
    _score_professional(u, v_category_id, v_city),
    now() + v_window
  FROM UNNEST(v_selected) AS u;

  INSERT INTO professional_metrics (user_id, concurrent_active, last_dispatched_at, total_dispatched, updated_at)
  SELECT u, 1, now(), 1, now() FROM UNNEST(v_selected) AS u
  ON CONFLICT (user_id) DO UPDATE SET
    concurrent_active  = professional_metrics.concurrent_active + 1,
    last_dispatched_at = EXCLUDED.last_dispatched_at,
    total_dispatched   = professional_metrics.total_dispatched + 1,
    updated_at         = EXCLUDED.updated_at;

  RETURN QUERY SELECT UNNEST(v_selected);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: estado do onboarding (usado pelo hook no front)
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
-- 6. RPC: marca onboarding concluído (pro)
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
-- 7. RPC: atualiza passo atual (pro)
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
