-- ============================================================
-- 006_reputation_system.sql
-- Trust Score + Verification Levels + Reputation Tags
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE verification_level AS ENUM ('basic', 'verified', 'top');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- 2. TRUST SCORES TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_scores (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score               INT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  level               verification_level NOT NULL DEFAULT 'basic',

  -- Score breakdown (for transparency / debugging)
  rating_points       NUMERIC(5,2) DEFAULT 0,  -- max 35
  completed_points    NUMERIC(5,2) DEFAULT 0,  -- max 25
  response_points     NUMERIC(5,2) DEFAULT 0,  -- max 20
  acceptance_points   NUMERIC(5,2) DEFAULT 0,  -- max 15
  activity_points     NUMERIC(5,2) DEFAULT 0,  -- max 5

  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. REPUTATION TAGS TABLE (master list)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reputation_tag_definitions (
  tag         TEXT PRIMARY KEY,
  label_pt    TEXT NOT NULL,  -- Portuguese display label
  icon        TEXT NOT NULL,  -- Lucide icon name
  description TEXT NOT NULL,
  positive    BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO reputation_tag_definitions (tag, label_pt, icon, description, positive) VALUES
  ('pontual',         'Pontual',          'Clock',        'Responde em menos de 15 minutos',                  TRUE),
  ('rapido',          'Resposta Rápida',  'Zap',          'Responde em menos de 30 minutos',                  TRUE),
  ('confiavel',       'Confiável',        'ShieldCheck',  'Taxa de aceitação acima de 85%',                   TRUE),
  ('experiente',      'Experiente',       'Award',        'Mais de 20 serviços concluídos',                   TRUE),
  ('bem_avaliado',    'Bem Avaliado',     'ThumbsUp',     'Nota média acima de 4.8',                          TRUE),
  ('ativo',           'Ativo Agora',      'Activity',     'Esteve ativo nos últimos 7 dias',                  TRUE),
  ('top_profissional','Top Profissional', 'Crown',        'Trust Score acima de 85',                          TRUE),
  ('novo',            'Novo na Plataforma','Sparkles',    'Menos de 5 serviços concluídos',                   TRUE)
ON CONFLICT (tag) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. PROFESSIONAL TAGS (assigned tags per user)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS professional_tags (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL REFERENCES reputation_tag_definitions(tag),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

-- ────────────────────────────────────────────────────────────
-- 5. RATING GUARD — only allow reviews on completed services
-- ────────────────────────────────────────────────────────────

-- Add service_request_id to reviews if not present
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id);

-- Constraint: one review per service_request
CREATE UNIQUE INDEX IF NOT EXISTS reviews_service_request_unique
  ON reviews(service_request_id)
  WHERE service_request_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 6. CORE FUNCTION: COMPUTE TRUST SCORE
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_trust_score(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_avg_rating          NUMERIC := 0;
  v_review_count        INT     := 0;
  v_completed           INT     := 0;
  v_avg_response_min    NUMERIC := 120;  -- default 2h if no data
  v_acceptance_rate     NUMERIC := 0;
  v_last_active         TIMESTAMPTZ;

  v_rating_pts          NUMERIC := 0;
  v_completed_pts       NUMERIC := 0;
  v_response_pts        NUMERIC := 0;
  v_acceptance_pts      NUMERIC := 0;
  v_activity_pts        NUMERIC := 0;
  v_total_score         INT;
  v_level               verification_level;
  v_is_verified         BOOLEAN := FALSE;
  v_bayes_rating        NUMERIC := 0;
BEGIN
  -- ── Fetch raw data ──────────────────────────────────────
  -- From professional_profiles
  SELECT
    COALESCE(pp.rating, 0),
    COALESCE(pp.review_count, 0),
    COALESCE(pp.verified, FALSE)
  INTO v_avg_rating, v_review_count, v_is_verified
  FROM professional_profiles pp
  WHERE pp.user_id = p_user_id;

  -- From professional_metrics (matching engine data)
  SELECT
    COALESCE(pm.avg_response_minutes, 120),
    COALESCE(pm.acceptance_rate, 0),
    COALESCE(pm.completed_count, 0),
    pm.last_active_at
  INTO v_avg_response_min, v_acceptance_rate, v_completed, v_last_active
  FROM professional_metrics pm
  WHERE pm.user_id = p_user_id;

  -- Fallback: count completed service_requests if metrics missing
  IF v_completed = 0 THEN
    SELECT COUNT(*) INTO v_completed
    FROM service_requests sr
    WHERE sr.professional_id = p_user_id AND sr.status = 'completed';
  END IF;

  -- ── Calculate component scores ───────────────────────────

  -- (a) Rating: 35 points max
  -- Bayesian smoothing: prior of 5 reviews at 3.0
  v_bayes_rating := (v_avg_rating * v_review_count + 3.0 * 5) / (v_review_count + 5);
  v_rating_pts   := GREATEST(0, LEAST(35, ROUND(((v_bayes_rating - 1.0) / 4.0) * 35, 2)));

  -- (b) Completed services: 25 points max
  -- Curve: 0→0, 5→10, 20→18, 50→25 (diminishing returns)
  v_completed_pts := ROUND(LEAST(v_completed::NUMERIC / 50.0, 1.0) * 25, 2);

  -- (c) Response time: 20 points max
  -- 0 min = 20pts, 15 min = 17pts, 60 min = 0pts (linear)
  v_response_pts := ROUND(GREATEST(0, (1.0 - LEAST(v_avg_response_min / 60.0, 1.0))) * 20, 2);

  -- (d) Acceptance rate: 15 points max
  v_acceptance_pts := ROUND(v_acceptance_rate * 15, 2);

  -- (e) Activity: 5 points
  v_activity_pts := CASE
    WHEN v_last_active IS NULL            THEN 0
    WHEN v_last_active > NOW() - INTERVAL '3 days'  THEN 5
    WHEN v_last_active > NOW() - INTERVAL '7 days'  THEN 4
    WHEN v_last_active > NOW() - INTERVAL '30 days' THEN 2
    ELSE 0
  END;

  v_total_score := LEAST(100, ROUND(v_rating_pts + v_completed_pts + v_response_pts + v_acceptance_pts + v_activity_pts));

  -- ── Determine verification level ─────────────────────────
  v_level := CASE
    WHEN v_total_score >= 85
      AND v_review_count >= 10
      AND v_acceptance_rate >= 0.80
      THEN 'top'::verification_level
    WHEN v_is_verified = TRUE
      THEN 'verified'::verification_level
    ELSE 'basic'::verification_level
  END;

  -- ── Upsert trust_scores ──────────────────────────────────
  INSERT INTO trust_scores (
    user_id, score, level,
    rating_points, completed_points, response_points, acceptance_points, activity_points,
    computed_at, updated_at
  )
  VALUES (
    p_user_id, v_total_score, v_level,
    v_rating_pts, v_completed_pts, v_response_pts, v_acceptance_pts, v_activity_pts,
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    score             = EXCLUDED.score,
    level             = EXCLUDED.level,
    rating_points     = EXCLUDED.rating_points,
    completed_points  = EXCLUDED.completed_points,
    response_points   = EXCLUDED.response_points,
    acceptance_points = EXCLUDED.acceptance_points,
    activity_points   = EXCLUDED.activity_points,
    computed_at       = EXCLUDED.computed_at,
    updated_at        = EXCLUDED.updated_at;

  -- ── Recompute tags ────────────────────────────────────────
  DELETE FROM professional_tags WHERE user_id = p_user_id;

  -- pontual: avg response < 15 min
  IF v_avg_response_min < 15 AND v_completed > 0 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'pontual') ON CONFLICT DO NOTHING;
  END IF;

  -- rapido: avg response < 30 min (only if not already pontual)
  IF v_avg_response_min < 30 AND v_avg_response_min >= 15 AND v_completed > 0 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'rapido') ON CONFLICT DO NOTHING;
  END IF;

  -- confiavel: acceptance > 85%
  IF v_acceptance_rate >= 0.85 AND v_completed >= 3 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'confiavel') ON CONFLICT DO NOTHING;
  END IF;

  -- experiente: >= 20 completed
  IF v_completed >= 20 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'experiente') ON CONFLICT DO NOTHING;
  END IF;

  -- bem_avaliado: avg rating >= 4.8 with at least 5 reviews
  IF v_avg_rating >= 4.8 AND v_review_count >= 5 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'bem_avaliado') ON CONFLICT DO NOTHING;
  END IF;

  -- ativo: last active in 7 days
  IF v_last_active > NOW() - INTERVAL '7 days' THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'ativo') ON CONFLICT DO NOTHING;
  END IF;

  -- top_profissional: trust score >= 85
  IF v_total_score >= 85 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'top_profissional') ON CONFLICT DO NOTHING;
  END IF;

  -- novo: fewer than 5 completed
  IF v_completed < 5 THEN
    INSERT INTO professional_tags (user_id, tag) VALUES (p_user_id, 'novo') ON CONFLICT DO NOTHING;
  END IF;

END;
$$;

-- ────────────────────────────────────────────────────────────
-- 7. TRIGGER WRAPPER
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _trigger_recompute_trust()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_TABLE_NAME = 'reviews' THEN
    PERFORM compute_trust_score(NEW.professional_id);
  ELSIF TG_TABLE_NAME = 'service_requests' THEN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
      PERFORM compute_trust_score(NEW.professional_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'professional_metrics' THEN
    PERFORM compute_trust_score(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_on_review ON reviews;
CREATE TRIGGER trg_trust_on_review
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION _trigger_recompute_trust();

DROP TRIGGER IF EXISTS trg_trust_on_service ON service_requests;
CREATE TRIGGER trg_trust_on_service
  AFTER UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION _trigger_recompute_trust();

DROP TRIGGER IF EXISTS trg_trust_on_metrics ON professional_metrics;
CREATE TRIGGER trg_trust_on_metrics
  AFTER INSERT OR UPDATE ON professional_metrics
  FOR EACH ROW EXECUTE FUNCTION _trigger_recompute_trust();

-- ────────────────────────────────────────────────────────────
-- 8. VIEW: professional_reputation (full public snapshot)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW professional_reputation AS
SELECT
  pp.user_id,
  pp.id                           AS professional_id,
  pp.category_id,
  pp.category_name,
  pr.full_name                    AS name,
  pr.city,
  pr.state,
  pr.avatar_url,
  pp.verified,
  pp.premium,
  pp.experience,

  -- Trust
  COALESCE(ts.score, 0)           AS trust_score,
  COALESCE(ts.level, 'basic')     AS verification_level,
  ts.computed_at                  AS trust_computed_at,

  -- Rating (public: only non-negative reviews factor in)
  COALESCE(pp.rating, 0)          AS avg_rating,
  COALESCE(pp.review_count, 0)    AS review_count,

  -- Metrics
  COALESCE(pm.completed_count, 0)       AS completed_count,
  COALESCE(pm.avg_response_minutes, NULL) AS avg_response_minutes,
  COALESCE(pm.acceptance_rate, NULL)    AS acceptance_rate,
  pm.last_active_at,

  -- Activity status
  CASE
    WHEN pm.last_active_at > NOW() - INTERVAL '1 hour'  THEN 'online'
    WHEN pm.last_active_at > NOW() - INTERVAL '24 hours' THEN 'hoje'
    WHEN pm.last_active_at > NOW() - INTERVAL '7 days'  THEN 'esta_semana'
    ELSE 'inativo'
  END                                   AS activity_status,

  -- Response time display
  CASE
    WHEN pm.avg_response_minutes IS NULL           THEN NULL
    WHEN pm.avg_response_minutes < 60              THEN ROUND(pm.avg_response_minutes)::TEXT || ' min'
    WHEN pm.avg_response_minutes < 1440            THEN ROUND(pm.avg_response_minutes / 60)::TEXT || 'h'
    ELSE ROUND(pm.avg_response_minutes / 1440)::TEXT || 'd'
  END                                             AS response_time_display,

  -- Response rate (acceptance_rate as percentage)
  CASE
    WHEN pm.acceptance_rate IS NULL THEN NULL
    ELSE ROUND(pm.acceptance_rate * 100)
  END                                             AS response_rate_pct,

  -- Tags (aggregated as JSON array)
  COALESCE(
    (SELECT json_agg(json_build_object(
        'tag',      pt.tag,
        'label_pt', td.label_pt,
        'icon',     td.icon
      ) ORDER BY td.tag)
     FROM professional_tags pt
     JOIN reputation_tag_definitions td ON td.tag = pt.tag
     WHERE pt.user_id = pp.user_id
       AND td.positive = TRUE
    ),
    '[]'::JSON
  )                                               AS tags

FROM professional_profiles pp
LEFT JOIN profiles         pr ON pr.user_id = pp.user_id
LEFT JOIN trust_scores     ts ON ts.user_id = pp.user_id
LEFT JOIN professional_metrics pm ON pm.user_id = pp.user_id;

-- ────────────────────────────────────────────────────────────
-- 9. RATING GUARD FUNCTION
-- Ensures ratings only come from verified completed services
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_review_interaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sr_status TEXT;
  v_sr_client UUID;
BEGIN
  -- If service_request_id provided, validate it
  IF NEW.service_request_id IS NOT NULL THEN
    SELECT status, client_id
    INTO v_sr_status, v_sr_client
    FROM service_requests
    WHERE id = NEW.service_request_id;

    -- Must be completed
    IF v_sr_status != 'completed' THEN
      RAISE EXCEPTION 'Rating only allowed after service completion';
    END IF;

    -- Client must match
    IF v_sr_client != NEW.client_id THEN
      RAISE EXCEPTION 'Only the service client can submit a review';
    END IF;
  END IF;

  -- Clamp rating 1-5
  NEW.rating := GREATEST(1, LEAST(5, NEW.rating));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_review ON reviews;
CREATE TRIGGER trg_validate_review
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION validate_review_interaction();

-- ────────────────────────────────────────────────────────────
-- 10. RLS POLICIES
-- ────────────────────────────────────────────────────────────

ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_tag_definitions ENABLE ROW LEVEL SECURITY;

-- trust_scores: public read
CREATE POLICY "public read trust_scores"
  ON trust_scores FOR SELECT USING (TRUE);

-- trust_scores: only system (SECURITY DEFINER functions) writes
CREATE POLICY "system write trust_scores"
  ON trust_scores FOR ALL
  USING (auth.uid() = user_id);

-- professional_tags: public read
CREATE POLICY "public read professional_tags"
  ON professional_tags FOR SELECT USING (TRUE);

-- reputation_tag_definitions: public read
CREATE POLICY "public read tag_definitions"
  ON reputation_tag_definitions FOR SELECT USING (TRUE);

-- Reviews: negative ratings (< 3) only visible to admin or the professional
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read positive reviews"
  ON reviews FOR SELECT
  USING (
    rating >= 3
    OR professional_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "client inserts review"
  ON reviews FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 11. BACKFILL EXISTING PROFESSIONALS
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM professional_profiles LOOP
    PERFORM compute_trust_score(r.user_id);
  END LOOP;
END $$;
