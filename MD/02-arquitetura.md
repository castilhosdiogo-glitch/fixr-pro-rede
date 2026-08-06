# Arquitetura

## Visão de componentes

```text
Navegador / PWA
  └─ React + Vite (src/)
       ├─ Supabase Auth
       ├─ PostgREST / RPC ───────┐
       ├─ Realtime               │
       ├─ Storage                ├─ Supabase
       └─ Edge Functions ────────┘

Operador administrativo
  └─ Next.js (admin/)
       ├─ Supabase SSR (sessão e consultas)
       └─ Service Role apenas no servidor (auditoria/ações privilegiadas)

Serviços externos usados pelo backend
  ├─ Pagar.me e Stripe (pagamentos)
  ├─ Web Push/VAPID
  ├─ ViaCEP, Nominatim e consulta de CNPJ
  └─ Sentry (telemetria do frontend)
```

## Aplicativo React

O ponto de entrada é `src/main.tsx`. Ele inicializa o Sentry quando há DSN, registra o service worker `public/sw.js` e renderiza `src/App.tsx`.

`App.tsx` compõe os providers globais nesta ordem: Helmet, React Query, autenticação, tooltips, notificações visuais, roteador, layout, limite de erro, carregamento assíncrono e gate de onboarding. As páginas secundárias usam `lazy()` para reduzir o bundle inicial.

Organização relevante:

- `src/pages/`: páginas e jornadas de usuário.
- `src/components/`: componentes de domínio e biblioteca visual.
- `src/hooks/`: acesso a dados e regras de negócio no frontend.
- `src/services/`: serviços de domínio, atualmente com foco em MEI.
- `src/integrations/supabase/`: cliente Supabase e tipos gerados.
- `src/lib/`: integrações utilitárias, como CEP, geocodificação e CNPJ.
- `src/schemas/`: schemas Zod.
- `src/test/` e `e2e/`: testes unitários/integrados e ponta a ponta.

## Painel administrativo

`admin/` é uma aplicação Next.js independente, executada na porta 3001. O proxy protege as rotas e o layout administrativo confirma no banco se o perfil possui papel `admin` ou `superadmin`.

As leituras normais usam o cliente Supabase associado à sessão. A `SUPABASE_SERVICE_ROLE_KEY` fica restrita ao servidor e é usada, entre outros pontos, para gravar `admin_audit_log`. Toda nova ação privilegiada deve produzir registro de auditoria.

## Backend Supabase

O backend efetivamente integrado ao frontend está em `supabase/`:

- `migrations/`: evolução do schema, RLS, triggers, views e RPCs.
- `functions/`: funções HTTP serverless.
- `tests/`: smoke e carga do despacho geográfico.
- `config.toml`: vínculo com o projeto Supabase.

O navegador consulta tabelas/views e chama RPCs conforme as políticas RLS. Operações com segredos ou privilégios elevados ficam nas Edge Functions.

## Código paralelo ou legado

- `prisma/schema.prisma` descreve outro modelo PostgreSQL, com nomes e entidades diferentes do schema Supabase em uso. Não há dependência Prisma no `package.json` principal.
- `packages/api/` contém rotas e serviços Express/AWS/Firebase, mas não possui `package.json`, arquivo de bootstrap ou integração identificável com o frontend atual.
- Guias antigos de AWS/EC2/RDS e alguns resumos da raiz representam uma arquitetura anterior ou proposta, não a implantação confirmada pelo código vigente.

Esses artefatos não devem ser tratados como fonte de verdade sem uma decisão explícita de reativação ou remoção.

