# PROFIX — Plano de Testes Pré-Lançamento com Superpowers

**Semana que vem:** Hospedagem + Testes Reais  
**Objetivo:** Validar 5 fluxos críticos antes de lançar pro público

---

## **INSTALAÇÃO SUPERPOWERS**

No Claude Code, instale o plugin:

```bash
/plugin install superpowers@claude-plugins-official
```

Depois, todos os skills abaixo estarão disponíveis via `/` commands:
- `/brainstorming` — explorar requisitos
- `/execute-plan` — rodar plano em batch
- `/request-code-review` — revisar código
- `/receiving-code-review` — receber feedback

---

## **FASE 1: BRAINSTORMING — 1-2 horas**

Rodar `/brainstorming` para cada fluxo crítico. Prompt:

### **Fluxo 1: Payment (Pagamento)**

```
/brainstorming

Quero validar o fluxo de pagamento completo do PROFIX antes de lançar:
- Cliente cria solicitação de serviço
- Preenche valor (R$1-R$100k)
- Paga via Stripe
- Stripe confirma
- Profissional recebe payout automático

O que pode dar errado? Quais são os cenários edge case que precisamos testar?
Quais validações são críticas? Qual é a sequência exata que precisa acontecer?
```

**Output esperado:** Lista de 15-20 scenarios (happy path + edge cases)

---

### **Fluxo 2: KYC (Verificação)**

```
/brainstorming

Quero validar o fluxo KYC completo:
- Profissional faz upload de documentos (CPF/RG/Selfie)
- Arquivos salvos em Storage privado
- Admin revisa fila
- Admin aprova ou rejeita
- Notificação automática pro profissional

Quais são os cenários críticos? Arquivo inválido? Size limit? Timeout no upload?
```

---

### **Fluxo 3: Push Notifications**

```
/brainstorming

Quero testar push notifications em produção:
- Profissional ativa notificações
- Matching engine cria dispatch
- Web Push chega em <5 segundos
- Profissional clica → abre app
- Dispatch expira em 5min

Quais são os pontos de falha? Sem service worker? CORS? Device desligado?
```

---

### **Fluxo 4: LGPD**

```
/brainstorming

Quero validar LGPD compliance:
- Usuário novo vê checkbox consentimento (obrigatório)
- Consentimento salvo no banco
- Usuário consegue deletar seus dados (RPC)
- Dados deletados: profile anonymizada, messages deletadas
- Não pode haver dados orphaned

Quais dados precisam estar 100% limpos? Logs? Backups?
```

---

### **Fluxo 5: Agendamento**

```
/brainstorming

Quero testar agendamento:
- Profissional aceita serviço
- Clica "Agendar" → datepicker
- Seleciona data/hora
- Confirma
- Status muda pra "scheduled"
- Cliente vê data em dashboard
- Profissional consegue remarcar

Quais validações? Datas passadas? Fuso horário? Conflito de agendas?
```

---

## **FASE 2: PLANNING — 2-3 horas**

Após brainstorming, rodar `/execute-plan` com um prompt estruturado:

```
/execute-plan

Com base nos brainstormings anteriores, crie um plano de testes TDD:

1. Para cada fluxo crítico (Payment, KYC, Push, LGPD, Scheduling):
   - Liste todos os test cases em ordem de criticidade
   - Para cada test case, defina:
     - RED: como falha (ou como deveria falhar)
     - GREEN: como passar
     - REFACTOR: como limpar código

2. Organize em sequência:
   - Primeira semana: Payment + LGPD (core monetization + legal)
   - Segunda semana: KYC + Push + Scheduling (user experience)

3. Cada test case deve ter:
   - Preconditions (estado inicial)
   - Steps (ações exatas)
   - Expected result (o que deveria acontecer)
   - Acceptance criteria (como validar)

Output: Um documento step-by-step que qualquer person consegue seguir.
```

**Output esperado:** Plano TDD com 50+ test cases, organizados por semana

---

## **FASE 3: EXECUTION — 3-5 dias**

Rodar os testes na sequência do plano:

### **Semana 1: Core Tests (Payment + LGPD)**

#### **Payment Test 1: Valid Amount**

**RED** (falha esperada):
```bash
# Tenta pagar R$50 sem validação
curl -X POST https://seu-dominio/functions/create-payment-intent \
  -H "Authorization: Bearer {token}" \
  -d '{"broadcast_id": "...", "amount_cents": 5000, ...}'
  
# Esperado FALHA: sem validação, vai criar intent inválido
```

**GREEN** (passa):
```bash
# Com validação, aceita valores entre R$100 (R$1.00) e 10,000,000 (R$100k)
# Rejeita <100 e >10,000,000
# Test: pagar R$50 → erro 400 "Amount too low"
# Test: pagar R$200k → erro 400 "Amount too high"
# Test: pagar R$50 corretamente → sucesso
```

**REFACTOR:**
- Extract `validate_payment_amount(cents)` function
- Use em edge function + hook

---

#### **Payment Test 2: Idempotency**

**RED:**
```bash
# Primeira chamada com amount=5000
Request 1: POST /create-payment-intent {..., idempotency_key: "abc123"}
Response: client_secret = "pi_1234..."

# Mesma chamada de novo
Request 2: POST /create-payment-intent {..., idempotency_key: "abc123"}
Response: ERROR ou DUPLICATE (sem idempotency)
```

**GREEN:**
```bash
# Idempotency implementado:
Request 2 com mesma key → retorna MESMO client_secret
sem criar novo Payment Intent
```

---

#### **LGPD Test 1: Consentimento Obrigatório**

**RED:**
```bash
# Usuario registra sem checkbox
POST /auth/signup {email, password, fullName, ...}
Resultado: Cadastro OK (sem validação)
```

**GREEN:**
```bash
# Com validação:
POST /auth/signup SEM privacyAccepted: true
Resultado: 400 "Privacy acceptance required"

POST /auth/signup COM privacyAccepted: true
Resultado: 200 OK + record em user_consents table
```

---

#### **LGPD Test 2: Deletar Dados**

**RED:**
```bash
# Usuario pede deletar dados
POST /user/delete-data {password: "..."}
Resultado: Parece deletar, mas dados ainda existem em mensagens/reviews
```

**GREEN:**
```bash
# Com RPC delete_user_data:
POST /user/delete-data
- Profile: anonymiza pra "Usuário Deletado"
- Messages: DELETA (permanente)
- Reviews: anonymiza comentário
- Push subscriptions: deleta
- Consents: deleta

Validar: 0 dados pessoais sobram no banco
```

---

### **Semana 2: UX Tests (KYC + Push + Scheduling)**

**KYC Test 1:** Upload de arquivos
- CPF inválido → rejeit
- Arquivo >5MB → rejeita
- jpg/png OK → aceita

**KYC Test 2:** Admin review
- Admin vê fila com 3+ documentos
- Click "Approve" → profissional recebe notificação
- Profissional vê "Verificado" na profile

**Push Test 1:** Subscribe
- Click "Ativar notificações"
- Browser pede permission
- Click OK → subscription salvo
- Dashboard mostra "Notificações ativas"

**Push Test 2:** Dispatch trigger
- Criar dispatch via matching engine
- Profissional vê push em <5 segundos
- Click push → abre `/dashboard`
- Dispatch visível com "Aceitar" button

**Scheduling Test 1:** Agendar
- Profissional aceita serviço
- Click "Agendar"
- Seleciona data/hora futura
- Click "Confirmar"
- Status muda pra "Agendado"
- Cliente vê data em seu dashboard

---

## **FASE 4: REVIEW — 1-2 horas**

Após cada test phase, rodar `/request-code-review`:

```
/request-code-review

Temos a seguinte implementação de Payment:
- Edge function create-payment-intent
- Hook usePayment
- Component StripePaymentForm
- Migration 014_payments.sql
- Migration 015_payment_idempotency_lgpd.sql

Queremos revisar:
1. Segurança: validações são suficientes?
2. Idempotency: está garantida?
3. Error handling: todos os casos estão cobertos?
4. Performance: há N+1 queries ou blocking ops?

Rodar code review contra plano de testes.
```

---

## **CHECKLIST EXECUÇÃO**

### **Antes de Hospedar**
- [ ] Instalar Superpowers plugin
- [ ] Rodar brainstormings (1-2h)
- [ ] Gerar plano de testes (2-3h)
- [ ] Documentar todos os test cases

### **Semana 1 de Produção**
- [ ] Rodar Payment tests (vermelho → verde)
- [ ] Rodar LGPD tests (vermelho → verde)
- [ ] Code review on Payment + LGPD code
- [ ] Deploy fixes se necessário

### **Semana 2 de Produção**
- [ ] Rodar KYC tests
- [ ] Rodar Push tests
- [ ] Rodar Scheduling tests
- [ ] Code review on all UX changes
- [ ] Final pass: todas as validações?

### **Go-Live Criteria**
- [ ] 100% de test cases passando
- [ ] 0 erros críticos (500s) em logs
- [ ] Sentry/monitoring ativos
- [ ] Support email respondendo

---

## **COMO USAR SUPERPOWERS SKILLS**

### **/brainstorming**
Use quando: Explorar edge cases antes de codificar
Output: Lista de scenarios e validações necessárias

### **/execute-plan**
Use quando: Você tem requisitos, quer um plano detalhado
Output: Step-by-step plan (Red-Green-Refactor)

### **/request-code-review**
Use quando: Finalizou implementação, quer revisar
Output: Feedback em: security, quality, efficiency, testing

### **/receiving-code-review**
Use quando: Recebeu feedback, quer implementar
Output: Implementação das melhorias sugeridas

---

## **DICAS PRO**

1. **Rodar em sequência:** Brainstorm → Plan → Execute → Review
2. **Não pular Red:** Testes devem FALHAR primeiro (prova que a validação não existe)
3. **Documentar tudo:** Cada test case precisa de reproducible steps
4. **Automate quando possível:** Scripts para rodar testes em batch
5. **Log everything:** Erros, timestamps, user IDs — vai ajudar a debugar

---

## **TIMING SUGERIDO**

```
Segunda (1h):
  - Setup Superpowers
  - Brainstorm Payment + LGPD

Terça-Quarta (3h):
  - Brainstorm KYC + Push + Scheduling
  - Gerar plano completo

Quinta-Sexta (4h):
  - Rodar primeiros tests (Payment RED → GREEN)
  - Deploy em staging
  - Validar idempotency + LGPD

Próxima semana (5 dias):
  - Testes reais em produção
  - Fix bugs descobertos
  - Code review + refactor
  - Go-live quando 100% passando
```

---

**Sucesso! Superpowers vai transformar testes caóticos em ciclos disciplinados Red-Green-Refactor.** 🚀
