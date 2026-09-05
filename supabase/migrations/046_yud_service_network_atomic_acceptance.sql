-- ============================================================
-- 046_yud_service_network_atomic_acceptance.sql
-- 1. Seed the first machine-readable Service Graph from legacy profiles.
-- 2. Make consequential quote acceptance one database transaction.
-- ============================================================

-- A professional may ultimately expose many capabilities, but the legacy
-- profile currently provides one primary category. Keep that seed idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_capabilities_professional_category
  ON public.service_capabilities(professional_id, category_id);

INSERT INTO public.service_capabilities (
  professional_id,
  category_id,
  title,
  description,
  active,
  metadata
)
SELECT
  pp.user_id,
  pp.category_id,
  COALESCE(NULLIF(pp.category_name, ''), pp.category_id),
  NULL,
  COALESCE(pp.disponivel, true),
  jsonb_build_object('source', 'legacy_professional_profile')
FROM public.professional_profiles pp
WHERE pp.category_id IS NOT NULL
  AND pp.category_id <> ''
ON CONFLICT (professional_id, category_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.yud_accept_quote(
  p_request_id UUID,
  p_quote_id UUID,
  p_actor_user_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.agent_service_requests%ROWTYPE;
  v_quote public.agent_service_quotes%ROWTYPE;
  v_existing public.agent_service_transactions%ROWTYPE;
  v_transaction public.agent_service_transactions%ROWTYPE;
BEGIN
  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) < 8 THEN
    RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY';
  END IF;

  SELECT *
    INTO v_request
  FROM public.agent_service_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  IF v_request.client_id IS DISTINCT FROM p_actor_user_id THEN
    RAISE EXCEPTION 'REQUEST_OWNER_REQUIRED';
  END IF;

  SELECT *
    INTO v_existing
  FROM public.agent_service_transactions
  WHERE request_id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.accepted_quote_id = p_quote_id THEN
      RETURN jsonb_build_object(
        'transaction', to_jsonb(v_existing),
        'idempotent_replay', true
      );
    END IF;

    RAISE EXCEPTION 'REQUEST_ALREADY_ACCEPTED';
  END IF;

  IF v_request.status IN ('completed', 'cancelled', 'expired', 'disputed') THEN
    RAISE EXCEPTION 'REQUEST_NOT_ACCEPTABLE';
  END IF;

  SELECT *
    INTO v_quote
  FROM public.agent_service_quotes
  WHERE id = p_quote_id
    AND request_id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QUOTE_NOT_FOUND';
  END IF;

  IF v_quote.status NOT IN ('submitted', 'countered', 'accepted') THEN
    RAISE EXCEPTION 'QUOTE_NOT_ACCEPTABLE';
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < now() THEN
    UPDATE public.agent_service_quotes
      SET status = 'expired', updated_at = now()
    WHERE id = v_quote.id;
    RAISE EXCEPTION 'QUOTE_EXPIRED';
  END IF;

  INSERT INTO public.agent_service_transactions (
    request_id,
    accepted_quote_id,
    client_id,
    professional_id,
    agreed_amount_cents,
    currency,
    scheduled_start,
    scheduled_end,
    status,
    metadata
  )
  VALUES (
    p_request_id,
    v_quote.id,
    p_actor_user_id,
    v_quote.professional_id,
    v_quote.amount_cents,
    v_quote.currency,
    v_quote.proposed_start,
    v_quote.proposed_end,
    CASE WHEN v_quote.proposed_start IS NOT NULL THEN 'scheduled' ELSE 'accepted' END,
    jsonb_build_object('acceptance_idempotency_key', p_idempotency_key)
  )
  RETURNING * INTO v_transaction;

  UPDATE public.agent_service_quotes
    SET
      status = CASE WHEN id = p_quote_id THEN 'accepted' ELSE 'rejected' END,
      updated_at = now()
  WHERE request_id = p_request_id
    AND (
      id = p_quote_id
      OR status IN ('submitted', 'countered')
    );

  UPDATE public.agent_service_requests
    SET
      status = CASE WHEN v_quote.proposed_start IS NOT NULL THEN 'scheduled' ELSE 'accepted' END,
      updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.agent_action_audit (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    decision,
    authorization_context,
    success
  )
  VALUES (
    p_actor_user_id,
    'accept_quote',
    'agent_service_request',
    p_request_id,
    jsonb_build_object(
      'quote_id', p_quote_id,
      'transaction_id', v_transaction.id,
      'amount_cents', v_quote.amount_cents
    ),
    jsonb_build_object(
      'authenticated_human', true,
      'request_owner', true,
      'idempotency_key', p_idempotency_key
    ),
    true
  );

  RETURN jsonb_build_object(
    'transaction', to_jsonb(v_transaction),
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.yud_accept_quote(UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.yud_accept_quote(UUID, UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.yud_accept_quote(UUID, UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.yud_accept_quote(UUID, UUID, UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.yud_accept_quote(UUID, UUID, UUID, TEXT) IS
  'Atomically accepts one quote, closes competing quotes, advances request state, creates canonical transaction and audit evidence. Server/service-role only.';
