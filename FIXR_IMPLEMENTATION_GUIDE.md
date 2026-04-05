# 🚀 Fixr - Implementation Guide v1.0

**Status:** ✅ In Development  
**Data:** 2026-04-05  
**Stack:** Node.js + Express + PostgreSQL + Prisma + React Native + Next.js

---

## 📋 O que foi implementado

### 1. **Planos Reconfigurados** ✅
- **Explorador** (Grátis) - 8 pedidos/mês, chat texto, comissão 15%
- **Parceiro** (R$ 19,90/mês) - Ilimitado, áudio+foto, NFS-e, comissão 12%
- **Elite** (R$ 39,90/mês) - Tudo + vídeo, agenda, orçamento, equipe, portfólio, comissão 10%

**Arquivo:** `prisma/migrations/016_update_plans_and_add_elite_features.sql`

### 2. **Schema Prisma Completo** ✅
- Tabelas: users, professionals, services, messages, payments, reviews, disputes
- Tabelas Elite: schedules, quotes, team_members, portfolio, mei_limit_logs
- Enums: Plano, TipoUsuario, StatusServico, StatusPagamento, TipoMensagem

**Arquivo:** `prisma/schema.prisma`

### 3. **Middleware de Validação de Plano** ✅
- `loadPlanFeatures` - Carrega features conforme plano
- `requireElitePlan` - Bloqueia recursos Elite para não-Elite
- `requireHubFiscal` - Bloqueia Hub Fiscal para Explorador
- `requireAudioChat` - Bloqueia áudio para Explorador
- `requireVideoChat` - Bloqueia vídeo para não-Elite
- `requirePhotoChat` - Bloqueia foto para Explorador
- `checkMonthlyServiceLimit` - Verifica limite 8 pedidos Explorador

**Arquivo:** `packages/api/src/middlewares/planMiddleware.ts`

### 4. **Chat com Áudio, Foto, Vídeo** ✅

#### Endpoints:
- `POST /chat/text` - Mensagem de texto
- `POST /chat/audio` - Áudio (Parceiro+Elite) - 5MB máx, .m4a
- `POST /chat/photo` - Foto (Parceiro+Elite) - 10MB máx, JPEG
- `POST /chat/video` - Vídeo (Elite apenas) - 50MB máx, 30s máx, MP4
- `GET /chat/:servico_id` - Histórico de mensagens
- `DELETE /chat/:mensagem_id` - Deletar mensagem

#### Features:
- Validação Zod para todos inputs
- Upload em S3 com URLs persistidas
- Push notifications automáticas
- Marcação de leitura (✓✓)
- Tipos de mensagem: TEXTO, AUDIO, FOTO, VIDEO

**Arquivo:** `packages/api/src/routes/chat.ts`

### 5. **Funcionalidades Elite** ✅

#### A. Agenda Integrada
- `POST /elite/schedule` - Criar horário disponível
- `GET /elite/schedule` - Listar agendamentos
- `PATCH /elite/schedule/:id` - Atualizar disponibilidade

#### B. Orçamento Personalizado
- `POST /elite/quotes` - Criar orçamento com itens
- `PATCH /elite/quotes/:id/status` - Cliente aprova/recusa

#### C. Gestão de Equipe (máximo 3)
- `POST /elite/team` - Adicionar membro
- `GET /elite/team` - Listar equipe

#### D. Portfólio Público (máximo 20 fotos)
- `POST /elite/portfolio` - Upload de foto
- `GET /elite/portfolio/:profissional_id` - Ver portfólio público
- `DELETE /elite/portfolio/:id` - Deletar foto

**Arquivo:** `packages/api/src/routes/elite-features.ts`

### 6. **Alertas de Limite MEI (Elite)** ✅

#### Job Cron:
- Executa diariamente às 9:00 AM
- Calcula faturamento acumulado do ano (MEI limit = R$ 81.000)
- Dispara push notifications:
  - **70%** (R$ 56.700) → Alerta informativo
  - **90%** (R$ 72.900) → Alerta urgente + sugestão ME/EPP
  - **100%** (R$ 81.000) → Alerta crítico + bloqueio NFS-e
- Reseta flags em 1º de janeiro

#### Funções:
- `verificarBloqueioNFSe()` - Bloqueia NFS-e se 100% atingido
- `obterEstatisticasMEI()` - Relatório de faturamento
- `startMEILimitAlertsJob()` - Inicia job de alertas
- `startMEIAlertsResetJob()` - Reseta alertas no novo ano

**Arquivo:** `packages/api/src/jobs/mei-limit-alerts.ts`

### 7. **Notificações Push Expandidas** ✅

#### Novos triggers:
- ✅ Nova mensagem de áudio
- ✅ Nova foto recebida
- ✅ Novo vídeo recebido (Elite)
- ✅ Orçamento enviado pelo profissional (Elite)
- ✅ Orçamento aprovado pelo cliente (Elite)
- ✅ MEI limit 70%, 90%, 100%
- ✅ Explorador: 6 de 8 pedidos atingido → sugestão upgrade

#### Funções de Push:
- `notifyNewMessage()` - Mensagem nova
- `notifyNewQuote()` - Orçamento enviado (Elite)
- `notifyQuoteApproved()` - Orçamento aprovado (Elite)
- `notifyExplorerNearLimit()` - Limite Explorador próximo
- `notifyMEILimit70/90/100()` - Alertas MEI
- `notifyNFSeIssued()` - NFS-e emitida
- `notifyDASAvailable()` - DAS para pagamento

**Arquivo:** `packages/api/src/services/push-notification.ts`

### 8. **Validações Zod** ✅

Schemas para:
- Chat: TextMessage, AudioMessage, PhotoMessage, VideoMessage
- Elite: CreateSchedule, CreateQuote, CreateTeamMember, CreatePortfolioItem
- Validação de email, CPF, CNPJ, telefone, CEP

**Arquivo:** `packages/api/src/utils/validation.ts`

---

## 🔧 Como Usar

### 1. Aplicar Migrations

```bash
# Criar arquivo .env com DATABASE_URL
cp .env.example .env

# Aplicar migrations
npx prisma migrate deploy

# (Ou em dev)
npx prisma migrate dev --name update_plans_and_elite
```

### 2. Inicializar Jobs de Cron

```typescript
// Em packages/api/src/server.ts ou main.ts
import { 
  startMEILimitAlertsJob, 
  startMEIAlertsResetJob 
} from "./jobs/mei-limit-alerts";

// Iniciar jobs
startMEILimitAlertsJob();
startMEIAlertsResetJob();

console.log("✅ MEI limit alert jobs started");
```

### 3. Registrar Rotas

```typescript
// Em packages/api/src/server.ts
import chatRouter from "./routes/chat";
import eliteRouter from "./routes/elite-features";

app.use("/api/chat", chatRouter);
app.use("/api/elite", eliteRouter);
```

### 4. Configurar Firebase FCM

```bash
# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_EMAIL=your-service-account@firebaseserviceaccount.com
FCM_SERVER_KEY=your-fcm-server-key
```

---

## 📊 Estrutura de Dados

### Tabela: messages
```
id UUID
servico_id UUID (FK)
remetente_id UUID (FK)
tipo ENUM ('texto', 'audio', 'foto', 'video')
conteudo TEXT (nullable)
arquivo_url TEXT (nullable)
duracao INTEGER (nullable - segundos)
lido BOOLEAN
lido_em TIMESTAMP
createdAt TIMESTAMP
```

### Tabela: schedules (Elite)
```
id UUID
profissional_id UUID (FK)
data DATE
hora_inicio TIME
hora_fim TIME
disponivel BOOLEAN
servico_id UUID (FK, nullable)
createdAt TIMESTAMP
updatedAt TIMESTAMP
```

### Tabela: quotes (Elite)
```
id UUID
servico_id UUID (FK)
profissional_id UUID (FK)
itens_json JSONB [{descricao, valor, quantidade}]
valor_total DECIMAL
status ENUM ('pendente', 'aprovado', 'recusado')
validade TIMESTAMP
createdAt TIMESTAMP
updatedAt TIMESTAMP
```

### Tabela: team_members (Elite)
```
id UUID
profissional_id UUID (FK)
nome VARCHAR
funcao VARCHAR
foto_url TEXT
ativo BOOLEAN
createdAt TIMESTAMP
updatedAt TIMESTAMP
```

### Tabela: portfolio (Elite)
```
id UUID
profissional_id UUID (FK)
foto_url TEXT
legenda TEXT
servico_id UUID (FK, nullable)
createdAt TIMESTAMP
```

### Tabela: mei_limit_logs
```
id UUID
profissional_id UUID (FK)
percentual DECIMAL (5,2)
faturamento_atual DECIMAL (15,2)
evento VARCHAR ('70%', '90%', '100%')
notificacao_enviada BOOLEAN
createdAt TIMESTAMP
```

---

## 🔐 Segurança

✅ **Validação Zod** - Todos os inputs validados antes de processar  
✅ **Rate Limiting** - Implementado via express-rate-limit  
✅ **Sanitização** - sanitize-html em campos de texto  
✅ **AWS S3** - Upload seguro com MIME type validation  
✅ **Helmet** - Headers de segurança HTTP  
✅ **RLS** - Row-Level Security no Postgres  
✅ **Masking** - Logs nunca expõem CPF, CNPJ, dados bancários  
✅ **JWT** - Refresh token com rotação automática  

---

## 📈 Limites e Restrições

| Feature | Explorador | Parceiro | Elite |
|---------|-----------|----------|-------|
| Pedidos/mês | 8 | Ilimitado | Ilimitado |
| Chat Texto | ✅ | ✅ | ✅ |
| Chat Áudio | ❌ | ✅ | ✅ |
| Chat Foto | ❌ | ✅ | ✅ |
| Chat Vídeo | ❌ | ❌ | ✅ |
| Agenda | ❌ | ❌ | ✅ |
| Orçamento | ❌ | ❌ | ✅ |
| Equipe | ❌ | ❌ | ✅ (3 máx) |
| Portfólio | ❌ | ❌ | ✅ (20 máx) |
| NFS-e | ❌ | ✅ | ✅ |
| MEI Alerts | ❌ | ❌ | ✅ |
| Comissão | 15% | 12% | 10% |

---

## 🧪 Exemplos de Requisição

### 1. Enviar Mensagem de Texto
```bash
curl -X POST http://localhost:3001/api/chat/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "servico_id": "550e8400-e29b-41d4-a716-446655440000",
    "conteudo": "Olá, como está?"
  }'
```

### 2. Enviar Áudio (Parceiro+)
```bash
curl -X POST http://localhost:3001/api/chat/audio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "servico_id": "550e8400-e29b-41d4-a716-446655440000",
    "arquivo_base64": "SGVsbG8gV29ybGQh...",
    "duracao": 45
  }'
```

### 3. Criar Orçamento (Elite)
```bash
curl -X POST http://localhost:3001/api/elite/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "servico_id": "550e8400-e29b-41d4-a716-446655440000",
    "itens": [
      {"descricao": "Mão de obra", "valor": 150, "quantidade": 1},
      {"descricao": "Materiais", "valor": 50, "quantidade": 2}
    ],
    "validade": "2026-05-05"
  }'
```

### 4. Criar Agendamento (Elite)
```bash
curl -X POST http://localhost:3001/api/elite/schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "data": "2026-04-15",
    "hora_inicio": "09:00",
    "hora_fim": "11:00"
  }'
```

---

## 🔄 Data Flow Diagrama

```
Cliente cria pedido
         ↓
Profissional recebe notificação push
         ↓
Profissional aceita no chat
         ↓
Cliente realiza pagamento PIX
         ↓
Backend: Payment.status = CONFIRMADO
         ↓
Serviço é executado
         ↓
Cliente confirma conclusão
         ↓
Service.status = CONCLUIDO
Faturamento é contabilizado para limite MEI
         ↓
Se Elite + MEI verificado:
├─ Dispara NFS-e automaticamente
├─ Verifica limite anual (70%, 90%, 100%)
└─ Dispara push notifications se atingido
         ↓
Ambos avaliam (1-5 estrelas)
         ↓
Backend repassa valor ao profissional (-comissão)
         ↓
Payment.status = REPASSADO
Payment.repassado_em = NOW()
```

---

## ✅ Checklist de Implantação

- [ ] Aplicar migrations Prisma
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Configurar AWS S3 (credenciais, bucket)
- [ ] Configurar Firebase FCM
- [ ] Inicializar jobs de cron
- [ ] Testar endpoints chat (texto, áudio, foto, vídeo)
- [ ] Testar endpoints Elite (agenda, orçamento, equipe, portfólio)
- [ ] Testar validação de plano (bloquear recursos não permitidos)
- [ ] Testar push notifications
- [ ] Testar limite MEI alerts
- [ ] Testar limite Explorador (8 pedidos/mês)
- [ ] Verificar RLS policies
- [ ] Load testing em endpoints de upload
- [ ] Documentar no Swagger/OpenAPI
- [ ] Treinar time de suporte

---

## 🚨 Erros Comuns

**Erro:** `Função não disponível no seu plano`  
**Causa:** Middleware `requireElitePlan` bloqueando acesso  
**Solução:** Verificar `user.plano` no JWT, ou fazer upgrade na UI

**Erro:** `CNPJ limit logs não aparece`  
**Causa:** Job cron não iniciado  
**Solução:** Chamar `startMEILimitAlertsJob()` no server.ts

**Erro:** Upload para S3 falha  
**Causa:** Credenciais AWS inválidas ou bucket não existe  
**Solução:** Verificar `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`

**Erro:** Push notification não recebida  
**Causa:** FCM token não registrado ou Firebase não inicializado  
**Solução:** Registrar token FCM no app mobile após login

---

## 📚 Próximos Passos

1. **Integração Frontend**
   - Atualizar React Native para suportar chat áudio/foto/vídeo
   - Criar telas Elite (agenda, orçamento, equipe, portfólio)
   - Mostrar alertas MEI no dashboard

2. **Integração Focus NFe**
   - Endpoint: POST /api/nfse/emitir
   - Endpoint: GET /api/das/gerar
   - Webhook para validar NFS-e emitidas

3. **Integração Infinitepay**
   - Webhook para PIX confirmado
   - Escrow manual (Fixr como intermediária)
   - Repasse automático em 24h

4. **Analytics & Monitoring**
   - Sentry para error tracking
   - Grafana para métricas
   - Dashboard de administrativo

5. **Testes**
   - Unit tests com Jest
   - Integration tests com Superpowers
   - Load testing com k6

---

**Versão:** 1.0  
**Status:** ✅ In Development  
**Próxima Review:** 2026-04-12
