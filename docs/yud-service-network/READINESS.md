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
- quotes and bounded negotiation authority;
- canonical service transactions;
- agent action audit ledger;
- deterministic professional discovery reusing existing geo/ranking functions;
- atomic quote acceptance in Postgres;
- service-capability backfill from legacy professional profiles;
- channel-neutral inbound event ledger and outbound queue;
- secure WhatsApp Cloud API inbound webhook adapter with signature verification;
- first-party authenticated Service Network API;
- schema-level unit tests;
- pull-request CI for lint, tests and build.

## Must pass before staging certification

- apply migrations `044`–`046` against a disposable/staging Supabase database;
- verify all referenced legacy columns/functions exist with production-compatible types;
- run RLS abuse tests for client, professional and unrelated authenticated users;
- run concurrent quote-acceptance test to prove only one transaction can win;
- regenerate Supabase TypeScript database types after migrations;
- run `npm run lint`, `npm test` and `npm run build` in CI;
- deploy `yud-agent-network` to staging;
- exercise create → discover → quote → accept end to end;
- verify audit evidence and idempotent replay.

## Must pass before WhatsApp pilot

- configure Meta WhatsApp Cloud API application and phone number;
- configure `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET` as secrets;
- deploy and verify `yud-whatsapp-webhook`;
- implement governed outbound WhatsApp sender for `yud_channel_outbox`;
- implement event processor/orchestrator that converts channel events into structured YUD operations;
- implement or connect voice transcription for WhatsApp audio;
- define onboarding behavior for unbound phone numbers;
- test duplicate webhook delivery and provider retry behavior;
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
→ professional receives demand
→ professional returns quote/availability
→ bounded acceptance
→ canonical scheduled transaction
→ audit evidence
```

The Web app remains available for dashboards, administration and complex operations.

## Evidence rule

No component may be marked `PRODUCTION_CERTIFIED` merely because code exists. Certification requires executable evidence from migrations, CI, RLS tests, staging Edge Functions and an end-to-end transaction.
