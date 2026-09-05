-- ============================================================
-- 044_yud_service_network_core.sql
-- Agent-native service infrastructure layered on the existing
-- Fixr/YUD marketplace schema without breaking legacy flows.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Agent identities and channel bindings
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('customer', 'professional', 'external', 'system')),
  provider TEXT NOT NULL,
  external_subject TEXT,
  display_name TEXT,
  default_channel TEXT NOT NULL DEFAULT 'api'
    CHECK (default_channel IN ('whatsapp', 'web', 'api', 'internal', 'other')),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_identity_provider_subject
  ON public.agent_identities(provider, external_subject)
  WHERE external_subject IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_identity_owner
  ON public.agent_identities(owner_user_id);

CREATE TABLE IF NOT EXISTS public.agent_channel_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agent_identities(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'web', 'api', 'internal', 'other')),
  external_id TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_channel_agent
  ON public.agent_channel_bindings(agent_id);

-- ------------------------------------------------------------
-- 2. Machine-readable professional service graph
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.service_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  min_price_cents INTEGER CHECK (min_price_cents IS NULL OR min_price_cents >= 0),
  max_price_cents INTEGER CHECK (max_price_cents IS NULL OR max_price_cents >= 0),
  pricing_unit TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_capability_price_range_check
    CHECK (
      min_price_cents IS NULL OR max_price_cents IS NULL OR min_price_cents <= max_price_cents
    )
);

CREATE INDEX IF NOT EXISTS idx_service_capabilities_category_active
  ON public.service_capabilities(category_id, active)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_service_capabilities_professional
  ON public.service_capabilities(professional_id);

CREATE TABLE IF NOT EXISTS public.professional_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'blocked', 'tentative', 'booked')),
  source TEXT NOT NULL DEFAULT 'manual',
  recurrence_rule TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT professional_availability_range_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_professional_availability_lookup
  ON public.professional_availability(professional_id, starts_at, ends_at, status);

-- ------------------------------------------------------------
-- 3. Canonical agent-native service requests
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_agent_id UUID REFERENCES public.agent_identities(id) ON DELETE SET NULL,
  legacy_broadcast_id UUID REFERENCES public.broadcast_requests(id) ON DELETE SET NULL,
  category_id TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT,
  state TEXT,
  address_text TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  urgency TEXT NOT NULL DEFAULT 'week'
    CHECK (urgency IN ('today', 'week', 'flexible')),
  desired_start TIMESTAMPTZ,
  desired_end TIMESTAMPTZ,
  budget_min_cents INTEGER CHECK (budget_min_cents IS NULL OR budget_min_cents >= 0),
  budget_max_cents INTEGER CHECK (budget_max_cents IS NULL OR budget_max_cents >= 0),
  hard_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  soft_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_channel TEXT NOT NULL DEFAULT 'api'
    CHECK (source_channel IN ('whatsapp', 'web', 'api', 'internal', 'other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'discovery', 'matching', 'negotiating', 'proposed',
      'accepted', 'scheduled', 'in_progress', 'completed',
      'cancelled', 'expired', 'disputed'
    )),
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_service_request_budget_check
    CHECK (
      budget_min_cents IS NULL OR budget_max_cents IS NULL OR budget_min_cents <= budget_max_cents
    ),
  CONSTRAINT agent_service_request_time_check
    CHECK (
      desired_start IS NULL OR desired_end IS NULL OR desired_start <= desired_end
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_service_request_idempotency
  ON public.agent_service_requests(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_agent_service_request_client
  ON public.agent_service_requests(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_service_request_category_status
  ON public.agent_service_requests(category_id, status, created_at DESC);

-- ------------------------------------------------------------
-- 4. Quotes, bounded negotiation authority and transactions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_negotiation_authority (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.agent_service_requests(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agent_identities(id) ON DELETE CASCADE,
  may_auto_accept BOOLEAN NOT NULL DEFAULT false,
  max_customer_price_cents INTEGER,
  min_professional_price_cents INTEGER,
  allowed_start TIMESTAMPTZ,
  allowed_end TIMESTAMPTZ,
  requires_human_approval_for_cancel BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, agent_id),
  CONSTRAINT negotiation_customer_price_check
    CHECK (max_customer_price_cents IS NULL OR max_customer_price_cents >= 0),
  CONSTRAINT negotiation_professional_price_check
    CHECK (min_professional_price_cents IS NULL OR min_professional_price_cents >= 0),
  CONSTRAINT negotiation_time_check
    CHECK (allowed_start IS NULL OR allowed_end IS NULL OR allowed_start <= allowed_end)
);

CREATE TABLE IF NOT EXISTS public.agent_service_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.agent_service_requests(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_agent_id UUID REFERENCES public.agent_identities(id) ON DELETE SET NULL,
  parent_quote_id UUID REFERENCES public.agent_service_quotes(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (char_length(currency) = 3),
  proposed_start TIMESTAMPTZ,
  proposed_end TIMESTAMPTZ,
  terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'countered', 'accepted', 'rejected', 'expired', 'withdrawn')),
  valid_until TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quote_time_check
    CHECK (proposed_start IS NULL OR proposed_end IS NULL OR proposed_start <= proposed_end)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_service_quote_idempotency
  ON public.agent_service_quotes(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_agent_service_quotes_request
  ON public.agent_service_quotes(request_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_service_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.agent_service_requests(id) ON DELETE RESTRICT,
  accepted_quote_id UUID REFERENCES public.agent_service_quotes(id) ON DELETE SET NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  legacy_service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  agreed_amount_cents INTEGER NOT NULL CHECK (agreed_amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (char_length(currency) = 3),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('accepted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'disputed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id),
  CONSTRAINT transaction_time_check
    CHECK (scheduled_start IS NULL OR scheduled_end IS NULL OR scheduled_start <= scheduled_end)
);

CREATE INDEX IF NOT EXISTS idx_agent_transactions_professional
  ON public.agent_service_transactions(professional_id, status, created_at DESC);

-- ------------------------------------------------------------
-- 5. Audit trail for consequential agent actions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agent_identities(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  input_hash TEXT,
  decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  authorization_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_action_audit_resource
  ON public.agent_action_audit(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_action_audit_agent
  ON public.agent_action_audit(agent_id, created_at DESC);

-- ------------------------------------------------------------
-- 6. Discovery RPC — deterministic hard filtering + legacy score
--    External agents should reach this through a governed Edge/API
--    layer, not direct anonymous database access.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.yud_discover_professionals(
  p_category_id TEXT,
  p_city TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  professional_id UUID,
  full_name TEXT,
  category_id TEXT,
  category_name TEXT,
  rating NUMERIC,
  verified BOOLEAN,
  distance_km NUMERIC,
  match_score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.user_id AS professional_id,
    pr.full_name,
    pp.category_id,
    pp.category_name,
    COALESCE(pp.rating, 0) AS rating,
    COALESCE(pp.verified, false) AS verified,
    CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
       AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
      THEN public._haversine_km(pp.latitude, pp.longitude, p_latitude, p_longitude)
      ELSE NULL
    END AS distance_km,
    COALESCE(
      public._score_professional(
        pp.user_id,
        p_category_id,
        COALESCE(p_city, pr.city, ''),
        p_latitude,
        p_longitude
      ),
      0
    ) AS match_score
  FROM public.professional_profiles pp
  JOIN public.profiles pr ON pr.user_id = pp.user_id
  WHERE pp.category_id = p_category_id
    AND COALESCE(pp.disponivel, true) = true
    AND COALESCE(pp.onboarding_completo, false) = true
    AND COALESCE(pp.nivel_curadoria, 'fixr_explorador') != 'fixr_restrito'
    AND (pp.bloqueado_ate IS NULL OR pp.bloqueado_ate < now())
    AND (
      p_city IS NULL OR pr.city = p_city
      OR (
        p_latitude IS NOT NULL AND p_longitude IS NOT NULL
        AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
        AND public._haversine_km(pp.latitude, pp.longitude, p_latitude, p_longitude)
          <= COALESCE(pp.raio_km, 10)::NUMERIC
      )
    )
  ORDER BY match_score DESC, rating DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.yud_discover_professionals(TEXT, TEXT, NUMERIC, NUMERIC, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.yud_discover_professionals(TEXT, TEXT, NUMERIC, NUMERIC, INTEGER) TO authenticated;

-- ------------------------------------------------------------
-- 7. RLS — human ownership; external agents remain server-mediated
-- ------------------------------------------------------------

ALTER TABLE public.agent_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_channel_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_negotiation_authority ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_service_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_service_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent identity owner read" ON public.agent_identities;
CREATE POLICY "agent identity owner read"
  ON public.agent_identities FOR SELECT
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "agent identity owner insert" ON public.agent_identities;
CREATE POLICY "agent identity owner insert"
  ON public.agent_identities FOR INSERT
  WITH CHECK (owner_user_id = auth.uid() AND kind IN ('customer', 'professional'));

DROP POLICY IF EXISTS "agent identity owner update" ON public.agent_identities;
CREATE POLICY "agent identity owner update"
  ON public.agent_identities FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "channel binding owner manage" ON public.agent_channel_bindings;
CREATE POLICY "channel binding owner manage"
  ON public.agent_channel_bindings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agent_identities ai
    WHERE ai.id = agent_id AND ai.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_identities ai
    WHERE ai.id = agent_id AND ai.owner_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "capabilities public read active" ON public.service_capabilities;
CREATE POLICY "capabilities public read active"
  ON public.service_capabilities FOR SELECT
  USING (active = true OR professional_id = auth.uid());

DROP POLICY IF EXISTS "professional manages capabilities" ON public.service_capabilities;
CREATE POLICY "professional manages capabilities"
  ON public.service_capabilities FOR ALL
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "professional manages availability" ON public.professional_availability;
CREATE POLICY "professional manages availability"
  ON public.professional_availability FOR ALL
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "client manages own agent requests" ON public.agent_service_requests;
CREATE POLICY "client manages own agent requests"
  ON public.agent_service_requests FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "request parties view negotiation authority" ON public.agent_negotiation_authority;
CREATE POLICY "request parties view negotiation authority"
  ON public.agent_negotiation_authority FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.agent_service_requests r
      WHERE r.id = request_id AND r.client_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.agent_identities ai
      WHERE ai.id = agent_id AND ai.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agent owner manages negotiation authority" ON public.agent_negotiation_authority;
CREATE POLICY "agent owner manages negotiation authority"
  ON public.agent_negotiation_authority FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agent_identities ai
    WHERE ai.id = agent_id AND ai.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_identities ai
    WHERE ai.id = agent_id AND ai.owner_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "quote parties read" ON public.agent_service_quotes;
CREATE POLICY "quote parties read"
  ON public.agent_service_quotes FOR SELECT
  USING (
    professional_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agent_service_requests r
      WHERE r.id = request_id AND r.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "professional creates quotes" ON public.agent_service_quotes;
CREATE POLICY "professional creates quotes"
  ON public.agent_service_quotes FOR INSERT
  WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "professional updates own quotes" ON public.agent_service_quotes;
CREATE POLICY "professional updates own quotes"
  ON public.agent_service_quotes FOR UPDATE
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

DROP POLICY IF EXISTS "transaction parties read" ON public.agent_service_transactions;
CREATE POLICY "transaction parties read"
  ON public.agent_service_transactions FOR SELECT
  USING (client_id = auth.uid() OR professional_id = auth.uid());

-- Mutations of canonical transactions and audit records are deliberately
-- server-mediated. service_role bypasses RLS; authenticated users receive
-- no direct write policy here.

COMMENT ON TABLE public.agent_identities IS
  'Authenticated/scoped identities for first-party and BYOA agents. External agents are provisioned server-side.';
COMMENT ON TABLE public.service_capabilities IS
  'Machine-readable professional service supply. Evolves the profile-page model into a service graph.';
COMMENT ON TABLE public.agent_service_requests IS
  'Canonical structured service demand produced by WhatsApp, web or external agents.';
COMMENT ON TABLE public.agent_action_audit IS
  'Append-only audit evidence for consequential agent actions; writes are server-mediated.';
