-- ============================================================
-- 025_fixr_curation.sql
-- Sistema de Curadoria Fixr — Fixr Score + níveis de curadoria
--
-- Tacada 1: schema + função de cálculo.
-- Tacadas seguintes: cron noturno, triggers de rebaixamento,
-- busca ranqueada, UI de badges, avaliação obrigatória bidirecional.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Colunas em professional_profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS fixr_score              NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel_curadoria         TEXT         NOT NULL DEFAULT 'fixr_explorador',
  ADD COLUMN IF NOT EXISTS select_conquistado_em   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS select_perdido_em       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_concluidos        INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_conclusao          NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_resposta_medio    INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputas_perdidas_90d   INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aval_consecutivas_5     INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_atualizado_em     TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'professional_profiles_nivel_curadoria_check'
  ) THEN
    ALTER TABLE public.professional_profiles
      ADD CONSTRAINT professional_profiles_nivel_curadoria_check
      CHECK (nivel_curadoria IN ('fixr_select','fixr_parceiro','fixr_explorador','fixr_restrito'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_fixr_score
  ON public.professional_profiles (fixr_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_nivel_curadoria
  ON public.professional_profiles (nivel_curadoria)
  WHERE nivel_curadoria <> 'fixr_restrito';

-- ────────────────────────────────────────────────────────────
-- 2. fixr_score_history — rastreia evolução
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fixr_score_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fixr_score            NUMERIC(5,2) NOT NULL,
  nivel_curadoria       TEXT         NOT NULL,
  components            JSONB        NOT NULL,
  trigger_reason        TEXT,
  calculated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_history_pro
  ON public.fixr_score_history (professional_user_id, calculated_at DESC);

ALTER TABLE public.fixr_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own score history" ON public.fixr_score_history;
CREATE POLICY "Own score history" ON public.fixr_score_history
  FOR SELECT USING (auth.uid() = professional_user_id);

DROP POLICY IF EXISTS "Admins read score history" ON public.fixr_score_history;
CREATE POLICY "Admins read score history" ON public.fixr_score_history
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 3. Helper: determinar nível de curadoria
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_determine_nivel(
  _score               NUMERIC,
  _plan_name           TEXT,
  _total_concluidos    INTEGER,
  _disputas_perdidas   INTEGER,
  _verified            BOOLEAN,
  _is_restrito         BOOLEAN  -- flag manual de admin
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _is_restrito OR _score < 40 THEN
    RETURN 'fixr_restrito';
  END IF;

  IF _score >= 85
     AND _plan_name = 'parceiro'
     AND _total_concluidos >= 50
     AND _disputas_perdidas = 0
     AND _verified = true
  THEN
    RETURN 'fixr_select';
  END IF;

  IF _score >= 65
     AND _plan_name = 'parceiro'
     AND _total_concluidos >= 10
  THEN
    RETURN 'fixr_parceiro';
  END IF;

  RETURN 'fixr_explorador';
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. Função principal: recalculate_fixr_score
--
-- Recalcula todos os componentes, grava em professional_profiles,
-- registra snapshot em fixr_score_history.
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

  -- Manual-restrito: admin pode setar nivel_curadoria='fixr_restrito' e esta
  -- função respeitará enquanto o flag não for limpo manualmente.
  v_is_restrito_manual := (v_nivel_old = 'fixr_restrito');

  -- ── 1) Avaliação média (peso 35%) ─────────────────────────
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

  -- ── 2) Taxa de conclusão (peso 25%) ───────────────────────
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
    -- Penalidade dobrada por cancelamento feito pelo profissional:
    v_taxa_conclusao := v_taxa_conclusao - ((v_cancel_by_pro::NUMERIC / v_aceitos) * 100);
    v_taxa_conclusao := GREATEST(0, LEAST(100, v_taxa_conclusao));
  END IF;
  v_score_conclusao := v_taxa_conclusao;

  -- ── 3) Tempo de resposta (peso 15%) ───────────────────────
  -- Proxy: média de (updated_at - created_at) em broadcast_responses
  -- aceitas pelo profissional. Se a tabela não existir ou não houver
  -- dados, score cai para 0 (como "sem resposta").
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

  -- ── 4) Histórico de disputas 90 dias (peso 15%) ───────────
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
  -- Penalidade extra quando há disputa perdida
  IF v_disp_perdidas_90d > 0 THEN
    v_score_disputas := GREATEST(0, v_score_disputas - 20);
  END IF;

  -- ── 5) Completude do perfil (peso 10%) ────────────────────
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

  -- ── 6) Avaliações consecutivas 5★ a partir da mais recente ────
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

  -- ── Score final ───────────────────────────────────────────
  v_final_score := ROUND(
      (v_score_avaliacao * 0.35)
    + (v_score_conclusao * 0.25)
    + (v_score_resposta  * 0.15)
    + (v_score_disputas  * 0.15)
    + (v_score_perfil    * 0.10),
    2
  );

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
-- 5. Helper: recalcular todos (uso em cron futuro)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalculate_all_fixr_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  r       RECORD;
BEGIN
  FOR r IN SELECT user_id FROM public.professional_profiles LOOP
    PERFORM public.recalculate_fixr_score(r.user_id, 'batch_cron');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 6. View: componentes atuais (para UI "por que meu score está assim")
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.fixr_score_components AS
SELECT
  pp.user_id,
  pp.fixr_score,
  pp.nivel_curadoria,
  pp.total_concluidos,
  pp.taxa_conclusao,
  pp.tempo_resposta_medio,
  pp.disputas_perdidas_90d,
  pp.aval_consecutivas_5,
  pp.score_atualizado_em,
  pp.select_conquistado_em,
  pp.select_perdido_em,
  (
    SELECT components
      FROM public.fixr_score_history h
     WHERE h.professional_user_id = pp.user_id
     ORDER BY h.calculated_at DESC
     LIMIT 1
  ) AS last_components
FROM public.professional_profiles pp;

GRANT SELECT ON public.fixr_score_components TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 7. Permissões (service_role chama via RPC; cron direto)
-- ────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.recalculate_fixr_score(UUID, TEXT)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_all_fixr_scores()           FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_fixr_score(UUID, TEXT)  TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_all_fixr_scores()        TO service_role;
