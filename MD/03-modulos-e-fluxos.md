# Módulos e fluxos

## Rotas do aplicativo

### Públicas

- `/`: landing page, categorias, prova social e planos.
- `/buscar`: pesquisa de profissionais.
- `/auth`: login e cadastro.
- `/redefinir-senha`: recuperação de acesso.
- `/termos-de-uso`, `/privacidade`, `/faq`: conteúdo legal e suporte.

### Autenticadas

- `/profissional/:id`: perfil público detalhado, protegido atualmente por autenticação.
- `/mensagens`: conversas.
- `/perfil` e `/perfil/editar`: conta do usuário.
- `/dashboard`: painel do profissional.
- `/meu-painel`: painel do cliente.
- `/solicitar`: criação e acompanhamento de solicitação distribuída.
- `/indicar`: programa de referências.
- `/agenda`, `/orcamentos`, `/equipe`, `/mei-receitas`, `/hub-fiscal`: operação profissional e recursos de plano.
- `/onboarding-pro` e `/onboarding-cliente`: conclusão do cadastro por tipo de usuário.
- `/admin`: painel administrativo antigo dentro do React; existe também o admin Next.js separado.

`/orcamento/:id` é somente um redirecionamento para `/solicitar?pro=:id`.

## Jornada do cliente

1. O usuário cria conta e seleciona o tipo cliente.
2. O gate exige dados mínimos de onboarding/endereço.
3. O cliente busca um profissional diretamente ou cria uma solicitação geral.
4. A solicitação (`broadcast_requests`) é despachada a profissionais elegíveis.
5. O cliente acompanha o estado, conversa e agenda o serviço.
6. O pagamento é criado por função segura e associado ao pedido.
7. Após a conclusão, o sistema solicita avaliação e atualiza reputação.

## Jornada do profissional

1. O usuário cria conta como profissional.
2. O onboarding coleta dados pessoais/empresariais, localização, categoria, perfil, disponibilidade e dados de recebimento; há também fluxo de formação MEI.
3. O profissional passa a aparecer nas buscas conforme curadoria, disponibilidade, plano, reputação e score.
4. O motor envia oportunidades em rodadas geográficas. Respostas, recusas e tempo de resposta alimentam métricas.
5. O profissional administra mensagens, agenda, orçamentos, equipe, receitas e recursos fiscais conforme o plano.
6. KYC, avaliações e regras antifraude influenciam acesso e confiança.

## Matching e oferta

O fluxo principal parte de `broadcast_requests` e cria registros em `request_dispatches`. A função SQL `dispatch_broadcast_request` seleciona profissionais com base em distância, categoria, disponibilidade e score. O score considera, entre outros sinais, plano, avaliação, atividade, serviços concluídos, aceitação, tempo de resposta e justiça de distribuição.

Há expansão por rodadas, expiração de ofertas, resgate de pedidos sem profissional e penalidade por recusa. O módulo de oferta limita vagas por categoria/cidade, expõe ocupação e mantém `waiting_list` quando o limite é atingido.

## Comunicação e notificações

- Mensagens usam a tabela `messages` e atualizações em tempo real.
- Mídia é armazenada no bucket privado `chat-media`, com URL assinada para leitura.
- Web Push usa assinaturas salvas no banco e chaves VAPID na Edge Function.
- Notificações internas ficam em `notifications` e possuem contagem/leitura em tempo real.
- Mensagens automáticas informam eventos de serviço e avaliações.

## Monetização e financeiro

- O plano gratuito limita pedidos e cobra 12% de comissão.
- O plano pago custa R$ 29,90/mês, libera recursos e reduz a comissão para 10%.
- Assinaturas e recebedores usam Pagar.me.
- Há implementação adicional de Payment Intent do Stripe no frontend/Edge Function.
- O admin acompanha pagamentos, liberações, reembolsos, assinaturas e disputas.

## Confiança, conformidade e operação

- KYC com upload privado e revisão administrativa.
- Score de confiança, tags de reputação e avaliações.
- Bloqueio por avaliações pendentes e processamento de avaliações vencidas.
- Consentimento, exportação e exclusão de dados para LGPD.
- Curadoria de profissionais e eventos auditáveis.
- Relatórios semanais administrativos e indicadores de operação.
- Hub Fiscal, formação MEI, receita anual e alertas de limite.

## Módulos do admin Next.js

- `/dashboard`: indicadores gerais e pendências.
- `/usuarios` e `/usuarios/[id]`: perfis, KYC, suspensão e papéis.
- `/servicos` e `/servicos/[id]`: pedidos, mensagens, pagamento e disputa.
- `/financeiro`: pagamentos, repasses e reembolsos.
- `/disputas` e `/disputas/[id]`: mediação.
- `/curadoria`: revisão e histórico de profissionais.
- `/planos`: planos e assinaturas.
- `/hub-fiscal`: acompanhamento MEI e faturamento.

