-- ============================================================
-- 048_yud_service_network_rls_hardening.sql
-- Canonical transaction state must not be mutable directly from a browser
-- session. Human users can create/read their own demand, while consequential
-- state changes remain behind governed server operations.
-- ============================================================

-- ------------------------------------------------------------
-- Service requests: client may INSERT and SELECT, not arbitrarily UPDATE/DELETE.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "client manages own agent requests" ON public.agent_service_requests;

DROP POLICY IF EXISTS "client reads own agent requests" ON public.agent_service_requests;
CREATE POLICY "client reads own agent requests"
  ON public.agent_service_requests FOR SELECT
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "client creates own agent requests" ON public.agent_service_requests;
CREATE POLICY "client creates own agent requests"
  ON public.agent_service_requests FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND (
      requester_agent_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.agent_identities ai
        WHERE ai.id = requester_agent_id
          AND ai.owner_user_id = auth.uid()
          AND ai.status = 'active'
      )
    )
  );

-- ------------------------------------------------------------
-- Quotes: professional may submit a quote when matched, but canonical quote
-- mutation/withdrawal/acceptance is server-mediated.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "professional updates own quotes" ON public.agent_service_quotes;

-- ------------------------------------------------------------
-- Channel bindings: reading your own binding is fine; creating/changing a
-- verified external channel identity must go through a verification flow.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "channel binding owner manage" ON public.agent_channel_bindings;

DROP POLICY IF EXISTS "channel binding owner read" ON public.agent_channel_bindings;
CREATE POLICY "channel binding owner read"
  ON public.agent_channel_bindings FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.agent_identities ai
      WHERE ai.id = agent_id
        AND ai.owner_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.agent_service_requests IS
  'Canonical structured service demand. Direct authenticated writes are limited to creation; state mutation is server-mediated.';
COMMENT ON TABLE public.agent_channel_bindings IS
  'Verified external-channel bindings. Authenticated owners may read them; provisioning/mutation is server-mediated.';
