# 🚀 AWS Free Tier Setup — Guia Completo

**Status:** ✅ Passo-a-passo detalhado  
**Tempo total:** ~4-5 horas  
**Custo:** R$ 0 (grátis por 12 meses)

---

## 📋 O Que Vamos Criar

```
✅ EC2 t2.micro (Backend Node.js)
✅ RDS PostgreSQL (Banco de dados)
✅ S3 Bucket (Uploads: áudio, foto, vídeo)
✅ Security Groups (Firewall)
✅ Elastic IP (IP fixo)
✅ Auto-backups do PostgreSQL
```

---

## 🔑 PASSO 1: Criar Conta AWS (30 min)

### 1.1 - Acesse AWS
```
https://aws.amazon.com
Clique em "Criar uma conta da AWS"
```

### 1.2 - Preencha dados
```
✅ Email
✅ Senha (segura!)
✅ Nome da conta
✅ Tipo: Business (escolha qualquer uma)
```

### 1.3 - Adicione cartão de crédito
```
⚠️ IMPORTANTE:
└─ Precisa de cartão para verificação
└─ NÃO vai cobrar enquanto estiver no free tier
└─ AWS bloqueia automaticamente se passar limite
```

### 1.4 - Verificação
```
✅ Confirme email
✅ Confirme telefone (recebe SMS)
✅ Pronto!
```

---

## 🖥️ PASSO 2: Criar EC2 (Backend Node.js) — 45 min

### 2.1 - Acesse EC2 Dashboard
```
AWS Console → EC2 → Instances → Launch Instance
```

### 2.2 - Configuração Básica

```
1. Nome da instância
   └─ fixr-backend-prod

2. Imagem do SO (AMI)
   └─ Ubuntu 22.04 LTS (grátis free tier)

3. Tipo de instância
   └─ t2.micro (grátis)
   └─ 1 vCPU, 1GB RAM, suficiente para MVP

4. Par de chaves (Key Pair)
   └─ Criar novo: fixr-prod-key
   └─ Download: fixr-prod-key.pem (GUARDAR SEGURO!)
   └─ ⚠️ Perder essa chave = perder acesso ao servidor
```

### 2.3 - Configuração de Rede

```
1. VPC
   └─ default (já existe)

2. Public IP
   └─ Enable auto-assign (✅ MARCAR)
   └─ Seu servidor terá IP público

3. Security Group
   └─ Create new: fixr-sg
   
4. Regras de Entrada (Inbound)
   ├─ SSH (22): Source 0.0.0.0/0
   │  └─ Para você conectar via terminal
   ├─ HTTP (80): Source 0.0.0.0/0
   │  └─ Para acessar via browser
   ├─ HTTPS (443): Source 0.0.0.0/0
   │  └─ Para HTTPS automático
   └─ Custom TCP (3001): Source 0.0.0.0/0
      └─ Sua API Node.js
```

### 2.4 - Armazenamento

```
1. Volume
   └─ 30 GB (grátis, máximo free tier)

2. Tipo
   └─ General Purpose SSD (gp2)

3. Encrypted
   └─ ✅ Marcar (segurança)
```

### 2.5 - Review e Lançar

```
Clique em "Launch Instance"
✅ EC2 iniciando...
```

---

## 🗄️ PASSO 3: Criar RDS PostgreSQL (Banco) — 45 min

### 3.1 - Acesse RDS Dashboard
```
AWS Console → RDS → Databases → Create Database
```

### 3.2 - Configuração Básica

```
1. Engine
   └─ PostgreSQL
   └─ Version: 15.x (mais recente)

2. Templates
   └─ Free tier (✅ MARCAR)
   └─ Automatically applies free tier
```

### 3.3 - Configuração DB

```
1. Database identifier
   └─ fixr-prod-db

2. Master username
   └─ fixradmin

3. Master password
   └─ [Gerar senha segura de 20+ caracteres]
   └─ Guardar em local seguro!
   
4. Database name
   └─ fixr_prod

5. Port
   └─ 5432 (padrão PostgreSQL)
```

### 3.4 - Conectividade

```
1. VPC
   └─ default (mesma do EC2)

2. Public access
   └─ ❌ NO (banco não precisa ser público)
   └─ Apenas EC2 acessa

3. Security group
   └─ Create new: fixr-db-sg
   
4. Database port
   └─ 5432

5. Deletion protection
   └─ ✅ Enable (não deleta por acidente)
```

### 3.5 - Backups

```
1. Backup retention period
   └─ 7 days (grátis, máximo)

2. Backup window
   └─ 03:00-04:00 UTC

3. Copy backups
   └─ ❌ Disable (grátis assim)

4. Enhanced monitoring
   └─ ❌ Disable (custa extra)
```

### 3.6 - Lançar Database

```
Clique em "Create database"
✅ PostgreSQL criando...
```

⏳ **Esperar 5-10 minutos para criar**

---

## 🪣 PASSO 4: Criar S3 Bucket (Uploads) — 15 min

### 4.1 - Acesse S3 Dashboard
```
AWS Console → S3 → Create Bucket
```

### 4.2 - Configuração

```
1. Bucket name
   └─ fixr-files-prod-[seu-cpf-últimos-4-dígitos]
   └─ ⚠️ Nome deve ser único globalmente

2. Region
   └─ us-east-1 (mais barato)

3. Block public access
   └─ ❌ Uncheck "Block all public access"
   └─ ✅ Check apenas:
      └─ Block public access to buckets and objects
      └─ (você controla permissões depois)

4. Versioning
   └─ ❌ Disable (para free tier)

5. Encryption
   └─ ✅ Enable (default SSE-S3)

6. Create
```

### 4.3 - Configurar CORS (para upload do app)

```
AWS Console → S3 → seu bucket → Permissions → CORS

Adicione:
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 🔑 PASSO 5: Criar AWS Credentials (IAM) — 20 min

### 5.1 - Criar Usuário IAM
```
AWS Console → IAM → Users → Create User

Username: fixr-app
Attach policies: ✅ AdministratorAccess
                 (ou criar policy customizada)
```

### 5.2 - Gerar Access Keys
```
AWS Console → IAM → Users → fixr-app

Security credentials:
├─ Create access key
├─ Select: Application running on AWS resources
├─ Copy:
   ├─ Access Key ID
   └─ Secret Access Key
```

⚠️ **GUARDAR SEGURO ESSAS CHAVES!**

---

## 📱 PASSO 6: Conectar ao EC2 via SSH — 15 min

### 6.1 - Abra Terminal
```bash
# Ir até onde salvou fixr-prod-key.pem
cd ~/Downloads

# Dar permissão
chmod 400 fixr-prod-key.pem
```

### 6.2 - Conectar ao EC2
```bash
# Pegar IP Público do EC2
# AWS Console → EC2 → Instances → seu-fixr-backend
# Copiar "Public IPv4 address"

# Conectar via SSH
ssh -i fixr-prod-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Exemplo:
# ssh -i fixr-prod-key.pem ubuntu@54.123.45.67
```

### 6.3 - Primeira Vez
```
⚠️ Pergunta: "Are you sure you want to continue connecting?"
✅ Digita: yes
```

---

## ⚙️ PASSO 7: Preparar EC2 para Node.js — 30 min

### 7.1 - Atualizar Sistema
```bash
sudo apt update
sudo apt upgrade -y
```

### 7.2 - Instalar Node.js
```bash
# Instalar Node 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version
npm --version
```

### 7.3 - Instalar Git
```bash
sudo apt install -y git
git --version
```

### 7.4 - Instalar PM2 (para manter app rodando)
```bash
sudo npm install -g pm2

# Dar permissão
sudo pm2 startup
sudo pm2 save
```

### 7.5 - Clonar Seu Repositório Fixr
```bash
cd /home/ubuntu
git clone https://github.com/SEU_USUARIO/fixr.git
cd fixr

# Instalar dependências
npm install
```

---

## 🔌 PASSO 8: Configurar Variáveis de Ambiente — 20 min

### 8.1 - Criar arquivo .env
```bash
cd /home/ubuntu/fixr
sudo nano packages/api/.env
```

### 8.2 - Adicionar variáveis
```
# DATABASE
DATABASE_URL="postgresql://fixradmin:SUA_SENHA_POSTGRES@fixr-prod-db.xxx.us-east-1.rds.amazonaws.com:5432/fixr_prod"

# JWT
JWT_SECRET="gerar-secret-seguro-de-32-caracteres"
JWT_REFRESH_SECRET="gerar-outro-secret-seguro-de-32-caracteres"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="sua-access-key-id"
AWS_SECRET_ACCESS_KEY="sua-secret-access-key"
AWS_BUCKET_NAME="fixr-files-prod-xxxx"

# FIREBASE
FIREBASE_PROJECT_ID="seu-firebase-project"
FIREBASE_SERVICE_ACCOUNT_EMAIL="seu-service-account@..."
FCM_SERVER_KEY="seu-fcm-server-key"

# API
API_PORT=3001
NODE_ENV="production"
```

⚠️ **Trocar valores reais!**

### 8.3 - Salvar (Ctrl+X, Y, Enter)

---

## 🗄️ PASSO 9: Executar Migrations Prisma — 15 min

### 9.1 - Instalar Prisma
```bash
cd /home/ubuntu/fixr
npm install -g prisma
```

### 9.2 - Executar Migrations
```bash
npx prisma migrate deploy

# Output esperado:
# Migration log created at ...
# ✓ Run 1 migration in X.XXs
```

---

## 🚀 PASSO 10: Iniciar Aplicação com PM2 — 10 min

### 10.1 - Build da Aplicação
```bash
cd /home/ubuntu/fixr
npm run build
```

### 10.2 - Iniciar com PM2
```bash
# Ir até diretório API
cd packages/api

# Iniciar
pm2 start "npm run start" --name "fixr-api"

# Ver status
pm2 status
pm2 logs fixr-api
```

### 10.3 - Configurar PM2 para Reiniciar Automático
```bash
pm2 save
sudo pm2 startup

# Seu app agora reinicia automaticamente se cair
# E também reinicia se EC2 reiniciar
```

---

## 🧪 PASSO 11: Testar API — 10 min

### 11.1 - Do seu computador
```bash
# Substituir IP_PÚBLICO
curl http://IP_PÚBLICO:3001/api/chat

# Exemplo:
# curl http://54.123.45.67:3001/api/chat
```

### 11.2 - Resposta esperada
```
❌ Erro de autenticação (esperado, sem token)
└─ Significa que API está rodando ✅
```

### 11.3 - Ver logs
```bash
# No servidor EC2
pm2 logs fixr-api

# Ver últimas 100 linhas
pm2 logs fixr-api --lines 100
```

---

## 🔒 PASSO 12: Configurar Security (Opcional mas importante) — 15 min

### 12.1 - Firewall básico no EC2
```bash
# Checar portas abertas
sudo ufw status

# Habilitar firewall (cuidado, pode bloquear SSH!)
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3001/tcp  # Node.js API
```

### 12.2 - RDS Security Group
```
AWS Console → EC2 → Security Groups → fixr-db-sg

Inbound Rules:
├─ PostgreSQL (5432)
├─ Source: Selecionar fixr-sg (seu EC2 security group)
└─ ✅ Salvar

Outbound Rules:
└─ All traffic (padrão)
```

---

## ✅ PASSO 13: Verificação Final

### Checklist
```
☑️ EC2 rodando
☑️ PostgreSQL criado
☑️ S3 bucket criado
☑️ Variáveis .env configuradas
☑️ Migrations executadas
☑️ PM2 com app rodando
☑️ API respondendo em http://IP:3001
☑️ Banco conectando
☑️ Uploads S3 funcionando
☑️ Security groups configurados
```

---

## 💾 Dados Importantes (GUARDAR!)

```
EC2:
├─ IP Público: [seu-ip]
├─ Key file: fixr-prod-key.pem
└─ SSH: ssh -i fixr-prod-key.pem ubuntu@[ip]

PostgreSQL:
├─ Endpoint: [seu-rds-endpoint]:5432
├─ Database: fixr_prod
├─ User: fixradmin
├─ Password: [sua-senha]
└─ Connection: postgresql://fixradmin:senha@endpoint:5432/fixr_prod

AWS S3:
├─ Bucket: fixr-files-prod-xxxx
├─ Region: us-east-1
├─ Access Key: [sua-access-key]
└─ Secret Key: [sua-secret-key]

Node.js:
├─ JWT_SECRET: [seu-secret]
├─ Servidor: http://[seu-ip]:3001
└─ PM2 status: pm2 status
```

---

## 🆘 Problemas Comuns

### "Connection refused ao conectar PostgreSQL"
```bash
Solução:
1. Verificar se RDS está em "Available"
2. Verificar security group do RDS
3. Verificar se endpoint está correto em .env
4. Reiniciar app: pm2 restart fixr-api
```

### "Cannot find module 'prisma'"
```bash
Solução:
npm install
npx prisma generate
```

### "S3 upload fails"
```bash
Solução:
1. Verificar AWS credentials em .env
2. Verificar CORS do bucket S3
3. Verificar se bucket existe
4. Testar credenciais: aws s3 ls
```

### "App crashes ao iniciar"
```bash
Solução:
pm2 logs fixr-api
# Ver erro exato
# Corrigir e: npm run build
# pm2 restart fixr-api
```

---

## 📊 Custos Free Tier

```
EC2 t2.micro: 750 horas/mês = GRÁTIS
RDS PostgreSQL: 750 horas/mês = GRÁTIS
S3: 5 GB storage + 20k GET + 2k PUT = GRÁTIS

Total: R$ 0 por 12 meses
Depois: ~R$ 30-50/mês se continuar usando
```

---

## 🎉 Próximo: Deploy Frontend (Vercel)

Quando EC2 e RDS estiverem prontos, vamos fazer deploy do Next.js na Vercel.

---

**Status:** ✅ Setup completo  
**Próxima etapa:** AWS_DEPLOYMENT.md (Deploy do código)  
**Tempo decorrido:** ~4-5 horas
