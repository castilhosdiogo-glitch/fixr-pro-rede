-- ============================================================
-- 047_yud_request_candidates.sql
-- Persist discovery/matching decisions so professional access is explicit,
-- auditable and not based on knowing/guessing a request UUID.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_request_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.agent_service_requests(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank > 0),
  match_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'viewed', 'responded', 'declined', 'expired')),
  match_reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_request_candidates_professional
  ON public.agent_request_candidates(professional_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_request_candidates_request
  ON public.agent_request_candidates(request_id, rank);

ALTER TABLE public.agent_request_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidate client reads" ON public.agent_request_candidates;
CREATE POLICY "candidate client reads"
  ON public.agent_request_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.agent_service_requests r
      WHERE r.id = agent_request_candidates.request_id
        AND r.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "candidate professional reads own" ON public.agent_request_candidates;
CREATE POLICY "candidate professional reads own"
  ON public.agent_request_candidates FOR SELECT
  USING (professional_id = auth.uid());

-- Matching writes are intentionally server-mediated. Professionals may update
-- only their own response state, and only to states they control.
DROP POLICY IF EXISTS "candidate professional updates own response" ON public.agent_request_candidates;
CREATE POLICY "candidate professional updates own response"
  ON public.agent_request_candidates FOR UPDATE
  USING (professional_id = auth.uid())
  WITH CHECK (
    professional_id = auth.uid()
    AND status IN ('viewed', 'responded', 'declined')
  );

-- Professionals can read a service request only after the matching layer has
-- explicitly selected them as a candidate.
DROP POLICY IF EXISTS "matched professional reads request" ON public.agent_service_requests;
CREATE POLICY "matched professional reads request"
  ON public.agent_service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.agent_request_candidates c
      WHERE c.request_id = agent_service_requests.id
        AND c.professional_id = auth.uid()
    )
  );

-- Tighten quote creation: having a professional profile is not enough. The
-- professional must have been explicitly selected for that request.
DROP POLICY IF EXISTS "professional creates quotes" ON public.agent_service_quotes;
CREATE POLICY "professional creates quotes"
  ON public.agent_service_quotes FOR INSERT
  WITH CHECK (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.agent_request_candidates c
      WHERE c.request_id = agent_service_quotes.request_id
        AND c.professional_id = auth.uid()
        AND c.status NOT IN ('declined', 'expired')
    )
  );

CREATE OR REPLACE FUNCTION public.yud_match_request(
  p_request_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.agent_service_requests%ROWTYPE;
  v_count INTEGER := 0;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
BEGIN
  SELECT *
    INTO v_request
  FROM public.agent_service_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  IF v_request.status IN ('accepted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'expired', 'disputed') THEN
    RAISE EXCEPTION 'REQUEST_NOT_MATCHABLE';
  END IF;

  WITH ranked AS (
    SELECT
      d.professional_id,
      d.match_score,
      d.distance_km,
      row_number() OVER (
        ORDER BY d.match_score DESC, d.rating DESC, d.professional_id
      )::INTEGER AS candidate_rank
    FROM public.yud_discover_professionals(
      v_request.category_id,
      v_request.city,
      v_request.latitude,
      v_request.longitude,
      v_limit
    ) d
  ), upserted AS (
    INSERT INTO public.agent_request_candidates (
      request_id,
      professional_id,
      rank,
      match_score,
      status,
      match_reasons
    )
    SELECT
      p_request_id,
      ranked.professional_id,
      ranked.candidate_rank,
      ranked.match_score,
      'pending',
      jsonb_build_object(
        'distance_km', ranked.distance_km,
        'source', 'yud_discover_professionals'
      )
    FROM ranked
    ON CONFLICT (request_id, professional_id)
    DO UPDATE SET
      rank = EXCLUDED.rank,
      match_score = EXCLUDED.match_score,
      match_reasons = EXCLUDED.match_reasons,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upserted;

  UPDATE public.agent_service_requests
    SET status = CASE WHEN v_count > 0 THEN 'matching' ELSE 'discovery' END,
        updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'request_id', p_request_id,
    'candidate_count', v_count,
    'status', CASE WHEN v_count > 0 THEN 'matching' ELSE 'discovery' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.yud_match_request(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.yud_match_request(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.yud_match_request(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.yud_match_request(UUID, INTEGER) TO service_role;

COMMENT ON TABLE public.agent_request_candidates IS
  'Persisted matching decisions between a service request and eligible professionals.';
COMMENT ON FUNCTION public.yud_match_request(UUID, INTEGER) IS
  'Server-only deterministic matching that persists candidate access for later notification/quote flows.';
