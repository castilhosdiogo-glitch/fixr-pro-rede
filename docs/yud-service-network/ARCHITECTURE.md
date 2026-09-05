# YUD Service Network — Target Architecture

## Status

Decision: **YUD Work/Fixr evolves into YUD Service Network.**

This is not a rename. The product moves from an app-centric marketplace to an **agent-native service infrastructure**.

> YUD Service Network is the machine-readable, machine-discoverable and machine-actionable service infrastructure connecting agents that need human work with agents representing professionals capable of performing it.

## Core thesis

Primary interaction model:

```text
Customer / Customer Agent
          ↕
   YUD Service Network
          ↕
Professional / Professional Agent
```

The YUD moat is **not** a proprietary chatbot and **not** a single model. The moat is the network, service graph, identity/trust, availability, matching, transaction history, reputation, workflow and machine-actionable protocol.

Principles:

- model-agnostic
- provider-agnostic
- agent-agnostic
- channel-agnostic
- BYOA (Bring Your Own Agent)
- WhatsApp-first for initial distribution, but WhatsApp is an adapter, not the core
- voice-friendly and low-digital-literacy friendly
- deterministic logic for hard constraints; LLMs only where language/ambiguity benefits
- structured state instead of chat-as-database
- explicit authorization boundaries
- auditable agent actions
- fail closed for critical operations
- no schema, no decision

Strategic rule:

> We want businesses that become more valuable as AI improves, not businesses that are destroyed as AI improves.

## Product layers

```text
┌─────────────────────────────────────────────────────┐
│ CHANNEL LAYER                                       │
│ WhatsApp | Web | API | future channels             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ AGENT LAYER                                         │
│ YUD Customer Agent | YUD Professional Agent | BYOA  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ SERVICE NETWORK CORE                                │
│ requests | discovery | matching | quotes | state    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ TRUST + TRANSACTION                                 │
│ identity | permissions | KYC | reputation | audit   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ DATA                                                │
│ service graph | availability | pricing | history    │
└─────────────────────────────────────────────────────┘
```

## WhatsApp-first

Initial UX should allow both sides to use natural language and voice without installing a new app.

Customer example:

> "Preciso de alguém para instalar um chuveiro amanhã depois das 15h em Curitiba."

Professional example:

> "Amanhã posso depois das 16h. Esse serviço eu faço por R$ 180 e atendo até 20 km."

The channel adapter must normalize messages into structured commands/events. Business logic must never be coupled directly to WhatsApp.

## BYOA — Bring Your Own Agent

YUD may provide first-party agents during adoption, but the protocol must permit external agents from OpenAI, Anthropic, Google, xAI, Alibaba/Qwen, DeepSeek, local models and future providers.

External agents must never be trusted by default. They require:

- authenticated agent identity
- scoped permissions
- rate limits
- explicit authorization context
- provenance
- idempotency for mutations
- audit trail

## Service Graph

Professionals are not just profile pages. Their offer must become structured and machine-actionable.

Minimum conceptual graph:

```text
Professional
├── identity / verification
├── service capabilities
├── categories / skills
├── location / service radius
├── availability
├── regional and professional pricing
├── reputation / reliability
├── constraints
├── completed-work history
└── agent/channel bindings
```

## Request lifecycle

Canonical service request states:

```text
DRAFT
→ DISCOVERY
→ MATCHING
→ NEGOTIATING
→ PROPOSED
→ ACCEPTED
→ SCHEDULED
→ IN_PROGRESS
→ COMPLETED
```

Terminal/exception states:

```text
CANCELLED | EXPIRED | DISPUTED
```

Messages do not define transactional truth. The database state machine does.

## Discovery and matching

Separate hard constraints from ranking signals.

Hard constraints examples:

- category/capability
- location/radius
- availability
- required verification/certification
- price ceiling if explicitly mandated

Soft ranking examples:

- reputation
- reliability
- distance
- response time
- completion rate
- price proximity
- customer preference

Do not use an LLM to reproduce filters/ranking that are better expressed deterministically.

## Pricing

YUD may provide regional reference prices. Final service price belongs to the professional unless a specific future product contract says otherwise.

Keep separate concepts:

- regional_reference_price
- professional_price
- negotiated_price

## Negotiation

Agent-to-agent negotiation is allowed only within bounded authority.

Examples of boundaries:

- customer maximum price
- professional minimum price
- permitted schedule windows
- whether an agent may auto-accept
- whether cancellation requires human approval

Every consequential negotiation step must be auditable.

## Security model

Separate identities:

- human user identity
- professional identity
- agent identity
- external channel identity

Critical requirements:

- least privilege
- RLS and server-side authorization
- scoped agent capabilities
- signed/authenticated external requests
- idempotency
- replay protection where applicable
- rate limiting
- input validation
- structured schemas
- audit logs without secrets
- human approval for high-risk/financial actions beyond explicit authority

## Existing code: keep and adapt

The legacy repository already contains valuable infrastructure and must not be rewritten blindly.

Keep/adapt:

- `professional_profiles`
- existing profiles/auth
- geo dispatch and radius logic
- matching/ranking configuration
- reputation system
- KYC
- scheduling
- payments/commission infrastructure
- disputes
- admin/observability
- onboarding
- professional dashboard/fiscal tooling where useful

The existing app-centric search/browse flow becomes a secondary human interface rather than the architectural center.

## MVP boundary

The first YUD Service Network MVP must prove this loop:

```text
natural-language need
→ structured ServiceRequest
→ deterministic discovery/matching
→ professional receives demand
→ professional responds/quotes
→ bounded negotiation/acceptance
→ scheduled transaction
```

Preferred first channel: WhatsApp.

Not required for MVP:

- bank
- card
- lending
- crypto/token
- blockchain
- custom frontier model
- Kubernetes without demonstrated need
- autonomous financial authority

## Monetization

Keep the existing direction: no mandatory subscription as the core model. YUD earns when it creates/executes economic value, primarily through service commission. Banking/card/credit remain future options, not MVP dependencies.

## Web role

Web remains important, but primarily as:

- professional dashboard
- administration
- history
- settings
- audit/observability
- complex account operations
- support

It is not assumed to remain the customer's primary interface.

## Migration strategy

1. Preserve legacy production behavior.
2. Add YUD Service Network domain tables/contracts alongside legacy schema.
3. Link new service-network transactions to legacy broadcast/service records where needed.
4. Build adapters around existing matching, KYC, reputation, scheduling and payment systems.
5. Introduce WhatsApp as the first channel adapter.
6. Introduce first-party Customer/Professional agents.
7. Expose a scoped external Agent API only after auth, authorization, idempotency and audit tests pass.
8. Deprecate legacy app-centric flows only after equivalent service-network flows are proven.

## Obsolescence challenge

Every feature must answer:

1. If frontier models improve 10×, does this become more valuable or less?
2. If software generation becomes nearly free, what remains scarce?
3. Is the moat in code, or in network/data/trust/workflow/access?
4. Are we creating unnecessary provider lock-in?
5. Is this deterministic logic being incorrectly delegated to an LLM?

The preferred YUD assets are the things that remain difficult to reconstruct even when code is cheap: network, reputation, verified identities, machine-readable service supply, availability, proprietary transaction history and trusted execution.