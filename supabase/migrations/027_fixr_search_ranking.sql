-- ============================================================
-- 027_fixr_search_ranking.sql
-- Tacada 3: algoritmo de busca + ranking com Fixr Score
--
-- Fórmula:
--   Position = (fixr_score × 0.50)
--            + (disponibilidade × 0.20)
--            + (proximidade × 0.15)
--            + (tempo_resposta × 0.15)
--
-- Regras fixas (aplicadas ANTES do score):
--   • fixr_select  → aparece primeiro
--   • fixr_parceiro → depois
--   • fixr_explorador → por último
--   • fixr_restrito → invisível na busca
--   • bloqueado_ate > now() → invisível
--   • disputa em aberto (open/in_review) → invisível
--   • select_suspendido_ate > now() → tratado como parceiro
--
-- Cliente de primeira vez: vê apenas fixr_select (máx. 3).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Helper: detecta se usuário é cliente de primeira vez
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_first_time_client(_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _client_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.service_requests
        WHERE client_id = _client_id
          AND status IN ('completed','in_progress','accepted')
     );
$$;

-- ────────────────────────────────────────────────────────────
-- 2. RPC principal: search_professionals
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_professionals(
  _category    TEXT    DEFAULT NULL,
  _city        TEXT    DEFAULT NULL,
  _query       TEXT    DEFAULT NULL,
  _client_id   UUID    DEFAULT NULL,
  _limit       INTEGER DEFAULT 50,
  _offset      INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                UUID,
  user_id           UUID,
  full_name         TEXT,
  avatar_url        TEXT,
  city              TEXT,
  state             TEXT,
  phone             TEXT,
  category_id       TEXT,
  category_name     TEXT,
  description       TEXT,
  experience        TEXT,
  rating            NUMERIC,
  review_count      INTEGER,
  verified          BOOLEAN,
  plan_name         TEXT,
  nivel_curadoria   TEXT,
  fixr_score        NUMERIC,
  final_position    NUMERIC,
  is_first_time     BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_time BOOLEAN := public.is_first_time_client(_client_id);
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      pp.id,
      pp.user_id,
      p.full_name,
      p.avatar_url,
      p.city,
      p.state,
      p.phone,
      pp.category_id,
      pp.category_name,
      pp.description,
      pp.experience,
      pp.rating,
      pp.review_count,
      pp.verified,
      pp.plan_name,
      -- Nível efetivo (Select suspenso vira parceiro)
      CASE
        WHEN pp.select_suspendido_ate IS NOT NULL
             AND pp.select_suspendido_ate > now()
             AND pp.nivel_curadoria = 'fixr_select'
          THEN 'fixr_parceiro'
        ELSE COALESCE(pp.nivel_curadoria, 'fixr_explorador')
      END AS nivel_eff,
      COALESCE(pp.fixr_score, 50) AS fixr_score,
      pp.tempo_resposta_medio,
      pp.bloqueado_ate,
      COALESCE(pp.search_boost, 0) AS search_boost
    FROM public.professional_profiles pp
    LEFT JOIN public.profiles p ON p.user_id = pp.user_id
    WHERE
      (_category IS NULL OR pp.category_id = _category)
      AND COALESCE(pp.nivel_curadoria, 'fixr_explorador') <> 'fixr_restrito'
      AND (pp.bloqueado_ate IS NULL OR pp.bloqueado_ate <= now())
      AND NOT EXISTS (
        SELECT 1 FROM public.disputes d
         JOIN public.service_requests sr ON sr.id = d.service_request_id
         WHERE sr.professional_id = pp.user_id
           AND d.status IN ('open','in_review')
      )
      AND (
        _query IS NULL
        OR p.full_name ILIKE '%' || _query || '%'
        OR pp.category_name ILIKE '%' || _query || '%'
        OR pp.description ILIKE '%' || _query || '%'
      )
  ),
  scored AS (
    SELECT
      b.*,
      -- disponibilidade: 100 se desbloqueado (já filtrado), mais boost para plano pago
      CASE
        WHEN b.plan_name = 'parceiro' THEN 100
        WHEN b.plan_name = 'explorador' THEN 70
        ELSE 85
      END AS score_disponibilidade,
      -- proximidade: 100 se mesma cidade, 50 mesmo estado, 25 outros
      CASE
        WHEN _city IS NULL THEN 75
        WHEN b.city IS NULL THEN 25
        WHEN LOWER(b.city) = LOWER(_city) THEN 100
        ELSE 40
      END AS score_proximidade,
      -- tempo de resposta: 100 se <= 30min, decai até 0 em 8h+
      CASE
        WHEN b.tempo_resposta_medio IS NULL THEN 60
        WHEN b.tempo_resposta_medio <= 30 THEN 100
        WHEN b.tempo_resposta_medio >= 480 THEN 0
        ELSE GREATEST(0, 100 - ((b.tempo_resposta_medio - 30) / 4.5))
      END AS score_tempo_resposta
    FROM base b
  ),
  ranked AS (
    SELECT
      s.*,
      CASE s.nivel_eff
        WHEN 'fixr_select'     THEN 3
        WHEN 'fixr_parceiro'   THEN 2
        WHEN 'fixr_explorador' THEN 1
        ELSE 0
      END AS nivel_rank,
      (
        s.fixr_score              * 0.50
        + s.score_disponibilidade * 0.20
        + s.score_proximidade     * 0.15
        + s.score_tempo_resposta  * 0.15
        + s.search_boost
      ) AS final_position
    FROM scored s
  )
  SELECT
    r.id, r.user_id, r.full_name, r.avatar_url, r.city, r.state, r.phone,
    r.category_id, r.category_name, r.description, r.experience,
    r.rating, r.review_count, r.verified, r.plan_name,
    r.nivel_eff AS nivel_curadoria,
    r.fixr_score,
    r.final_position,
    v_first_time AS is_first_time
  FROM ranked r
  WHERE
    -- Primeira vez: só Select, máx 3
    (NOT v_first_time OR r.nivel_eff = 'fixr_select')
  ORDER BY
    r.nivel_rank DESC,
    r.final_position DESC,
    r.rating DESC NULLS LAST
  LIMIT CASE WHEN v_first_time THEN LEAST(3, _limit) ELSE _limit END
  OFFSET _offset;
END;
$$;

REVOKE ALL ON FUNCTION public.search_professionals(TEXT, TEXT, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_professionals(TEXT, TEXT, TEXT, UUID, INTEGER, INTEGER) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_professionals IS
  'Busca profissionais com ranking Fixr Score. Primeira vez → apenas fixr_select (3 max).';

-- ────────────────────────────────────────────────────────────
-- 3. RPC: top_professionals (para landing page)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.top_professionals(_limit INTEGER DEFAULT 4)
RETURNS TABLE (
  id              UUID,
  user_id         UUID,
  full_name       TEXT,
  avatar_url      TEXT,
  city            TEXT,
  state           TEXT,
  phone           TEXT,
  category_id     TEXT,
  category_name   TEXT,
  description     TEXT,
  experience      TEXT,
  rating          NUMERIC,
  review_count    INTEGER,
  verified        BOOLEAN,
  plan_name       TEXT,
  nivel_curadoria TEXT,
  fixr_score      NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.id, pp.user_id,
    p.full_name, p.avatar_url, p.city, p.state, p.phone,
    pp.category_id, pp.category_name, pp.description, pp.experience,
    pp.rating, pp.review_count, pp.verified, pp.plan_name,
    COALESCE(pp.nivel_curadoria, 'fixr_explorador') AS nivel_curadoria,
    COALESCE(pp.fixr_score, 0) AS fixr_score
  FROM public.professional_profiles pp
  LEFT JOIN public.profiles p ON p.user_id = pp.user_id
  WHERE COALESCE(pp.nivel_curadoria, 'fixr_explorador') <> 'fixr_restrito'
    AND (pp.bloqueado_ate IS NULL OR pp.bloqueado_ate <= now())
  ORDER BY
    CASE COALESCE(pp.nivel_curadoria, 'fixr_explorador')
      WHEN 'fixr_select'     THEN 3
      WHEN 'fixr_parceiro'   THEN 2
      WHEN 'fixr_explorador' THEN 1
      ELSE 0
    END DESC,
    COALESCE(pp.fixr_score, 0) DESC,
    pp.rating DESC NULLS LAST
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.top_professionals(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.top_professionals(INTEGER) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.top_professionals IS
  'Top N profissionais para landing — ordenados por nível + Fixr Score.';
