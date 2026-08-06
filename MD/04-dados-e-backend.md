# Dados e backend

## Fonte de verdade do schema

As migrations do Supabase são a fonte operacional. O arquivo TypeScript gerado fornece uma fotografia útil, mas está incompleto em relação às migrations e às consultas atuais; por exemplo, funcionalidades mais recentes consultam entidades que não aparecem na versão tipada.

## Domínios de dados

| Domínio | Entidades principais |
|---|---|
| Identidade | `profiles`, `user_roles`, `user_consents`, `user_ip_log` |
| Profissionais | `professional_profiles`, `categories`, portfólio, equipe, agenda |
| Solicitações | `broadcast_requests`, `request_dispatches`, `service_requests` |
| Matching | `matching_config`, `professional_metrics`, views de score/ocupação |
| Oferta | `supply_limits`, `city_settings`, `waiting_list`, `slot_occupancy` |
| Comunicação | `messages`, `notifications`, `push_subscriptions` |
| Reputação | `reviews`, `pending_reviews`, `trust_scores`, `professional_tags`, `professional_reputation` |
| Indicação | `referral_codes`, `referrals`, `referral_rewards`, `referral_stats`, `referral_leaderboard` |
| Compliance | `kyc_submissions`, `admin_audit_log`, registros LGPD |
| Financeiro | `payments`, `professional_earnings`, `subscriptions`, `disputes` |
| Operação pro | `schedules`, `quotes`, `quote_items`, `team_members`, `mei_profiles`, `mei_revenue_tracking` |
| Relatórios | `weekly_reports`, eventos de curadoria e métricas administrativas |

Nomes exatos de algumas entidades recentes devem ser confirmados no banco aplicado, pois as migrations evoluíram depois da geração de `types.ts`.

## RPCs e automações

As migrations implementam parte relevante das regras no PostgreSQL. Grupos importantes:

- criação e expansão do despacho: `dispatch_broadcast_request`;
- resposta a ofertas e expiração: `handle_dispatch_response`, `expire_pending_dispatches`;
- score e métricas: `_score_professional`, `recalculate_fixr_score`, `compute_trust_score`;
- oferta e espera: `check_slot_available`, `notify_waiting_list`;
- onboarding: `fixr_get_onboarding_state`, `fixr_set_pro_onboarding_step`, `fixr_complete_pro_onboarding`;
- referências: criação de código, aplicação segura e recompensa por marco;
- avaliações: pendências, bloqueios e processamento de atraso;
- relatórios: `generate_weekly_report`;
- tarefas de resgate/reengajamento executáveis por cron.

Triggers cuidam de timestamps, métricas, mensagens de sistema, curadoria, alertas e transições de fluxo. Alterações nessas regras exigem verificar concorrência, idempotência e privilégios `SECURITY DEFINER`.

## Edge Functions

| Função | Responsabilidade |
|---|---|
| `create-payment-intent` | Criar pagamento Stripe com autenticação e idempotência |
| `create-pagarme-payment` | Criar cobrança/transação Pagar.me |
| `create-pagarme-subscription` | Assinar o plano pago |
| `create-pagarme-recipient` | Cadastrar recebedor do profissional |
| `pagarme-webhook` | Processar eventos assinados do Pagar.me |
| `schedule-service` | Agendar serviço e disparar notificação |
| `push-notify` | Enviar Web Push |
| `verify-kyc-document` | Processar/verificar submissão KYC |
| `update-profile` | Atualizar perfil de forma validada e privilegiada |
| `export-user-data` | Exportar dados pessoais para LGPD |
| `mei-limit-check` | Verificar faturamento e alertas do limite MEI |

Utilitários compartilhados padronizam resposta, validação, sanitização e mascaramento de dados.

## Storage

Buckets observados no código/migrations:

- `avatars`: imagens públicas de perfil.
- `chat-media`: anexos privados de conversa, acessados por URL assinada.
- `kyc-documents`: documentos privados de verificação.

Políticas de Storage devem manter isolamento por usuário e acesso administrativo explícito.

## Segurança de dados

O projeto usa Row-Level Security e recebeu hardening até a migration `043_rls_hardening_audit.sql`. O princípio esperado é:

- usuário acessa apenas seus dados ou dados públicos necessários;
- participantes acessam apenas o serviço/conversa correspondente;
- administração exige papel no banco;
- service role nunca vai para o navegador;
- webhooks validam assinatura e operações financeiras são idempotentes;
- dados sensíveis são mascarados em logs e respostas de erro.

