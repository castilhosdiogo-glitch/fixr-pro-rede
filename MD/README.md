# Contexto do projeto Fixr

Este diretório concentra o contexto técnico e funcional do repositório. A leitura foi feita diretamente no código em **6 de agosto de 2026**, tomando como referência o commit `aba6d19` e preservando as alterações locais já existentes.

## Ordem de leitura

1. [Visão geral](01-visao-geral.md) — produto, público, proposta e stack.
2. [Arquitetura](02-arquitetura.md) — aplicações, dependências e organização do código.
3. [Módulos e fluxos](03-modulos-e-fluxos.md) — funcionalidades e jornadas principais.
4. [Dados e backend](04-dados-e-backend.md) — Supabase, entidades, RPCs, storage e Edge Functions.
5. [Desenvolvimento e operação](05-desenvolvimento-e-operacao.md) — ambiente local, testes, segurança e deploy.
6. [Estado atual e riscos](06-estado-atual-e-riscos.md) — inconsistências confirmadas e pontos que exigem validação.

## Resumo em uma frase

O Fixr é um marketplace brasileiro que conecta clientes a prestadores de serviços, com busca, solicitação distribuída por localização, chat, agenda, orçamento, pagamentos, reputação, formalização MEI e uma operação administrativa separada.

## Fontes de verdade adotadas

- Comportamento da interface: `src/`.
- Modelo operacional de dados: `supabase/migrations/`, complementado por `src/integrations/supabase/types.ts`.
- Administração: `admin/`.
- Deploy atual do frontend: `app.yaml`.
- Scripts disponíveis: `package.json` e `admin/package.json`.

Arquivos históricos da raiz foram usados apenas como contexto. Quando divergem do código atual, esta documentação sinaliza a divergência em vez de tratá-los como estado vigente.

