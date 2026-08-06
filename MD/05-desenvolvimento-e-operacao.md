# Desenvolvimento e operação

## Pré-requisitos

- Node.js 20.x para o aplicativo principal.
- npm e acesso a um projeto Supabase compatível com as migrations.
- Supabase CLI para aplicar migrations, servir/deployar funções e executar testes SQL.
- Para E2E: navegadores do Playwright.

## Variáveis do frontend

Crie um `.env.local` na raiz, sem versioná-lo:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
VITE_SENTRY_DSN=
VITE_VAPID_PUBLIC_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
```

As duas primeiras são obrigatórias para inicializar o cliente. As demais habilitam recursos específicos.

## Execução do frontend

```bash
npm install
npm run dev
```

O Vite está configurado para `http://localhost:3000`.

Comandos disponíveis:

```bash
npm run build
npm run lint
npm test
npm run preview
npm start
```

## Execução do admin

Crie `admin/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Depois:

```bash
cd admin
npm install
npm run dev
```

O admin usa `http://localhost:3001`. A service role é segredo estritamente server-side.

## Segredos das Edge Functions

Configure no ambiente Supabase, conforme os módulos usados:

- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`;
- `STRIPE_SECRET_KEY`;
- `PAGARME_API_KEY`, `PAGARME_PARCEIRO_PLAN_ID` e `PAGARME_WEBHOOK_SECRET`;
- `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`.

Nunca use o prefixo `VITE_` em segredos: variáveis com esse prefixo entram no bundle do navegador.

## Banco e funções

As migrations devem ser aplicadas em ordem e em ambiente de homologação antes da produção. Após alteração do schema, regenere `src/integrations/supabase/types.ts` e execute testes de build, unidade e fluxo.

Há testes SQL específicos em `supabase/tests/` para despacho geográfico e carga. O diretório de Edge Functions compartilha validação e resposta em `supabase/functions/shared/`.

## Testes e qualidade

- Vitest cobre testes em `src/**/*.{test,spec}.{ts,tsx}` com jsdom.
- Playwright cobre autenticação, busca e smoke da homepage.
- ESLint analisa o projeto; `lint-staged` restringe commits com erro nos arquivos alterados.
- O Makefile agrega Gitleaks, Semgrep e build em `make security-audit`.

Sequência recomendada antes de publicar:

```bash
npm run lint
npm test
npm run build
npx playwright test
```

Execute também `npm run typecheck` e `npm run build` dentro de `admin/`.

## Deploy declarado

`app.yaml` publica a raiz como site estático na DigitalOcean App Platform, acompanhando a branch `main`:

1. `npm ci && npm run build`;
2. publicação de `dist/`;
3. fallback de SPA para `index.html`;
4. variáveis `VITE_*` injetadas em build time.

O admin e as Edge Functions não estão contemplados nesse arquivo e precisam de pipelines/deploys próprios. O PWA verifica atualizações do service worker no carregamento, a cada cinco minutos e ao voltar o foco para a página.

## Assistência Codex e sincronização de contexto

- `AGENTS.md` define as instruções operacionais do projeto para o Codex.
- `.agents/skills/` contém as skills compatíveis, incluindo especialistas com prefixo `agent-` e workflows com prefixo `workflow-`.
- O inventário convertido contém 79 skills: 48 módulos originais, 20 especialistas e 11 workflows; recursos e scripts auxiliares permanecem carregados sob demanda.
- `.agent/` permanece preservado como fonte original do Antigravity e não deve ser alterado automaticamente.
- Toda mudança que afete comportamento, arquitetura, dados, configuração, deploy ou riscos deve atualizar no mesmo trabalho o arquivo real e o documento correspondente em `MD/`.
- Validações de código e documentação devem acompanhar a mesma atualização do repositório, sem incluir alterações locais não relacionadas.
## Observabilidade e operação

- Sentry registra erros, tracing e replay com texto/mídia mascarados.
- Relatórios semanais consolidam indicadores no banco.
- Auditoria administrativa registra ator, ação, alvo, IP, user-agent e metadados.
- Jobs periódicos são necessários para alertas MEI, expiração/resgate de dispatches, reengajamento e avaliações pendentes.

