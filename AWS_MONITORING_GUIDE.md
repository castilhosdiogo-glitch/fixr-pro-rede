# 📊 AWS Monitoring Guide — Acompanhar Saúde do Fixr

**Objetivo:** Monitorar servidor, banco e custos em tempo real  
**Tempo:** 30-45 min para setup  
**Essencial:** Sim

---

## 🎯 O Que Vamos Monitorar

```
✅ EC2 (CPU, RAM, Disk, Network)
✅ RDS PostgreSQL (Queries, Connections, CPU)
✅ S3 (Storage, Bandwidth)
✅ Logs da aplicação
✅ Custos AWS (não ultrapassar free tier)
✅ Uptime & Alertas
```

---

## 🔔 PASSO 1: CloudWatch Alarms (AWS Nativa)

### 1.1 - EC2 CPU Alarm

```
AWS Console → CloudWatch → Alarms → Create Alarm

1. Métrica
   └─ EC2 → Per-Instance Metrics
   └─ Selecionar sua instância
   └─ Métrica: CPUUtilization

2. Condição
   └─ Threshold: > 80%
   └─ For: 5 minutes
   └─ Statistic: Average

3. Ação
   └─ Send notification to SNS topic
   └─ Create new topic: fixr-alerts
   └─ Email: seu@email.com

4. Criar Alarm
```

**Fazer também para:**
- RDS CPU > 80%
- RDS Connections > 50
- Disk Space > 85%
- Network In > 1 GB/hour

### 1.2 - RDS Performance Insights

```
AWS Console → RDS → Database → Performance Insights

Acompanhar:
├─ Active Sessions (deve ser baixo)
├─ Database Load (deve ser < 1)
├─ Top SQL (queries lentas)
└─ Wait Events (o que está slow)
```

---

## 📝 PASSO 2: Logs de Aplicação

### 2.1 - Ver Logs PM2 (no servidor)

```bash
# Terminal no EC2
pm2 logs fixr-api

# Ver últimas 100 linhas
pm2 logs fixr-api --lines 100

# Ver com filtro
pm2 logs fixr-api | grep ERROR

# Ver logs de um dia
pm2 logs fixr-api --dates
```

### 2.2 - Rotacionar Logs (importante!)

```bash
# Instalar log rotator
sudo npm install -g pm2-logrotate

# Configurar
pm2 install pm2-logrotate

# Configurar PM2
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Salvar
pm2 save
```

### 2.3 - Centralizar Logs (Opcional mas recomendado)

```bash
# Instalar Sentry (error tracking)
npm install @sentry/node

# No seu código (packages/api/src/server.ts)
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://xxx@yyy.ingest.sentry.io/zzz",
  environment: "production",
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

// Agora todos os erros vão para Sentry.io
```

---

## 📈 PASSO 3: Métricas de Aplicação

### 3.1 - Instalar Node.js Monitoring

```bash
# npm
npm install express-prometheus-middleware prom-client

# Código (packages/api/src/server.ts)
import prometheusMiddleware from "express-prometheus-middleware";

const prometheus = require("prom-client");

app.use(prometheusMiddleware({
  metricsPath: "/metrics",
  defaultMetrics: { enabled: true },
  requestDurationBuckets: [0.1, 0.5, 1, 2, 5],
}));

// Acessar em: http://seu-ip:3001/metrics
```

### 3.2 - Dashboard Prometheus (Opcional)

```bash
# Instalar Prometheus localmente (seu PC)
# https://prometheus.io/download/

# Config: prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fixr-api'
    static_configs:
      - targets: ['seu-ec2-ip:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s

# Acessar em: http://localhost:9090
```

---

## 💰 PASSO 4: Monitorar Custos AWS

### 4.1 - AWS Cost Explorer

```
AWS Console → Billing → Cost Explorer

Checar:
├─ Usage by service (deve ser TUDO GRÁTIS)
├─ Daily spending (deve ser R$ 0)
├─ Forecast (para próximos meses)
└─ Free tier (deve estar dentro do limite)
```

### 4.2 - Configurar Alertas de Custo

```
AWS Console → Billing → Budgets → Create Budget

1. Budget name
   └─ fixr-free-tier-monitor

2. Budget amount
   └─ R$ 10 (se passar, alerta)

3. Alerting threshold
   └─ 50% → alerta a R$ 5
   └─ 100% → alerta a R$ 10

4. Email
   └─ seu@email.com

Pronto! Se custar algo, você é avisado
```

### 4.3 - Verificar Uso Free Tier

```
AWS Console → Billing → Free Tier

Acompanhar:
├─ EC2: Horas usadas de 750
├─ RDS: Horas usadas de 750
├─ S3: GB usados de 5
└─ Data Transfer: GB usados
```

---

## 🔍 PASSO 5: Health Check Automático

### 5.1 - Setup Health Check

```bash
# Criar rota health check (packages/api/src/routes/health.ts)
import { Router } from 'express';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const db = await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router;
```

### 5.2 - Monitorar Health (UptimeRobot)

```
https://uptimerobot.com (GRÁTIS)

1. Sign up
2. Add monitor
3. Monitor type: HTTP(s)
4. URL: http://seu-ip:3001/health
5. Check interval: 5 minutes
6. Alert email: seu@email.com

Agora você recebe email se API cair
```

---

## 📊 PASSO 6: Dashboard de Monitoramento

### 6.1 - Setup Grafana (Opcional - mais profissional)

```bash
# No seu PC ou servidor
docker run -d --name=grafana \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

# Acessar em: http://localhost:3000
# Usuário: admin / Senha: admin
```

### 6.2 - Conectar Prometheus

```
Grafana → Data Sources → Add Prometheus
URL: http://localhost:9090
```

### 6.3 - Criar Dashboard

```
Grafana → Dashboards → Create
Adicionar panels com:
├─ CPU Usage
├─ Memory Usage
├─ Request Rate
├─ Error Rate
├─ Database Connections
└─ Response Time
```

---

## 📱 PASSO 7: Alertas no Celular

### 7.1 - Telegram Bot (Muito útil!)

```bash
# Criar bot no Telegram
# Falar com @BotFather
# /newbot
# Copiar token: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Instalar no seu código
npm install node-telegram-bot-api

# Código (packages/api/src/services/alerts.ts)
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot('SEU_TOKEN', { polling: false });

export async function sendTelegramAlert(message: string) {
  await bot.sendMessage('SEU_CHAT_ID', message);
}

// Usar em qualquer erro crítico
import { sendTelegramAlert } from "@/services/alerts";

try {
  // seu código
} catch (error) {
  await sendTelegramAlert(`❌ ERRO: ${error.message}`);
}
```

### 7.2 - Telegram Alerts

```bash
# No seu código de monitoramento
if (cpuUsage > 80) {
  await sendTelegramAlert('⚠️ CPU > 80%!');
}

if (errorRate > 0.05) {
  await sendTelegramAlert('🚨 Error rate > 5%!');
}

if (isDbDown) {
  await sendTelegramAlert('❌ DATABASE DOWN!');
}
```

---

## 🚨 PASSO 8: Alertas Críticos (Must-Have)

```bash
# Em seu código (packages/api/src/jobs/monitoring.ts)
import cron from 'node-cron';

// Verificar a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  const health = await checkHealth();
  
  if (!health.database) {
    alertar('🚨 DATABASE DOWN!');
  }
  
  if (health.memory.heapUsed > 800 * 1024 * 1024) { // 800MB
    alertar('⚠️ Memory leak detectado!');
  }
  
  if (health.errorCount > 100) {
    alertar('⚠️ Muitos erros acontecendo!');
  }
});
```

---

## 📋 MONITORAMENTO DIÁRIO

### Checklist de 5 minutos (toda manhã)

```bash
# Terminal no seu PC
ssh -i fixr-prod-key.pem ubuntu@seu-ip

pm2 status
# Verificar que tudo está online

pm2 logs fixr-api --lines 50 | grep -i error
# Verificar erros overnight

# Depois, no browser
# AWS Console → CloudWatch
# Ver se teve algum alarm

# Checar Sentry.io
# https://sentry.io/organizations/

# Checar UptimeRobot
# https://uptimerobot.com
```

### Checklist Semanal

```
☑️ Revisar logs da semana
☑️ Analisar performance
☑️ Verificar custos AWS (deve ser R$ 0)
☑️ Atualizar dependências se houver patches
☑️ Fazer backup manual do DB
☑️ Revisar quota S3
```

### Checklist Mensal

```
☑️ Full audit de segurança
☑️ Análise de performance detalhada
☑️ Revisar alertas (removidos os dispensáveis)
☑️ Documentar problemas encontrados
☑️ Planejar melhorias
☑️ Revisão de custos (validar free tier)
```

---

## 🔧 Comandos Úteis

### Verificar recursos EC2

```bash
# SSH no servidor
ssh -i fixr-prod-key.pem ubuntu@seu-ip

# CPU
top -n 1 | head -n 5

# Memória
free -h

# Disco
df -h

# Processos Node.js
ps aux | grep node

# Conexões TCP
netstat -tuln | grep 3001
```

### Verificar PostgreSQL

```bash
# Conectar ao banco
psql postgresql://fixradmin:senha@seu-rds:5432/fixr_prod

# Ver queries ativas
SELECT pid, usename, application_name, state 
FROM pg_stat_activity;

# Ver tamanho do banco
SELECT 
  datname, 
  pg_size_pretty(pg_database_size(datname)) 
FROM pg_database;

# Ver tabelas grandes
SELECT 
  tablename, 
  pg_size_pretty(pg_total_relation_size(tablename)) 
FROM pg_tables 
WHERE schemaname='public' 
ORDER BY pg_total_relation_size(tablename) DESC;
```

---

## ⚠️ Red Flags (Quando Pedir Ajuda)

```
CRÍTICO - Pedir ajuda URGENTE:
❌ Database down
❌ API not responding
❌ Out of memory errors
❌ Disk 100% full
❌ High error rate (> 10%)

IMPORTANTE - Investigar hoje:
⚠️ CPU > 80% por 1 hora
⚠️ Memory > 800MB
⚠️ Queries lentas (> 5s)
⚠️ Error rate > 2%
⚠️ S3 quota próxima de 5GB

OK - Acompanhar:
✅ CPU 30-50%
✅ Memory 200-400MB
✅ Response time < 500ms
✅ Error rate < 0.1%
```

---

## 📞 Atalhos

```
AWS CloudWatch:
https://console.aws.amazon.com/cloudwatch

AWS RDS Console:
https://console.aws.amazon.com/rds

AWS Billing:
https://console.aws.amazon.com/billing

Sentry:
https://sentry.io

Prometheus:
http://localhost:9090 (seu PC)

Grafana:
http://localhost:3000 (seu PC)

UptimeRobot:
https://uptimerobot.com
```

---

## ✅ Checklist Setup Completo

```
☑️ CloudWatch alarms criados
☑️ Health check endpoint criado
☑️ UptimeRobot monitorando
☑️ Logs rotacionando
☑️ Custo alerts configurados
☑️ Telegram bot opcional (ou email)
☑️ Dashboard opcional (Grafana)
☑️ Comandos úteis documentados
☑️ Checklist diário anotado
☑️ Pronto para produção!
```

---

**Status:** ✅ Monitoramento setup  
**Próxima etapa:** FIXR_LAUNCH_CHECKLIST.md  
**Essencial:** Sim, não lance sem monitoramento
