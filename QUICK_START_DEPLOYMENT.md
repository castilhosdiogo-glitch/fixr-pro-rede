# 🚀 Quick Start — Deploy Fixr em 4 Passos (30 min)

**Se você já leu AWS_FREE_TIER_SETUP.md, siga isto:**

---

## ✅ RESUMO: O Que Você Precisa Fazer

```
1. Criar conta AWS (5 min)
2. Setup EC2 + RDS + S3 (15 min via console)
3. SSH no servidor e deploy código (10 min)
4. Testar e monitorar (5 min)

Total: ~35 minutos
```

---

## 🎯 PASSO 1: AWS Setup (15 min)

### 1.1 Criar e Configurar (do console AWS)
```
✅ EC2 t2.micro + Ubuntu 22.04 (grátis)
✅ RDS PostgreSQL t2.micro (grátis)
✅ S3 Bucket com CORS ativado (grátis 5GB)
✅ Security Groups abertos em 22, 80, 443, 3001
✅ Elastic IP atribuído
✅ Backup automático 7 dias

Referência: AWS_FREE_TIER_SETUP.md (Passos 1-5)
```

### 1.2 Obter Credenciais
```
Anotadas:
□ EC2 Public IP: 54.xxx.xxx.xxx
□ RDS Endpoint: fixr-prod-db.xxx.rds.amazonaws.com
□ RDS Password: sua-senha-segura
□ AWS Access Key ID: AKIA...
□ AWS Secret Access Key: wJal...
□ S3 Bucket: fixr-files-prod-xxxx
```

---

## 💻 PASSO 2: Deploy Backend (10 min)

### 2.1 Conectar ao EC2
```bash
# No seu computador
ssh -i fixr-prod-key.pem ubuntu@54.xxx.xxx.xxx
# Enter "yes" se pergunta

# Agora você está no servidor!
```

### 2.2 Setup Rápido
```bash
# Atualizar
sudo apt update && sudo apt upgrade -y

# Instalar Node + Git + PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git
sudo npm install -g pm2

# Clonar repositório
cd /home/ubuntu
git clone https://github.com/SEU_USUARIO/fixr.git
cd fixr
npm install
```

### 2.3 Configurar .env
```bash
# Editar arquivo
nano packages/api/.env

# Adicionar:
DATABASE_URL="postgresql://fixradmin:SENHA@fixr-prod-db.xxx.rds.amazonaws.com:5432/fixr_prod"
JWT_SECRET="gerar-secret-aleatorio-32-chars"
JWT_REFRESH_SECRET="outro-secret-32-chars"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="wJal..."
AWS_BUCKET_NAME="fixr-files-prod-xxxx"
FIREBASE_PROJECT_ID="seu-firebase"
FIREBASE_SERVICE_ACCOUNT_EMAIL="seu@firebase.iam.gserviceaccount.com"
FCM_SERVER_KEY="seu-fcm-key"
API_PORT=3001
NODE_ENV="production"

# Salvar: Ctrl+X, Y, Enter
```

### 2.4 Deploy
```bash
# Build
npm run build

# Migrations
npx prisma migrate deploy

# Iniciar com PM2
cd packages/api
pm2 start "npm run start" --name "fixr-api"
pm2 startup
pm2 save

# Verificar
pm2 status
pm2 logs fixr-api
```

---

## 🌐 PASSO 3: Deploy Frontend (5 min)

### 3.1 Vercel Automático
```
https://vercel.com
→ Import GitHub repo
→ Selecione seu fixr
→ Configurar NEXT_PUBLIC_API_URL:
   https://54.xxx.xxx.xxx:3001

→ Deploy automático!
```

---

## ✅ PASSO 4: Testar (5 min)

### 4.1 Testar API
```bash
# Do seu PC
curl http://54.xxx.xxx.xxx:3001/api/health

# Resposta esperada:
{"status":"ok","timestamp":"...","database":"connected"}
```

### 4.2 Testar Site
```
https://seu-fixr.vercel.app
```

### 4.3 Alertas
```
UptimeRobot: https://uptimerobot.com
→ Add Monitor
→ HTTP(s): http://54.xxx.xxx.xxx:3001/api/health
→ Email: seu@email.com
```

---

## 🎉 PRONTO!

```
✅ Backend rodando em http://54.xxx.xxx.xxx:3001
✅ Frontend em https://seu-fixr.vercel.app
✅ Banco PostgreSQL conectado
✅ Uploads funcionando em S3
✅ Alertas monitorando
✅ Tudo GRÁTIS

🚀 VOCÊ PODE LANÇAR!
```

---

## 📋 Dados Importantes (Guardar!)

```
SSH:
ssh -i fixr-prod-key.pem ubuntu@54.xxx.xxx.xxx

PM2 (no servidor):
pm2 status
pm2 logs fixr-api
pm2 restart fixr-api

Database:
postgresql://fixradmin:senha@endpoint:5432/fixr_prod

APIs:
Backend: http://54.xxx.xxx.xxx:3001
Frontend: https://seu-fixr.vercel.app
Health: http://54.xxx.xxx.xxx:3001/api/health
```

---

## 🆘 Problemas?

```
API não responde?
→ ssh no servidor
→ pm2 status (ver se está online)
→ pm2 logs fixr-api (ver erro)

PostgreSQL não conecta?
→ Verificar DATABASE_URL em .env
→ Verificar Security Group do RDS
→ Verificar senha

S3 upload não funciona?
→ Verificar AWS credentials em .env
→ Verificar CORS do bucket S3
→ Verificar se bucket existe
```

---

## 📚 Documentação Completa

```
Setups detalhado:
→ AWS_FREE_TIER_SETUP.md (completo, 4-5 horas)

Checklist pré-lançamento:
→ FIXR_LAUNCH_CHECKLIST.md

Monitoramento:
→ AWS_MONITORING_GUIDE.md
```

---

## 💰 Custos

```
Mês 1-12:
├─ EC2: R$ 0 (750h grátis)
├─ RDS: R$ 0 (750h grátis)
├─ S3: R$ 0 (5GB grátis)
├─ Firebase FCM: R$ 0 (ilimitado)
└─ TOTAL: R$ 0 ✅

Mês 13+:
├─ Se continuar usando: R$ 50-100/mês
├─ Ou migra para Railway: R$ 50-100/mês
└─ Ou AWS pago conforme usa
```

---

**Tempo total:** ~35 minutos  
**Custo:** R$ 0  
**Status:** ✅ Pronto para lançar

🚀 **BOA SORTE!**
