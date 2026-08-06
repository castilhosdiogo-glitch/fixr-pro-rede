# Estado atual e riscos

Este documento registra apenas fatos visíveis no repositório em 6 de agosto de 2026. Ele não confirma quais migrations, secrets, crons ou funções estão efetivamente publicados no ambiente remoto.

## Implementação observada

- Frontend React amplo, com rotas públicas, cliente, profissional e um admin antigo.
- Admin Next.js separado com módulos de operação, finanças, disputas e curadoria.
- 44 arquivos de migration e 11 Edge Functions de domínio.
- Último commit inspecionado: `aba6d19`, hardening de quatro políticas RLS.
- Deploy estático do frontend declarado para DigitalOcean.

## Divergências que merecem ação

1. **Documentação histórica:** `PROJECT_CONTEXT.json` data de abril de 2026, descreve três planos e afirma que recursos não foram publicados. O código atual trabalha com dois planos e contém esses recursos. Não usar esse JSON como estado operacional.
2. **Tipos Supabase defasados:** `types.ts` não contém várias tabelas/colunas usadas pelo código atual. Isso leva a casts `any`/`unknown`, reduz a verificação do TypeScript e pode esconder incompatibilidades.
3. **Dois modelos de backend:** Prisma e `packages/api/` descrevem uma arquitetura AWS/Express paralela, enquanto o app usa Supabase. O pacote de API não possui manifesto nem bootstrap e aparenta estar incompleto/legado.
4. **Duas soluções de pagamento:** Stripe e Pagar.me coexistem. É necessário definir qual fluxo é oficial, quais estados são canônicos e como conciliação/reembolso funcionam.
5. **Dois painéis administrativos:** existe `/admin` no React e um app Next.js dedicado. Manter ambos aumenta risco de regras e permissões divergentes.
6. **Playwright aponta para a porta 3001:** essa porta pertence ao admin, mas os testes E2E acessam landing, busca e autenticação do frontend, configurado na porta 3000. A suíte pode testar o alvo errado ou depender de um proxy não documentado.
7. **Docker Compose inconsistente:** referencia `Dockerfile`, mas o repositório lista apenas `Dockerfile.bak`.
8. **README raiz genérico:** ainda contém o template do Lovable e não explica o produto nem o setup real.
9. **Versão do admin:** `admin/README.md` informa Next.js 15, enquanto `admin/package.json` usa Next.js 16.
10. **Nomenclatura de planos:** os IDs internos `explorador`/`parceiro` são exibidos como Parceiro/Profissional. Integrações e suporte podem mapear o plano incorretamente.
11. **Comissão conflitante:** `usePayment.ts` ainda define `COMMISSION_PERCENT = 15`, enquanto o gate atual define 12% e 10%. Mesmo não sendo usado nesse arquivo, é sinal de regra duplicada.
12. **Deploy incompleto no manifesto:** `app.yaml` publica somente o frontend; não há definição equivalente ali para admin, funções ou jobs periódicos.

## Validações prioritárias antes de produção

- Comparar o banco remoto com todas as migrations e regenerar os tipos.
- Confirmar RLS e Storage com usuários cliente, profissional, admin e anônimo.
- Confirmar o provedor de pagamento oficial e testar webhook, idempotência, reembolso e repasse.
- Corrigir o alvo do Playwright e automatizar frontend + admin em CI.
- Inventariar funções e crons realmente implantados.
- Decidir e arquivar/remover, em mudança separada, Prisma, `packages/api/`, admin React e guias antigos que não façam mais parte da arquitetura.
- Testar PWA após deploy, inclusive atualização de cache e navegação offline.
- Validar onboarding completo, matching geográfico, chat/mídia, conclusão e avaliação em homologação.

## Alterações locais preservadas

No momento da documentação já havia arquivos modificados ou novos fora de `MD/`, incluindo itens em `.claude/`, `.codex/`, `Fixr/`, `admin/` e três Edge Functions. Nenhum deles foi alterado por esta tarefa.

