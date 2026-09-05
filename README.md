# YUD Service Network

YUD Service Network is evolving the original Fixr/YUD Work marketplace into **agent-native infrastructure for human services**.

The target interaction model is:

```text
Customer / Customer Agent
          ↕
   YUD Service Network
          ↕
Professional / Professional Agent
```

The long-term product is not a proprietary chatbot and not a single marketplace UI. It is the machine-readable, machine-discoverable and machine-actionable network that lets agents discover, verify, negotiate and transact with professionals who perform work in the physical world.

## Product principles

- **WhatsApp-first, not WhatsApp-dependent** — WhatsApp is the first distribution/interface adapter for Brazil; the core remains channel-agnostic.
- **BYOA (Bring Your Own Agent)** — first-party YUD agents can bootstrap adoption, while the protocol is designed for future ChatGPT/Claude/Gemini/Grok/Qwen/DeepSeek/local/third-party agents.
- **Model/provider agnostic** — model choice belongs in the agent/runtime layer, not in the service domain contract.
- **Voice and low-digital-literacy friendly** — natural language should become structured service state without long forms.
- **Deterministic where possible** — use structured filters/ranking/state machines for hard constraints; use LLMs where language and ambiguity justify them.
- **Fail closed for consequential actions** — explicit authorization, idempotency and audit evidence.
- **No schema, no decision** — agent outputs that mutate service state must resolve into validated contracts.

Strategic rule:

> We want businesses that become more valuable as AI improves, not businesses that are destroyed as AI improves.

## Current migration branch

`feat/yud-service-network-v1`

This branch preserves useful legacy infrastructure while adding the new agent-native core:

- identity and channel bindings for agents;
- Service Graph / machine-readable professional capabilities;
- structured availability;
- canonical service requests;
- deterministic matching and persisted candidates;
- quotes and bounded negotiation authority;
- canonical service transactions;
- audit evidence;
- provider-neutral channel inbox/outbox;
- WhatsApp Cloud API secure ingress adapter;
- first-party authenticated Service Network API;
- atomic quote acceptance;
- RLS and server-mediated critical writes.

See:

- `docs/yud-service-network/ARCHITECTURE.md`
- `docs/yud-service-network/AGENT_PROTOCOL.md`
- `docs/yud-service-network/READINESS.md`

## Legacy infrastructure retained

The repository already contains substantial production-oriented capabilities that should be adapted rather than rewritten blindly, including:

- authentication/profiles;
- professional profiles and onboarding;
- geo/radius dispatch;
- ranking and reputation;
- KYC/curation;
- scheduling;
- payments/commission infrastructure;
- disputes;
- professional/admin dashboards;
- fiscal/MEI tooling.

The existing browse/search Web experience remains useful as a human interface, but it is no longer the architectural center of the product.

## MVP target

```text
natural-language need
→ structured ServiceRequest
→ deterministic discovery/matching
→ explicit professional candidate
→ professional quote/availability
→ bounded acceptance
→ canonical scheduled transaction
→ audit evidence
```

Preferred first channel: WhatsApp.

Not part of the first MVP: bank, card, credit, blockchain/token, custom frontier model, autonomous financial authority or unnecessary infrastructure complexity.

## Technology

- React 18
- TypeScript
- Vite
- Tailwind / shadcn-ui
- Supabase / PostgreSQL / RLS
- Supabase Edge Functions
- Zod
- Vitest

## Local development

Requires Node.js 20.

```sh
npm ci
npm run dev
```

Validation:

```sh
npm run lint
npm test
npm run build
```

## Production safety

Code existence is not production certification. Before deploying the Service Network migrations/functions, follow the staging and security gates in `docs/yud-service-network/READINESS.md`.
