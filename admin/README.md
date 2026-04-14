# Fixr Admin

Painel administrativo do Fixr — aplicação Next.js separada, acesso restrito por papel `admin` no banco.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Supabase (`@supabase/ssr`) para auth + data
- Middleware protege todas as rotas exceto `/login`

## Setup

1. Copiar variáveis de ambiente:

   ```bash
   cp .env.example .env.local
   ```

   Preencher com as chaves do projeto Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (apenas server — usado pelo audit log)

2. Instalar deps e rodar:

   ```bash
   npm install
   npm run dev
   ```

   Admin sobe em `http://localhost:3001`.

3. Aplicar migration `020_admin_roles.sql` no Supabase (se ainda não rodou).

4. Promover um usuário a admin no banco:

   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE id = 'USER_UUID';
   ```

## Módulos

- `/dashboard` — Visão Geral (Fase 1: placeholder)
- `/usuarios` — Usuários (Fase 2)
- `/servicos` — Serviços em tempo real (Fase 3)
- `/financeiro` — Escrow, liberações, reembolsos (Fase 4)
- `/disputas` — Mediação (Fase 3)
- `/hub-fiscal` — NFS-e, MEI, DAS (Fase 5)
- `/planos` — Assinaturas, upgrades, cancelamentos (Fase 5)

## Audit log

Toda ação privilegiada deve chamar `logAudit({ action, targetType, targetId, metadata })` de
`lib/audit.ts`. Os registros ficam em `public.admin_audit_log` com admin_id, IP e user-agent.
