# Visão geral

## Produto

O **Fixr** (também referido em alguns artefatos como Profix/Fixr Pro) é uma plataforma de contratação de serviços locais. Há dois perfis centrais:

- **Cliente:** encontra profissionais, publica uma necessidade, acompanha o atendimento, conversa, paga e avalia.
- **Profissional:** cria um perfil público, recebe oportunidades, responde aos pedidos e administra sua operação.

Usuários administrativos operam por uma aplicação separada e possuem os papéis `admin` ou `superadmin` no banco.

## Modelo comercial atual

O código da landing page e `usePlanGate.ts` define dois níveis para profissionais:

| Exibição | Identificador interno | Mensalidade | Comissão | Limites principais |
|---|---|---:|---:|---|
| Parceiro | `explorador` | Grátis | 12% | Até 8 pedidos/mês; texto e fotos |
| Profissional | `parceiro` | R$ 29,90 | 10% | Pedidos ilimitados; áudio/vídeo; agenda, orçamentos, equipe, portfólio e Hub Fiscal |

O plano interno legado `elite`, se encontrado, é convertido para `parceiro` no frontend. A nomenclatura interna não coincide com a exibida ao usuário; isso deve ser considerado em manutenção, consultas e suporte.

## Capacidades do produto

- Autenticação e recuperação de senha com Supabase Auth.
- Onboarding distinto para cliente e profissional.
- Perfis profissionais, categorias, busca e ranqueamento.
- Solicitações de serviço com localização, urgência e distribuição automática.
- Controle de oferta por categoria/cidade e lista de espera.
- Chat em tempo real com texto e mídia.
- Agenda, orçamentos, equipe e acompanhamento de receita MEI.
- Pagamentos, assinaturas, repasses e comissões.
- KYC, reputação, avaliações obrigatórias e indicações.
- Notificações internas e Web Push.
- LGPD: consentimento, exportação e solicitação de exclusão.
- PWA instalável, monitoramento de erros com Sentry e painel administrativo.

## Stack principal

| Camada | Tecnologia |
|---|---|
| Web pública/autenticada | React 18, TypeScript, Vite 5 |
| UI | Tailwind CSS 3, shadcn/ui, Radix UI, Lucide, Framer Motion |
| Rotas | React Router 6 |
| Dados no cliente | TanStack React Query 5 e Supabase JS |
| Backend ativo | Supabase: PostgreSQL, Auth, Storage, Realtime e Edge Functions em Deno |
| Admin | Next.js 16 App Router, React 18, Supabase SSR |
| Validação | Zod e React Hook Form |
| Observabilidade | Sentry no frontend |
| Testes | Vitest, Testing Library e Playwright |
| Deploy declarado | DigitalOcean App Platform para o frontend |

