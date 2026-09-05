# YUD Service Network — Readiness Gate

## Current status

**Architecture and core migration are implemented on `feat/yud-service-network-v1`, but this branch is not production-certified.**

The goal of this branch is to turn the legacy app-centric marketplace into an agent-native core while preserving valuable existing infrastructure.

## Implemented in this branch

- target architecture and migration strategy;
- model/provider/channel-agnostic domain schemas;
- first machine-readable Service Graph layer;
- agent identities and channel bindings;
- structured service requests;
- professional availability;
- persisted request/professional candidate matching;
- professional demand listing and decline flow;
- quotes and bounded negotiation authority;
- canonical service transactions;
- agent action audit ledger;
- deterministic professional discovery reusing existing geo/ranking functions;
- server-only request matching with explicit candidate access;
- atomic quote acceptance in Postgres;
- service-capability backfill from legacy professional profiles;
- regional service price-reference layer with city/state/national fallback;
- RLS hardening so canonical request/quote/channel state mutations remain server-mediated;
- channel-neutral inbound event ledger and outbound queue;
- secure WhatsApp Cloud API inbound webhook adapter with signature verification;
- governed WhatsApp text outbox sender with explicit worker authentication;
- first-party authenticated Service Network API, including regional price lookup;
- schema-level unit tests;
- pull-request CI for lint, tests and build.

## Compatibility evidence already collected

Read-only inspection of the connected Supabase project confirmed that the legacy schema contains the tables/columns used by the migration (`professional_profiles`, `profiles`, `broadcast_requests`, `service_requests`) and that `_haversine_km` and `_score_professional` exist with the expected signatures.

This is compatibility evidence only. No Service Network DDL has been applied to the live database.

## CI evidence

GitHub Actions has successfully completed the Node 20 validation pipeline on the branch after the Service Network core changes: dependency install, lint, unit tests and production build all passed. Database/Edge Function staging evidence is still required separately.

## Must pass before staging certification

- apply migrations `044`–`049` against a disposable/staging Supabase database;
- run RLS abuse tests for client, professional and unrelated authenticated users;
- verify professionals cannot quote requests unless persisted as candidates;
- verify clients cannot directly mutate canonical request state and professionals cannot directly mutate canonical quote state;
- verify channel bindings cannot be forged by an authenticated browser session;
- run concurrent quote-acceptance test to prove only one transaction can win;
- validate city/state/national regional price-reference fallback and empty-reference behavior;
- regenerate Supabase TypeScript database types after migrations;
- run `npm run lint`, `npm test` and `npm run build` in CI;
- deploy `yud-agent-network` to staging;
- exercise create → auto-match → list professional match → price reference → quote → accept end to end;
- verify audit evidence and idempotent replay.

## Must pass before WhatsApp pilot

- configure Meta WhatsApp Cloud API application and phone number;
- configure `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION` and `YUD_CHANNEL_WORKER_TOKEN` as secrets;
- deploy and verify `yud-whatsapp-webhook`;
- deploy and verify `yud-whatsapp-outbox`;
- implement event processor/orchestrator that converts channel events into structured YUD operations;
- implement or connect voice transcription for WhatsApp audio;
- define onboarding behavior for unbound phone numbers;
- test duplicate webhook delivery, outbox idempotency and provider retry behavior;
- add privacy/retention policy for raw provider payloads and media references.

## Must pass before external BYOA

- agent credential lifecycle;
- delegated authority model;
- scoped capabilities;
- replay protection;
- protocol versioning;
- rate/abuse controls;
- revocation;
- external-agent security review;
- adversarial tests for prompt injection and forged tool instructions;
- explicit human approval rules for consequential actions.

## Deliberately deferred

These are not blockers for the first Service Network MVP:

- bank/card/credit;
- autonomous financial authority;
- custom frontier model;
- Kubernetes;
- blockchain/token;
- full external-agent interoperability;
- replacing all legacy web flows.

## MVP completion definition

The MVP is functionally complete when this loop works through the WhatsApp-first path:

```text
natural-language need
→ normalized channel event
→ structured ServiceRequest
→ deterministic discovery/matching
→ persisted professional candidate
→ regional price guidance when available
→ professional receives demand
→ professional returns quote/availability
→ bounded acceptance
→ canonical scheduled transaction
→ audit evidence
```

The Web app remains available for dashboards, administration and complex operations.

## Evidence rule

No component may be marked `PRODUCTION_CERTIFIED` merely because code exists. Certification requires executable evidence from migrations, CI, RLS tests, staging Edge Functions and an end-to-end transaction.
