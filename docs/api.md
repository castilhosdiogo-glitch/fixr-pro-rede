# Fixr API — Reference

Princípio: **o app é só mais um cliente da API**. Toda lógica de negócio vive no backend (Supabase RPCs + edge functions). Front faz fetch, valida UI, mostra. Não calcula comissão, não enforça limite de plano, não decide regra de cancelamento.

Esse documento é a fonte de verdade até justificar OpenAPI/Swagger formal — gatilhos pra evoluir estão em `project_api_first_deferred.md` (memory).

## Stack

- **Backend principal**: Supabase (PostgreSQL + PostgREST + Auth + Storage + Realtime)
- **Endpoints custom**: Supabase Edge Functions (Deno)
- **Pagamentos**: Pagar.me (não Stripe — gateway escolhido em `project_payment_gateway.md`)
- **Auth**: Supabase JWT (email/senha + Google)
- **Realtime**: Supabase Realtime (chat, notificações)

## Auto-gerado pelo PostgREST

Toda tabela com RLS gera REST endpoint automaticamente:

```
GET    /rest/v1/<table>?select=*&filter=eq.value
POST   /rest/v1/<table>
PATCH  /rest/v1/<table>?id=eq.<uuid>
DELETE /rest/v1/<table>?id=eq.<uuid>
```

Headers obrigatórios:
- `apikey: <SUPABASE_ANON_KEY>` (ou service_role pra admin)
- `Authorization: Bearer <USER_JWT>` (operações autenticadas)

OpenAPI spec auto-gerado:
```bash
curl -H "Accept: application/openapi+json" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     https://hoymfqveawkomiixtvpw.supabase.co/rest/v1/
```

## Tabelas principais (PostgREST)

- `profiles` — dados básicos do usuário (cliente ou pro)
- `professional_profiles` — extensão pra pros (categoria, plano, comissão, KYC)
- `categories` — categorias de serviço
- `service_requests` — pedidos broadcast/diretos
- `dispatches` — pareamento pedido→pro com status
- `messages` — chat 1:1
- `notifications` — push/in-app
- `mei_revenue_tracking` — receita MEI mensal por pro
- `weekly_reports` — relatórios admin gerados via cron
- `webhooks` — push subscriptions (web push)
- `kyc_documents` — uploads de KYC

Acesso governado por **RLS** (Row Level Security). Toda tabela tem policies. Service role bypassa RLS — usar só em edge functions.

## Edge Functions (endpoints custom)

Base URL: `https://hoymfqveawkomiixtvpw.supabase.co/functions/v1`

| Função | Method | Auth | Descrição |
|--------|--------|------|-----------|
| `create-payment-intent` | POST | JWT user | Cria intent de pagamento (legacy Stripe — ver gateway) |
| `create-pagarme-payment` | POST | JWT user | Cria cobrança Pagar.me |
| `create-pagarme-recipient` | POST | JWT user (pro) | Cadastra recipient bancário do pro |
| `create-pagarme-subscription` | POST | JWT user (pro) | Assina plano Parceiro recorrente |
| `pagarme-webhook` | POST | HMAC signing | Webhook entrada da Pagar.me |
| `push-notify` | POST | JWT (⚠ falha de auth — ver security_ship_freeze) | Envia web push |
| `schedule-service` | POST | JWT user | Agenda execução de serviço |
| `update-profile` | POST | JWT user | Atualiza profile (⚠ falha de check user_id) |
| `verify-kyc-document` | POST | JWT user | Submete KYC pra validação |
| `export-user-data` | POST | JWT user | LGPD: export portátil |
| `mei-limit-check` | Cron | service_role | Job diário: alerta MEI 70/90/100% do limite |

## RPCs principais (Postgres functions)

Chamada via PostgREST:
```
POST /rest/v1/rpc/<function_name>
Body: { "p_arg1": value, ... }
```

| RPC | Argumentos | Retorna | Auth |
|-----|------------|---------|------|
| `get_monthly_request_count(p_user_id)` | uuid | int | RLS |
| `check_plan_limit(p_user_id)` | uuid | bool — pode aceitar mais request | RLS |
| `handle_dispatch_response(p_dispatch_id, p_response)` | uuid, text | jsonb | ⚠ falta guard `auth.uid()=pro_id` (security_ship_freeze) |
| `search_professionals(...)` | filtros | rows | ⚠ retorna `phone` pra anon (security_ship_freeze) |
| `top_professionals(...)` | filtros | rows | ⚠ idem |
| `generate_weekly_report(p_week_start)` | date | uuid | ⚠ GRANT pra authenticated (security_ship_freeze) |

## Auth

Login normal:
```
POST /auth/v1/token?grant_type=password
Body: { "email": "...", "password": "..." }
```

Retorna JWT com claims `sub`, `email`, `role`, `app_metadata`. Anexa em `Authorization: Bearer <token>` em chamadas seguintes. Refresh via `grant_type=refresh_token`.

Admin role: `has_role('admin'::app_role, auth.uid())` — assinatura correta documentada em `project_has_role_signature.md`. App admin Next usa `profiles.role` separadamente (a unificar).

## Princípio "app é só cliente" — pontos de atenção

Auditado 2026-04-24. Onde lógica de negócio aparece no front:

- [src/hooks/usePlanGate.ts](../src/hooks/usePlanGate.ts) `PLAN_LIMITS` — duplica preços, comissões, features. **Aceitável**: enforcement real é server-side (`check_plan_limit` RPC + RLS). Tabela do front é só pra UX gating + mensagens. Drift possível — manter sincronizado manualmente.
- [src/components/payments/StripePaymentForm.tsx](../src/components/payments/StripePaymentForm.tsx) — comissão display agora vem por prop `commissionRate`, default 15%. Caller deve passar `professional_profiles.commission_rate` da pro envolvida.

Tudo mais (cálculo de valor de pedido, validação de orçamento, regras de cancelamento, cálculo de comissão real, geo-dispatch) já vive em RPCs/edge functions. ✓

## Webhooks (Pagar.me apenas, hoje)

Único webhook entrante implementado: `pagarme-webhook`. Valida HMAC SHA-256 com `PAGARME_WEBHOOK_SECRET`. Eventos suportados:
- `order.paid` → marca pedido pago, libera dispatch
- `order.payment_failed` → marca falha, retry
- `subscription.charged` → renova plano Parceiro

Webhooks **saintes** pra parceiros B2B = deferido (ver `project_api_first_deferred.md`).

## Realtime

Tabelas com Realtime habilitado:
- `messages` — chat live
- `notifications` — badge live
- `dispatches` — status atualiza pra cliente em tempo real

Cliente usa `supabase.channel(...)`.

## Storage buckets

- `avatars` — fotos de perfil (público com URL signed)
- `kyc-documents` — KYC privado (acesso só dono + admin)
- `chat-media` — anexos de chat

## Limites e quotas (hoje)

Plano Explorador (free): **8 pedidos/mês** enforçado server-side. Demais features bloqueadas via `usePlanGate.can(feature)` no front + RLS.

Plano Parceiro (R$ 29,90/mês): ilimitado.

Sem rate limit por IP/client_id (deferido — ver `project_api_first_deferred.md`).

## Como adicionar endpoint novo (até justificar OpenAPI formal)

1. **Lógica simples + CRUD em tabela existente**: usa PostgREST direto. Adiciona policy RLS.
2. **Lógica que toca múltiplas tabelas + transação**: RPC SQL. Adiciona em migration.
3. **Lógica externa (gateway, push, IA, KYC vendor)**: Edge function.
4. **Atualiza este doc** — seção apropriada.
5. **Webhook ou cron**: ver `mei-limit-check` como template.

Não criar endpoint custom só pra "frontend bonito" — usa view ou query composta com PostgREST.

## Versionamento

Sem versionamento explícito hoje. Edge functions e RPCs evoluem com migration. Quando primeiro consumidor externo aparecer (gatilho do `project_api_first_deferred.md`), introduzir prefix `/api/v1/`.

## Próximos passos sugeridos (não bloqueia ship)

- [ ] Inventariar SQL/RPC com `pg_proc` e gerar tabela atualizada periodicamente (script no `supabase/`)
- [ ] Adicionar Postman collection em `docs/postman.json` quando edge functions passarem de 15
- [ ] OpenAPI YAML gerado automaticamente quando primeiro parceiro B2B aparecer

---

Última auditoria: 2026-04-24 (commit checkpoint)
