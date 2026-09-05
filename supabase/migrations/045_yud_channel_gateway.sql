-- ============================================================
-- 045_yud_channel_gateway.sql
-- Channel-neutral ingress/egress for WhatsApp-first operation.
-- Business logic must consume normalized events rather than depend on
-- WhatsApp payloads directly.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.yud_channel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'web', 'api', 'internal', 'other')),
  provider_event_id TEXT NOT NULL,
  external_sender_id TEXT NOT NULL,
  external_recipient_id TEXT,
  message_type TEXT NOT NULL,
  text_body TEXT,
  media_id TEXT,
  agent_id UUID REFERENCES public.agent_identities(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'normalized', 'processing', 'processed', 'failed', 'ignored')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_yud_channel_events_unprocessed
  ON public.yud_channel_events(channel, status, received_at)
  WHERE status IN ('received', 'normalized', 'failed');

CREATE INDEX IF NOT EXISTS idx_yud_channel_events_sender
  ON public.yud_channel_events(channel, external_sender_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.yud_channel_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'web', 'api', 'internal', 'other')),
  agent_id UUID REFERENCES public.agent_identities(id) ON DELETE SET NULL,
  external_recipient_id TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  text_body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  provider_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_yud_channel_outbox_pending
  ON public.yud_channel_outbox(channel, status, available_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.yud_channel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yud_channel_outbox ENABLE ROW LEVEL SECURITY;

-- No direct authenticated-user policies are intentionally created here.
-- Channel gateway writes/reads are server-mediated through service_role.
-- User-facing conversation history should be exposed through scoped views/API
-- after ownership and privacy rules are applied.

COMMENT ON TABLE public.yud_channel_events IS
  'Provider-neutral inbound event ledger. WhatsApp is the first adapter, not the business core.';
COMMENT ON TABLE public.yud_channel_outbox IS
  'Provider-neutral outbound queue. Sending is performed by governed channel adapters.';
