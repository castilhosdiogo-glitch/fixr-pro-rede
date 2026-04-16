-- ============================================================
-- 033_geo_dispatch.sql
-- T1: Geolocalização no matching (raio + lat/lng + disponibilidade)
--
-- O scoring já existente (004) filtra por city match. Esta migration
-- adiciona distância real via Haversine, raio configurável por pro,
-- toggle de disponibilidade e campo de urgência no broadcast.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Colunas em professional_profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS latitude   NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude  NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS raio_km    INT     NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS disponivel BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pp_raio_km_check'
  ) THEN
    ALTER TABLE public.professional_profiles
      ADD CONSTRAINT pp_raio_km_check CHECK (raio_km BETWEEN 1 AND 50);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pp_disponivel
  ON public.professional_profiles (disponivel)
  WHERE disponivel = true;

CREATE INDEX IF NOT EXISTS idx_pp_geo
  ON public.professional_profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.professional_profiles.raio_km IS
  'Raio de atendimento em km (1-50). Padrão 10. Pros só recebem dispatch de clientes dentro desse raio.';
COMMENT ON COLUMN public.professional_profiles.disponivel IS
  'Toggle do pro. Quando false, não entra em dispatch (não recebe novos pedidos).';

-- ────────────────────────────────────────────────────────────
-- 2. Colunas em broadcast_requests
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.broadcast_requests
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS endereco  TEXT,
  ADD COLUMN IF NOT EXISTS urgencia  TEXT NOT NULL DEFAULT 'semana';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'br_urgencia_check'
  ) THEN
    ALTER TABLE public.broadcast_requests
      ADD CONSTRAINT br_urgencia_check CHECK (urgencia IN ('hoje', 'semana', 'sem_pressa'));
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Haversine (distância em km entre dois pontos lat/lng)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._haversine_km(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL::NUMERIC
    ELSE 6371.0 * 2 * ASIN(SQRT(
      POWER(SIN(RADIANS(lat2 - lat1) / 2), 2)
      + COS(RADIANS(lat1)) * COS(RADIANS(lat2))
        * POWER(SIN(RADIANS(lng2 - lng1) / 2), 2)
    ))
  END;
$$;

GRANT EXECUTE ON FUNCTION public._haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 4. _score_professional: aceita lat/lng do cliente
--    Nova assinatura (overload). A antiga continua existindo mas
--    é substituída abaixo com um DROP + CREATE pra evitar ambiguidade.
-- ────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public._score_professional(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public._score_professional(
  p_user_id      UUID,
  p_category_id  TEXT,
  p_client_city  TEXT,
  p_client_lat   NUMERIC DEFAULT NULL,
  p_client_lng   NUMERIC DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH
  cfg AS (
    SELECT * FROM matching_config WHERE id = 'default'
  ),
  pro AS (
    SELECT
      COALESCE(pp.rating, 3.0)                                AS rating,
      COALESCE(pp.plan, 'free')                               AS plan,
      COALESCE(pm.avg_response_minutes, 60.0)                 AS avg_resp,
      COALESCE(pm.acceptance_rate, 0.5)                       AS acc_rate,
      COALESCE(pm.completed_count, 0)                         AS completed,
      COALESCE(pm.last_active_at, now() - INTERVAL '30 days') AS last_active,
      pm.last_dispatched_at                                   AS last_dispatched_at,
      COALESCE(pr.city, '')                                   AS pro_city,
      pp.latitude                                             AS pro_lat,
      pp.longitude                                            AS pro_lng,
      COALESCE(pp.raio_km, 10)                                AS pro_raio
    FROM professional_profiles pp
    JOIN profiles pr ON pr.user_id = pp.user_id
    LEFT JOIN professional_metrics pm ON pm.user_id = pp.user_id
    WHERE pp.user_id = p_user_id
      AND pp.category_id = p_category_id
  )
  SELECT
    (
      cfg.weight_rating          * ((p.rating - 1.0) / 4.0)
      + cfg.weight_distance      * CASE
          WHEN p.pro_lat IS NOT NULL AND p.pro_lng IS NOT NULL
               AND p_client_lat IS NOT NULL AND p_client_lng IS NOT NULL THEN
            GREATEST(
              0.0,
              1.0 - (
                public._haversine_km(p.pro_lat, p.pro_lng, p_client_lat, p_client_lng)
                / GREATEST(p.pro_raio::NUMERIC, 1.0)
              )
            )
          WHEN p.pro_city = p_client_city THEN 1.0
          ELSE 0.3
        END
      + cfg.weight_response_time * (1.0 / (1.0 + p.avg_resp / 30.0))
      + cfg.weight_acceptance_rate * p.acc_rate
      + cfg.weight_completed     * (LN(1.0 + LEAST(p.completed::NUMERIC, 100.0)) / LN(101.0))
      + cfg.weight_activity      * EXP(
          -EXTRACT(EPOCH FROM (now() - p.last_active)) / (7.0 * 86400.0)
        )
      + cfg.weight_plan          * CASE p.plan
          WHEN 'premium' THEN 1.0
          WHEN 'basic'   THEN 0.6
          ELSE                0.2
        END
    )
    * CASE
        WHEN p.last_dispatched_at IS NULL THEN 1.0
        ELSE GREATEST(
          0.40,
          1.0 - 0.60 * EXP(
            -EXTRACT(EPOCH FROM (now() - p.last_dispatched_at))
            / (cfg.fairness_half_life_hours * 3600.0)
          )
        )
      END
    + CASE
        WHEN p.last_dispatched_at IS NULL                      THEN cfg.inactivity_boost_7d + 0.05
        WHEN now() - p.last_dispatched_at > INTERVAL '7 days'  THEN cfg.inactivity_boost_7d
        WHEN now() - p.last_dispatched_at > INTERVAL '3 days'  THEN cfg.inactivity_boost_3d
        WHEN now() - p.last_dispatched_at > INTERVAL '1 day'   THEN cfg.inactivity_boost_1d
        ELSE 0.0
      END
  FROM pro p
  CROSS JOIN cfg
$$;

GRANT EXECUTE ON FUNCTION public._score_professional(UUID, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. dispatch_broadcast_request: filtro por disponivel + raio
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.dispatch_broadcast_request(p_broadcast_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_client_id    UUID;
  v_category_id  TEXT;
  v_city         TEXT;
  v_round        INT;
  v_client_lat   NUMERIC;
  v_client_lng   NUMERIC;
  v_cfg          RECORD;
  v_batch_limit  INT;
  v_window       INTERVAL;
  v_excluded     UUID[];
  v_selected     UUID[];
BEGIN
  SELECT br.client_id, br.category_id, br.city, br.current_round, br.latitude, br.longitude
  INTO v_client_id, v_category_id, v_city, v_round, v_client_lat, v_client_lng
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
      public._score_professional(pp.user_id, v_category_id, v_city, v_client_lat, v_client_lng) AS score
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
      AND COALESCE(pp.disponivel, true) = true
      -- Filtro por raio: se pro e cliente têm coords, exige distância <= raio do pro
      AND (
        pp.latitude IS NULL OR pp.longitude IS NULL
        OR v_client_lat IS NULL OR v_client_lng IS NULL
        OR public._haversine_km(pp.latitude, pp.longitude, v_client_lat, v_client_lng)
           <= COALESCE(pp.raio_km, 10)::NUMERIC
      )
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
    public._score_professional(u, v_category_id, v_city, v_client_lat, v_client_lng),
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

GRANT EXECUTE ON FUNCTION public.dispatch_broadcast_request(UUID) TO authenticated;
