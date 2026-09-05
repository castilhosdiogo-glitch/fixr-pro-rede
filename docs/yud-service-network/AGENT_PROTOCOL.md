# YUD Service Network — Agent Protocol Boundary

## Purpose

This document defines the first stable boundary between channels/agents and the YUD Service Network core.

The protocol is intentionally **model-agnostic, provider-agnostic, agent-agnostic and channel-agnostic**. A WhatsApp conversation, a first-party YUD agent and a future external personal agent must converge into the same structured service operations.

## Current first-party API

Edge Function: `yud-agent-network`

Authentication today: authenticated YUD human session (Supabase JWT). External BYOA credentials are deliberately not enabled yet.

### `discover`

Stateless deterministic preview over existing YUD supply/matching infrastructure.

```json
{
  "action": "discover",
  "category_id": "eletricista",
  "city": "Curitiba",
  "latitude": -25.43,
  "longitude": -49.27,
  "limit": 10
}
```

This is useful for preview/search. It does not by itself grant a professional access to a customer request.

### `create_request`

Creates the canonical machine-readable demand record and immediately attempts server-side matching.

```json
{
  "action": "create_request",
  "category_id": "eletricista",
  "description": "Instalar um chuveiro amanhã depois das 15h",
  "city": "Curitiba",
  "state": "PR",
  "urgency": "week",
  "desired_start": "2026-09-06T15:00:00-03:00",
  "budget_max_cents": 30000,
  "source_channel": "whatsapp",
  "hard_constraints": {},
  "soft_preferences": {},
  "idempotency_key": "provider-or-client-event-id"
}
```

The natural-language message is not the transaction state. It must be converted into this structured contract.

Matching persists explicit `agent_request_candidates`. If automatic matching is temporarily unavailable, request creation remains durable and matching can be retried explicitly.

### `match_request`

Customer-owned retry/refresh of deterministic matching.

```json
{
  "action": "match_request",
  "request_id": "uuid",
  "limit": 10
}
```

The Edge Function verifies human ownership, then invokes the server-only `yud_match_request` RPC. Only persisted candidates gain professional read/quote access to the request.

### `list_matches`

Professional-only demand inbox.

```json
{
  "action": "list_matches",
  "limit": 20
}
```

Returns only requests for which the authenticated professional has a persisted candidate row. Pending/notified matches are marked viewed by the server; professionals do not receive direct arbitrary UPDATE permission on candidate records.

### `decline_match`

Professional-only controlled decline.

```json
{
  "action": "decline_match",
  "candidate_id": "uuid"
}
```

The Edge Function verifies ownership and performs the status mutation server-side.

### `get_request`

Reads a request and visible quotes. RLS permits the customer owner and explicitly matched professionals, with quote visibility restricted to transaction parties.

### `submit_quote`

Professional-only first-party operation. A professional must be an active persisted candidate for the request.

```json
{
  "action": "submit_quote",
  "request_id": "uuid",
  "amount_cents": 18000,
  "currency": "BRL",
  "proposed_start": "2026-09-06T16:00:00-03:00",
  "terms": {},
  "idempotency_key": "quote-event-id"
}
```

Submitting a quote marks the matching candidate responded and advances a still-matchable request toward `proposed`.

### `accept_quote`

Consequential operation. Requires an authenticated human owner today. Acceptance is executed atomically in Postgres through `yud_accept_quote`, which creates the canonical transaction, closes competing quotes, advances request state and writes audit evidence in one database transaction.

## Matching security invariant

The YUD core distinguishes:

```text
DISCOVERY RESULT
      ≠
AUTHORIZED PROFESSIONAL CANDIDATE
```

A professional cannot create a quote merely because a request UUID exists. The server must persist that professional as an `agent_request_candidates` row first. This prevents the request/quote layer from degenerating into an implicitly public marketplace.

## Channel contract

Channels must never call business rules directly from provider payloads.

```text
Provider event
    ↓
Channel adapter
    ↓
yud_channel_events
    ↓
Normalizer / Agent Orchestrator
    ↓
Structured YUD operation
    ↓
Service Network core
```

The first adapter is WhatsApp Cloud API (`yud-whatsapp-webhook`). It validates Meta's webhook signature and writes an idempotent provider-neutral event ledger.

Voice/audio is initially stored as a media reference. Transcription belongs in the processing/orchestration layer, not the webhook.

Outbound responses use `yud_channel_outbox`. `yud-whatsapp-outbox` is the first governed provider sender and supports queued text delivery. Provider-specific sending remains outside service-domain logic.

## BYOA target

Future external agents must authenticate as `agent_identities`, not pretend to be the human user.

Before enabling BYOA mutations, YUD must implement and test:

- external agent credential issuance/rotation/revocation;
- delegated authority from a human/principal;
- scopes/capabilities per agent;
- replay protection and idempotency;
- rate limits and abuse controls;
- provenance/audit evidence;
- explicit negotiation/payment limits;
- human escalation;
- versioned protocol contracts.

A provider/model name is metadata, not authority.

## Delegated authority

Agent automation must be bounded, for example:

```json
{
  "may_auto_accept": true,
  "max_customer_price_cents": 30000,
  "allowed_start": "2026-09-06T14:00:00-03:00",
  "allowed_end": "2026-09-06T18:00:00-03:00",
  "requires_human_approval_for_cancel": true
}
```

An agent may act only inside the delegated envelope. Outside the envelope the system must fail closed or request human approval.

## State and truth

Canonical request states:

`draft → discovery → matching → negotiating → proposed → accepted → scheduled → in_progress → completed`

Exception/terminal states: `cancelled`, `expired`, `disputed`.

Chat messages, model outputs and provider events are evidence/input. Database state is transactional truth.

## Protocol evolution

Potential future operations include:

- `get_capabilities`
- `get_availability`
- `request_quote`
- `counter_quote`
- `set_negotiation_authority`
- `schedule_service`
- `start_service`
- `complete_service`
- `cancel_service`
- `rate_service`

Do not expose an operation externally until its authentication, authorization, idempotency, state transition and audit behavior are defined and tested.

## Compatibility rule

The protocol should become more useful as models improve. Model-specific prompting belongs in agent adapters/runtime, never in the YUD Service Network domain contract.
