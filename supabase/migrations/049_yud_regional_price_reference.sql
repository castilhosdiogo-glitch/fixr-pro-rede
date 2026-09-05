-- ============================================================
-- 049_yud_regional_price_reference.sql
-- YUD may provide regional reference prices as decision support.
-- The professional's own price and the negotiated price remain distinct.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.regional_service_price_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL,
  city TEXT,
  state TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (char_length(currency) = 3),
  sample_size INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  p25_cents INTEGER CHECK (p25_cents IS NULL OR p25_cents >= 0),
  median_cents INTEGER CHECK (median_cents IS NULL OR median_cents >= 0),
  p75_cents INTEGER CHECK (p75_cents IS NULL OR p75_cents >= 0),
  source TEXT NOT NULL DEFAULT 'yud_transactions',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT regional_price_percentile_order CHECK (
    (p25_cents IS NULL OR median_cents IS NULL OR p25_cents <= median_cents)
    AND (median_cents IS NULL OR p75_cents IS NULL OR median_cents <= p75_cents)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_regional_price_reference_scope
  ON public.regional_service_price_reference(
    category_id,
    COALESCE(lower(city), '*'),
    COALESCE(upper(state), '*'),
    upper(currency)
  );

CREATE INDEX IF NOT EXISTS idx_regional_price_reference_lookup
  ON public.regional_service_price_reference(category_id, state, city, computed_at DESC);

ALTER TABLE public.regional_service_price_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regional price reference read" ON public.regional_service_price_reference;
CREATE POLICY "regional price reference read"
  ON public.regional_service_price_reference FOR SELECT
  USING (true);

-- No authenticated INSERT/UPDATE/DELETE policies are created. Reference data
-- is computed/imported by governed server processes, never edited by agents.

CREATE OR REPLACE FUNCTION public.yud_get_price_reference(
  p_category_id TEXT,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL
)
RETURNS TABLE (
  category_id TEXT,
  city TEXT,
  state TEXT,
  currency TEXT,
  sample_size INTEGER,
  p25_cents INTEGER,
  median_cents INTEGER,
  p75_cents INTEGER,
  computed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.category_id,
    r.city,
    r.state,
    r.currency,
    r.sample_size,
    r.p25_cents,
    r.median_cents,
    r.p75_cents,
    r.computed_at
  FROM public.regional_service_price_reference r
  WHERE r.category_id = p_category_id
    AND (
      (p_city IS NOT NULL AND p_state IS NOT NULL
        AND lower(r.city) = lower(p_city) AND upper(r.state) = upper(p_state))
      OR (p_state IS NOT NULL AND r.city IS NULL AND upper(r.state) = upper(p_state))
      OR (r.city IS NULL AND r.state IS NULL)
    )
  ORDER BY
    CASE
      WHEN p_city IS NOT NULL AND p_state IS NOT NULL
        AND lower(r.city) = lower(p_city) AND upper(r.state) = upper(p_state) THEN 1
      WHEN p_state IS NOT NULL AND r.city IS NULL AND upper(r.state) = upper(p_state) THEN 2
      ELSE 3
    END,
    r.computed_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.yud_get_price_reference(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.yud_get_price_reference(TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.regional_service_price_reference IS
  'Aggregated regional service price guidance. Reference price does not override professional or negotiated price.';
