-- ============================================================
-- 035_dispatch_decline_penalty.sql
-- Tacada 5 (Fixr Geo): penalidade -5 fixr_score por 3 recusas em 7 dias
--
-- • Coluna recusas_7d em professional_profiles (para UI e diagnóstico)
-- • recalculate_fixr_score calcula a contagem e aplica -5 se >= 3
-- • Trigger em request_dispatches dispara fixr_recalc_and_emit na recusa
-- • Evento 'too_many_declines' logado em curation_events (warning)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Coluna de diagnóstico
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS recusas_7d INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.professional_profiles.recusas_7d IS
  'Quantas recusas de dispatch nos últimos 7 dias. Atualizado em recalculate_fixr_score. Penalidade -5 aplicada quando >= 3.';

-- ────────────────────────────────────────────────────────────
-- 2. recalculate_fixr_score — adiciona penalidade por recusas
--
-- Mantém a lógica existente e injeta ao final:
--   - conta declines em request_dispatches nos últimos 7 dias
--   - grava em professional_profiles.recusas_7d
--   - se >= 3, subtrai 5 do score final (mínimo 0)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalculate_fixr_score(
  _professional_user_id UUID,
  _trigger_reason       TEXT DEFAULT 'manual'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_rating          NUMERIC := 0;
  v_review_count        INTEGER := 0;
  v_score_avaliacao     NUMERIC := 0;

  v_concluidos          INTEGER := 0;
  v_aceitos             INTEGER := 0;
  v_cancel_by_pro       INTEGER := 0;
  v_taxa_conclusao      NUMERIC := 0;
  v_score_conclusao     NUMERIC := 0;

  v_resposta_min        NUMERIC := 0;
  v_score_resposta      NUMERIC := 0;

  v_disp_perdidas_90d   INTEGER := 0;
  v_score_disputas      NUMERIC := 0;

  v_bio                 TEXT;
  v_verified            BOOLEAN;
  v_has_photo           BOOLEAN := false;
  v_has_portfolio       BOOLEAN := false;
  v_has_bank            BOOLEAN := false;
  v_score_perfil        NUMERIC := 0;

  v_plan_name           TEXT;
  v_is_restrito_manual  BOOLEAN := false;

  v_consec_5            INTEGER := 0;

  v_recusas_7d          INTEGER := 0;
  v_penalidade_recusas  NUMERIC := 0;

  v_final_score         NUMERIC := 0;
  v_nivel_old           TEXT;
  v_nivel_new           TEXT;
  v_now                 TIMESTAMPTZ := now();

  v_pp_id               UUID;
BEGIN
  SELECT pp.id, pp.description, pp.verified, pp.plan_name, pp.nivel_curadoria,
         (pp.pagarme_recipient_id IS NOT NULL)
    INTO v_pp_id, v_bio, v_verified, v_plan_name, v_nivel_old, v_has_bank
    FROM public.professional_profiles pp
   WHERE pp.user_id = _professional_user_id;

  IF v_pp_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_restrito_manual := (v_nivel_old = 'fixr_restrito');

  -- 1) Avaliação média (35%)
  SELECT COALESCE(AVG(rating), 0)::NUMERIC, COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM public.reviews
   WHERE professional_id = _professional_user_id;

  IF v_review_count < 10 THEN
    v_score_avaliacao := 0;
  ELSIF v_avg_rating >= 4.8 THEN
    v_score_avaliacao := 100;
  ELSIF v_avg_rating >= 4.0 THEN
    v_score_avaliacao := 80;
  ELSIF v_avg_rating >= 3.0 THEN
    v_score_avaliacao := 50;
  ELSE
    v_score_avaliacao := 0;
  END IF;

  -- 2) Taxa de conclusão (25%)
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status IN ('accepted','scheduled','completed','cancelled')),
    COUNT(*) FILTER (WHERE status = 'cancelled'
                       AND professional_id = _professional_user_id)
    INTO v_concluidos, v_aceitos, v_cancel_by_pro
    FROM public.service_requests
   WHERE professional_id = _professional_user_id;

  IF v_aceitos > 0 THEN
    v_taxa_conclusao := (v_concluidos::NUMERIC / v_aceitos) * 100;
    v_taxa_conclusao := v_taxa_conclusao - ((v_cancel_by_pro::NUMERIC / v_aceitos) * 100);
    v_taxa_conclusao := GREATEST(0, LEAST(100, v_taxa_conclusao));
  END IF;
  v_score_conclusao := v_taxa_conclusao;

  -- 3) Tempo de resposta (15%)
  BEGIN
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60), 0)
      INTO v_resposta_min
      FROM public.broadcast_responses
     WHERE professional_id = _professional_user_id
       AND status = 'accepted';
  EXCEPTION WHEN undefined_table THEN
    v_resposta_min := 0;
  END;

  IF v_resposta_min = 0 THEN
    v_score_resposta := 0;
  ELSIF v_resposta_min <= 30 THEN
    v_score_resposta := 100;
  ELSIF v_resposta_min <= 60 THEN
    v_score_resposta := 80;
  ELSIF v_resposta_min <= 120 THEN
    v_score_resposta := 60;
  ELSE
    v_score_resposta := 20;
  END IF;

  -- 4) Disputas perdidas 90d (15%)
  SELECT COUNT(*)
    INTO v_disp_perdidas_90d
    FROM public.disputes d
    JOIN public.service_requests sr ON sr.id = d.service_request_id
   WHERE sr.professional_id = _professional_user_id
     AND d.status = 'resolved_client'
     AND d.resolved_at >= (v_now - INTERVAL '90 days');

  v_score_disputas := CASE
    WHEN v_disp_perdidas_90d = 0 THEN 100
    WHEN v_disp_perdidas_90d = 1 THEN 70
    WHEN v_disp_perdidas_90d = 2 THEN 30
    ELSE 0
  END;
  IF v_disp_perdidas_90d > 0 THEN
    v_score_disputas := GREATEST(0, v_score_disputas - 20);
  END IF;

  -- 5) Completude (10%)
  SELECT (p.avatar_url IS NOT NULL AND p.avatar_url <> '')
    INTO v_has_photo
    FROM public.profiles p
   WHERE p.user_id = _professional_user_id;

  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.portfolio_items pi
       WHERE pi.professional_id = _professional_user_id
       LIMIT 1
    )
    INTO v_has_portfolio;
  EXCEPTION WHEN undefined_table THEN
    v_has_portfolio := false;
  END;

  v_score_perfil := 0;
  IF COALESCE(v_has_photo, false)                           THEN v_score_perfil := v_score_perfil + 20; END IF;
  IF v_bio IS NOT NULL AND LENGTH(TRIM(v_bio)) >= 20         THEN v_score_perfil := v_score_perfil + 20; END IF;
  IF v_has_portfolio                                         THEN v_score_perfil := v_score_perfil + 20; END IF;
  IF COALESCE(v_verified, false)                             THEN v_score_perfil := v_score_perfil + 20; END IF;
  IF COALESCE(v_has_bank, false)                             THEN v_score_perfil := v_score_perfil + 20; END IF;

  -- 6) 5★ consecutivas
  WITH last_reviews AS (
    SELECT rating, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
      FROM public.reviews
     WHERE professional_id = _professional_user_id
  ),
  first_break AS (
    SELECT MIN(rn) AS rn FROM last_reviews WHERE rating < 5
  )
  SELECT COALESCE(
    (SELECT rn - 1 FROM first_break),
    (SELECT COUNT(*) FROM last_reviews)
  )::INTEGER
    INTO v_consec_5;
  IF v_consec_5 IS NULL THEN v_consec_5 := 0; END IF;

  -- 7) Recusas de dispatch nos últimos 7 dias
  BEGIN
    SELECT COUNT(*)
      INTO v_recusas_7d
      FROM public.request_dispatches
     WHERE professional_id = _professional_user_id
       AND status          = 'declined'
       AND responded_at   >= (v_now - INTERVAL '7 days');
  EXCEPTION WHEN undefined_table THEN
    v_recusas_7d := 0;
  END;

  IF v_recusas_7d >= 3 THEN
    v_penalidade_recusas := 5;
  ELSE
    v_penalidade_recusas := 0;
  END IF;

  -- Score final com penalidade aplicada
  v_final_score := ROUND(
      (v_score_avaliacao * 0.35)
    + (v_score_conclusao * 0.25)
    + (v_score_resposta  * 0.15)
    + (v_score_disputas  * 0.15)
    + (v_score_perfil    * 0.10),
    2
  );
  v_final_score := GREATEST(0, v_final_score - v_penalidade_recusas);

  v_nivel_new := public.fixr_determine_nivel(
    v_final_score,
    v_plan_name,
    v_concluidos,
    v_disp_perdidas_90d,
    COALESCE(v_verified, false),
    v_is_restrito_manual
  );

  UPDATE public.professional_profiles SET
    fixr_score             = v_final_score,
    nivel_curadoria        = v_nivel_new,
    total_concluidos       = v_concluidos,
    taxa_conclusao         = v_taxa_conclusao,
    tempo_resposta_medio   = ROUND(v_resposta_min)::INTEGER,
    disputas_perdidas_90d  = v_disp_perdidas_90d,
    aval_consecutivas_5    = v_consec_5,
    recusas_7d             = v_recusas_7d,
    score_atualizado_em    = v_now,
    select_conquistado_em  = CASE
      WHEN v_nivel_new = 'fixr_select' AND v_nivel_old <> 'fixr_select'
        THEN v_now
      ELSE select_conquistado_em
    END,
    select_perdido_em      = CASE
      WHEN v_nivel_old = 'fixr_select' AND v_nivel_new <> 'fixr_select'
        THEN v_now
      ELSE select_perdido_em
    END
   WHERE id = v_pp_id;

  INSERT INTO public.fixr_score_history (
    professional_user_id, fixr_score, nivel_curadoria,
    components, trigger_reason, calculated_at
  ) VALUES (
    _professional_user_id, v_final_score, v_nivel_new,
    jsonb_build_object(
      'avaliacao_media',     v_avg_rating,
      'review_count',        v_review_count,
      'score_avaliacao',     v_score_avaliacao,
      'concluidos',          v_concluidos,
      'aceitos',             v_aceitos,
      'taxa_conclusao',      v_taxa_conclusao,
      'score_conclusao',     v_score_conclusao,
      'resposta_min',        v_resposta_min,
      'score_resposta',      v_score_resposta,
      'disputas_perdidas_90d', v_disp_perdidas_90d,
      'score_disputas',      v_score_disputas,
      'score_perfil',        v_score_perfil,
      'recusas_7d',          v_recusas_7d,
      'penalidade_recusas',  v_penalidade_recusas,
      'perfil_flags', jsonb_build_object(
        'foto',       COALESCE(v_has_photo, false),
        'bio',        (v_bio IS NOT NULL AND LENGTH(TRIM(v_bio)) >= 20),
        'portfolio',  v_has_portfolio,
        'verified',   COALESCE(v_verified, false),
        'bank',       COALESCE(v_has_bank, false)
      ),
      'nivel_anterior', v_nivel_old
    ),
    _trigger_reason,
    v_now
  );

  RETURN v_final_score;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Trigger em request_dispatches: recusa dispara recálculo
--
-- Aciona em transição para 'declined' (INSERT com status=declined
-- ou UPDATE de outro status para declined). Emite evento
-- 'too_many_declines' quando o threshold for cruzado na janela 7d.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_trg_dispatch_decline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_after INTEGER;
  v_already_logged_today BOOLEAN;
BEGIN
  IF NEW.status = 'declined'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'declined') THEN

    PERFORM public.fixr_recalc_and_emit(NEW.professional_id, 'dispatch_declined');

    -- Emite evento de alerta quando o padrão crítico (>=3/7d) é atingido.
    -- De-duplica: só loga se ainda não houver evento 'too_many_declines'
    -- nas últimas 24h para este pro.
    SELECT COUNT(*) INTO v_count_after
      FROM public.request_dispatches
     WHERE professional_id = NEW.professional_id
       AND status          = 'declined'
       AND responded_at   >= (now() - INTERVAL '7 days');

    IF v_count_after >= 3 THEN
      SELECT EXISTS (
        SELECT 1 FROM public.curation_events
         WHERE professional_user_id = NEW.professional_id
           AND event_type           = 'too_many_declines'
           AND created_at          >= (now() - INTERVAL '24 hours')
      ) INTO v_already_logged_today;

      IF NOT v_already_logged_today THEN
        INSERT INTO public.curation_events (
          professional_user_id, event_type, severity, reason, payload
        ) VALUES (
          NEW.professional_id, 'too_many_declines', 'warning',
          '3+ recusas em 7 dias — penalidade -5 aplicada no fixr_score',
          jsonb_build_object(
            'declines_7d',   v_count_after,
            'dispatch_id',   NEW.id,
            'broadcast_id',  NEW.broadcast_id
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_dispatch_decline ON public.request_dispatches;
CREATE TRIGGER trg_fixr_dispatch_decline
  AFTER INSERT OR UPDATE OF status ON public.request_dispatches
  FOR EACH ROW EXECUTE FUNCTION public._fixr_trg_dispatch_decline();

REVOKE ALL ON FUNCTION public._fixr_trg_dispatch_decline() FROM PUBLIC;

-- ────────────────────────────────────────────────────────────
-- 4. Backfill: recalcula recusas_7d para quem já tem recusas
-- ────────────────────────────────────────────────────────────

UPDATE public.professional_profiles pp
   SET recusas_7d = COALESCE((
     SELECT COUNT(*)
       FROM public.request_dispatches rd
      WHERE rd.professional_id = pp.user_id
        AND rd.status          = 'declined'
        AND rd.responded_at   >= (now() - INTERVAL '7 days')
   ), 0);
