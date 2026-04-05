# Fixr — Marketplace de Serviços Domésticos Brasileiro 🇧🇷

**Versão:** 1.0  
**Status:** ✅ Em Desenvolvimento  
**Data:** 2026-04-05

---

## 📱 O que é Fixr?

Fixr é um **marketplace de serviços domésticos** que conecta clientes com profissionais autônomos no Brasil. A plataforma oferece:

- ✅ Chat em tempo real com áudio, foto e vídeo
- ✅ Hub fiscal completo (NFS-e, DAS, MEI)
- ✅ Sistema de pagamento com escrow
- ✅ 3 planos com recursos progressivos (Explorador, Parceiro, Elite)
- ✅ Notificações push em tempo real
- ✅ Alertas de limite MEI automatizados

---

## 🏗️ Stack Técnica

### Backend
- **Node.js** + Express
- **PostgreSQL** com Prisma ORM
- **AWS S3** para armazenamento de mídia
- **Firebase Cloud Messaging** para push notifications
- **Socket.io** para chat em tempo real

### Frontend
- **React Native** (iOS + Android)
- **Next.js** (Web)
- **TypeScript** em todo o projeto

### Infraestrutura
- **Supabase** (Postgres + RLS)
- **AWS** (S3 para upload)
- **Firebase** (FCM para push)
- **node-cron** para jobs agendados

---

## 💰 3 Planos

### 🟢 Explorador (Grátis)
- 8 pedidos/mês
- Chat: Texto apenas
- Hub fiscal: ❌
- Comissão: 15%
- **Ideal para:** Iniciantes testando a plataforma

### 🔵 Parceiro (R$ 19,90/mês)
- Pedidos: Ilimitado
- Chat: Texto + Áudio + Foto
- Hub Fiscal: NFS-e + DAS + MEI
- Comissão: 12%
- Destaque na busca
- **Ideal para:** Profissionais em crescimento

### 🟡 Elite (R$ 39,90/mês)
- Tudo do Parceiro
- Chat: + Vídeo (até 30s)
- Agenda integrada
- Orçamento personalizado
- Gestão de equipe (até 3 pessoas)
- Portfólio público (até 20 fotos)
- Alerta MEI em tempo real
- Topo na busca + destaque homepage
- Comissão: 10%
- **Ideal para:** Profissionais consolidados

---

## 🔐 Segurança

✅ **Validação Zod** - Todos inputs validados  
✅ **Rate Limiting** - 10 req/min (auth), 100 req/min (geral)  
✅ **Helmet** - Headers de segurança HTTP  
✅ **Sanitização** - XSS e SQL injection prevention  
✅ **RLS** - Row-Level Security no Postgres  
✅ **Masking** - Logs nunca expõem dados sensíveis  
✅ **JWT** - Refresh token com rotação automática  
✅ **AWS S3** - Upload seguro com MIME validation  

---

## 📁 Estrutura do Projeto

```
fixr/
├── apps/
│   ├── mobile/              # React Native (iOS + Android)
│   └── web/                 # Next.js (Web)
├── packages/
│   ├── api/                 # Node.js + Express
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── middlewares/ # Auth, plan validation
│   │   │   ├── services/    # Business logic
│   │   │   ├── jobs/        # Cron jobs
│   │   │   └── utils/       # Helpers (validation, etc)
│   │   └── package.json
│   ├── database/            # Prisma schema + migrations
│   └── shared/              # Tipos TypeScript compartilhados
├── .env.example             # Template de variáveis
├── FIXR_IMPLEMENTATION_GUIDE.md
├── FIXR_IMPLEMENTATION_SUMMARY.md
└── README.md (este arquivo)
```

---

## 🚀 Como Começar

### 1. Pré-requisitos
```bash
- Node.js 18+
- PostgreSQL 12+
- AWS S3 bucket
- Firebase project (FCM)
```

### 2. Clone e instale
```bash
git clone https://github.com/seu-usuario/fixr.git
cd fixr
npm install
```

### 3. Configure variáveis de ambiente
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### 4. Aplique migrations
```bash
cd packages/database
npx prisma migrate deploy
```

### 5. Inicie o servidor
```bash
npm run dev
# Servidor em http://localhost:3001
```

---

## 📚 Documentação Completa

- **[FIXR_IMPLEMENTATION_GUIDE.md](./FIXR_IMPLEMENTATION_GUIDE.md)** — Guia técnico completo
- **[FIXR_IMPLEMENTATION_SUMMARY.md](./FIXR_IMPLEMENTATION_SUMMARY.md)** — Resumo de alterações
- **[prisma/schema.prisma](./prisma/schema.prisma)** — Schema do banco de dados
- **[.env.example](./.env.example)** — Variáveis de ambiente necessárias

---

## 🔌 API Endpoints

### Chat
```
POST   /api/chat/text           — Enviar mensagem de texto
POST   /api/chat/audio          — Enviar áudio (Parceiro+)
POST   /api/chat/photo          — Enviar foto (Parceiro+)
POST   /api/chat/video          — Enviar vídeo (Elite)
GET    /api/chat/:servico_id    — Histórico de mensagens
DELETE /api/chat/:mensagem_id   — Deletar mensagem
```

### Elite Features
```
POST   /api/elite/schedule              — Criar agendamento
GET    /api/elite/schedule              — Listar agendamentos
PATCH  /api/elite/schedule/:id          — Atualizar agendamento

POST   /api/elite/quotes                — Criar orçamento
PATCH  /api/elite/quotes/:id/status    — Aprovar/recusar orçamento

POST   /api/elite/team                  — Adicionar membro
GET    /api/elite/team                  — Listar equipe

POST   /api/elite/portfolio             — Adicionar foto
GET    /api/elite/portfolio/:prof_id    — Ver portfólio público
DELETE /api/elite/portfolio/:id         — Deletar foto
```

---

## 📊 Banco de Dados

### Tabelas Principais
- **users** — Usuários (cliente/profissional)
- **professionals** — Dados profissionais
- **services** — Pedidos de serviço
- **messages** — Chat com suporte a mídia
- **payments** — Transações com escrow
- **reviews** — Avaliações

### Tabelas Elite
- **schedules** — Agenda integrada
- **quotes** — Orçamentos personalizados
- **team_members** — Equipe (máx 3)
- **portfolio** — Galeria pública (máx 20)
- **mei_limit_logs** — Rastreamento de limite MEI

---

## 🔔 Notificações Push

Eventos que disparam notificações:

### Chat
- ✅ Nova mensagem de áudio
- ✅ Nova foto recebida
- ✅ Novo vídeo recebido

### Elite
- ✅ Orçamento enviado
- ✅ Orçamento aprovado

### MEI (Elite)
- ✅ 70% do limite atingido
- ✅ 90% do limite atingido
- ✅ 100% do limite atingido

### Explorador
- ✅ 6 de 8 pedidos atingidos

---

## 🎯 Fluxo de Serviço

```
1. Cliente cria pedido
   ↓
2. Profissionais recebem notificação
   ↓
3. Profissional aceita e combina detalhes no chat
   ↓
4. Cliente realiza pagamento PIX (escrow)
   ↓
5. Backend confirma pagamento
   ↓
6. Profissional executa serviço
   ↓
7. Cliente confirma conclusão
   ↓
8. NFS-e emitida automaticamente (Parceiro+)
   ↓
9. Ambos avaliam um ao outro
   ↓
10. Repasse ao profissional em 24h (valor - comissão)
```

---

## 💼 Hub Fiscal

### NFS-e (Parceiro+)
- Emitida automaticamente quando serviço é concluído
- Enviada por push ao profissional
- PDF armazenado em S3

### Alertas DAS (Parceiro+)
- Job cron todo dia 1º do mês
- Gera DAS para cada CNPJ MEI
- Push notification com valor e vencimento

### Limite MEI (Elite)
- Monitora faturamento anual (limite: R$ 81.000)
- Alertas em 70%, 90%, 100%
- Bloqueio de NFS-e ao atingir 100%
- Reset automático em 1º de janeiro

---

## 🧪 Testes

### Executar testes
```bash
npm run test
```

### Tipos de teste
- ✅ Unit tests (funções isoladas)
- ✅ Integration tests (fluxos completos)
- ✅ API tests (endpoints)
- ✅ Load tests (performance)

---

## 📈 Métricas

Monitore:
- Taxa de conversão (free → Parceiro → Elite)
- Receita mensal recorrente (MRR)
- Número de serviços concluídos
- Nota média de satisfação
- Tempo médio de resposta no chat

---

## 🛠️ Troubleshooting

### "Erro ao enviar áudio"
1. Verificar tamanho do arquivo (máx 5MB)
2. Verificar credenciais AWS S3
3. Verificar permissões do bucket

### "Push notification não recebida"
1. Verificar se FCM está inicializado
2. Verificar se token FCM foi registrado
3. Verificar FIREBASE_PROJECT_ID no .env

### "NFS-e não emitida"
1. Verificar se profissional tem plano Parceiro+
2. Verificar credenciais Focus NFe
3. Verificar se CNPJ é válido

---

## 📞 Suporte

**Dúvidas?** Consulte:
- [FIXR_IMPLEMENTATION_GUIDE.md](./FIXR_IMPLEMENTATION_GUIDE.md)
- [FIXR_IMPLEMENTATION_SUMMARY.md](./FIXR_IMPLEMENTATION_SUMMARY.md)
- [Issues no GitHub](https://github.com/seu-usuario/fixr/issues)

---

## 📝 Licença

MIT License - veja [LICENSE](./LICENSE) para detalhes

---

## 👥 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 🎉 Roadmap

- [ ] v1.1 — Integração Infinitepay completa
- [ ] v1.2 — Dashboard administrativo
- [ ] v1.3 — App mobile (iOS + Android)
- [ ] v1.4 — Analytics avançado
- [ ] v2.0 — Recursos B2B (agências, franquias)

---

**Feito com ❤️ para melhorar o mercado de serviços domésticos no Brasil.**

Versão: 1.0  
Status: ✅ Em Desenvolvimento  
Última atualização: 2026-04-05
