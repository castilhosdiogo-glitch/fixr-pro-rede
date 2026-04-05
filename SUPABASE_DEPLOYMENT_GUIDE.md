# 🚀 Supabase + Vercel — Lançar Fixr em 1 Hora (100% Grátis)

**Stack:** Supabase (Backend + DB + Storage) + Vercel (Frontend)  
**Tempo:** ~60 minutos  
**Custo:** R$ 0 (completamente grátis!)

---

## 🎯 Arquitetura

```
┌─────────────────────────────────────────┐
│         SEU BROWSER / MOBILE            │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────┐   ┌──────────────┐
│  VERCEL     │   │  SUPABASE    │
│ (Frontend)  │   │ (Backend +   │
│ Next.js     │◄─►│  DB + Auth)  │
│ FREE        │   │  FREE        │
└─────────────┘   └──────────────┘
    ↓                     ↓
 React/Next          PostgreSQL
                   + Storage (S3)
                   + Auth
                   + Realtime
```

---

## ✅ PASSO 1: Supabase (15 min)

### 1.1 - Criar Conta Supabase

```
https://supabase.com
→ Sign up com GitHub (ou email)
→ Create new project
```

### 1.2 - Configurar Projeto

```
Project name: fixr-prod
Database password: [gerar segura - 20+ chars]
Region: us-east-1 (mais barato)
Pricing plan: FREE

→ Create project
```

⏳ **Esperar 2-3 minutos para criar**

### 1.3 - Obter Credenciais

```
Supabase Dashboard → Project Settings → API

Copiar:
□ Project URL: https://xxx.supabase.co
□ Anon Key: eyJxxx...
□ Service Role Key: eyJxxx... (guardar seguro!)

Você vai usar essas em .env
```

### 1.4 - Criar Tabelas (Migrations)

```bash
# Terminal (seu PC)
cd /caminho/do/fixr

# Conectar Supabase CLI
npm install -g supabase

supabase login
# Vai pedir token - gerar em:
# Supabase Dashboard → Account → Access Tokens
# → Create new token
# → Copiar e colar

# Depois
supabase link --project-ref seu-project-id

# Aplicar migrations
supabase db push
# Vai criar todas as tabelas automaticamente!
```

### 1.5 - Verificar Tabelas

```
Supabase Dashboard → SQL Editor
→ Todas as tabelas estão criadas? ✅
```

---

## 💻 PASSO 2: Backend (Supabase Edge Functions) — 15 min

### 2.1 - Setup Edge Functions

```bash
cd /caminho/do/fixr

# Criar função para chat
supabase functions new send-message

# Vai criar:
# supabase/functions/send-message/index.ts
```

### 2.2 - Copiar Código

```bash
# Copiar seus endpoints de packages/api/src/routes/chat.ts
# e adaptar para Deno (Supabase Edge Functions)

# Ou: Usar Supabase Database Functions (SQL + PL/pgSQL)
# Muito mais simples!
```

### 2.3 - Criar Database Functions (Recomendado)

```sql
-- Supabase SQL Editor → New Query

-- Função para enviar mensagem
CREATE OR REPLACE FUNCTION send_text_message(
  p_servico_id UUID,
  p_remetente_id UUID,
  p_conteudo TEXT
) RETURNS JSON AS $$
BEGIN
  INSERT INTO messages (servico_id, remetente_id, tipo, conteudo)
  VALUES (p_servico_id, p_remetente_id, 'TEXTO', p_conteudo);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Mensagem enviada'
  );
END;
$$ LANGUAGE plpgsql;

-- Chamar da sua app Next.js:
const { data, error } = await supabase
  .rpc('send_text_message', {
    p_servico_id: servico_id,
    p_remetente_id: user_id,
    p_conteudo: 'Olá!'
  });
```

---

## 📤 PASSO 3: Storage (S3 no Supabase) — 10 min

### 3.1 - Criar Bucket

```
Supabase Dashboard → Storage → Create new bucket

Name: fixr-files
Privacy: Public (para URLs públicas)
```

### 3.2 - Policies (RLS para uploads)

```
Storage → fixr-files → Policies → Create policy

Policy name: Users can upload own files
On: INSERT
Target role: authenticated

WITH CHECK expression:
auth.uid() = (storage.foldername[1])::uuid

GRANT: SELECT, INSERT
```

### 3.3 - Upload de Arquivo (no App)

```typescript
// packages/api/src/routes/chat.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Upload áudio
const { data, error } = await supabase.storage
  .from('fixr-files')
  .upload(`chat/audio/${servico_id}/${Date.now()}.m4a`, audioBuffer);

if (data) {
  const arquivo_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fixr-files/${data.path}`;
  
  // Salvar mensagem no banco
  await supabase.from('messages').insert({
    servico_id,
    remetente_id,
    tipo: 'AUDIO',
    arquivo_url,
    duracao: 45
  });
}
```

---

## 🔐 PASSO 4: Auth (Supabase Auth) — 10 min

### 4.1 - Configurar Supabase Auth

```
Supabase Dashboard → Authentication → Providers

✅ Email (já ativado)
✅ Phone (opcional)
✅ Google (se quiser)
✅ GitHub (se quiser)
```

### 4.2 - Usar Auth no App

```typescript
// packages/web/src/pages/login.tsx
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export default function LoginPage() {
  const supabase = useSupabaseClient();

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert('Erro no login: ' + error.message);
    } else {
      // Usuário logado!
      // Redirecionar para dashboard
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin(email.value, password.value);
    }}>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Senha" />
      <button>Entrar</button>
    </form>
  );
}
```

---

## ⚡ PASSO 5: Real-time (Supabase Realtime) — 10 min

### 5.1 - Ativar Realtime

```
Supabase Dashboard → Replication
→ Clicar em "messages" table
→ Toggle "Realtime" ON
```

### 5.2 - Escutar Mensagens em Tempo Real

```typescript
// packages/web/src/hooks/useChat.ts
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';

export function useChat(servico_id: string) {
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Subscribe a mensagens
    const subscription = supabase
      .from(`messages:servico_id=eq.${servico_id}`)
      .on('*', (payload) => {
        console.log('Nova mensagem!', payload.new);
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [servico_id]);

  return messages;
}
```

---

## 🌐 PASSO 6: Frontend (Vercel) — 15 min

### 6.1 - Deploy Automático

```
https://vercel.com
→ Import GitHub repo (seu fixr)
→ Selecionar apps/web (Next.js)
```

### 6.2 - Environment Variables

```
Configurar no Vercel:

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
JWT_SECRET=seu-secret-32-chars
```

### 6.3 - Deploy

```
→ Deploy
→ Seu site estará em: https://seu-fixr.vercel.app
```

---

## 🧪 PASSO 7: Testar Tudo — 10 min

### 7.1 - Testar Registro

```
Ir para seu site: https://seu-fixr.vercel.app
→ Clicar em Cadastro
→ Preencher dados
→ Submeter

Verificar: Supabase Dashboard → Authentication → Users
→ Seu usuário está lá? ✅
```

### 7.2 - Testar Chat

```
→ Criar um pedido
→ Abrir chat
→ Enviar mensagem

Verificar: Supabase Dashboard → SQL Editor
SELECT * FROM messages;
→ Sua mensagem está lá? ✅
```

### 7.3 - Testar Upload

```
→ Enviar foto/áudio no chat

Verificar: Supabase Dashboard → Storage → fixr-files
→ Arquivo está lá? ✅
```

### 7.4 - Testar Real-time

```
→ Abrir dois browsers
→ Browser 1: Enviar mensagem
→ Browser 2: Aparecer em tempo real? ✅
```

---

## 💰 Custos Supabase

```
PRIMEIRA CONTA (FREE FOREVER):
├─ PostgreSQL: Grátis (500 MB)
├─ Storage: Grátis (1 GB)
├─ Auth: Grátis (unlimited users)
├─ Realtime: Grátis
└─ TOTAL: R$ 0 ✅

QUANDO CRESCER (Pro Tier):
├─ Se > 500 MB DB: $25/mês
├─ Se > 1 GB Storage: $25/mês
├─ Segue escalável
└─ Mas FREE tier já é muito generoso!
```

---

## 🎁 Bônus: Push Notifications (Grátis)

### Supabase não tem Firebase, MAS:

```
Opção 1: OneSignal (GRÁTIS)
├─ https://onesignal.com
├─ Até 30k usuários grátis
└─ Integra fácil com Next.js

Opção 2: Expo Push (GRÁTIS - React Native)
├─ Já está integrado se usar Expo
└─ Suporta iOS + Android

Opção 3: Implementar manual com Supabase
├─ Criar tabela push_subscriptions
├─ Service Worker no Next.js
├─ Triggar notificação com Database Functions
```

### Implementar OneSignal (5 min)

```bash
# Instalar
npm install onesignal-node

# No seu código
import OneSignal from 'onesignal-node';

const client = new OneSignal.Client({
  userAuthKey: process.env.ONESIGNAL_AUTH_KEY,
  app: { appAuthKey: process.env.ONESIGNAL_API_KEY, appId: process.env.ONESIGNAL_APP_ID }
});

// Enviar push
await client.createNotification({
  contents: { en: "Nova mensagem no chat!" },
  included_segments: ["All"],
});
```

---

## 📋 Verificação Final

```
☑️ Supabase projeto criado
☑️ Tabelas migradas com sucesso
☑️ Auth funcionando
☑️ Storage bucket criado
☑️ Realtime ativado
☑️ Vercel frontend deploy OK
☑️ Testes funcionando
☑️ Custos = R$ 0

🎉 VOCÊ ESTÁ PRONTO!
```

---

## 🚀 URL Para Acessar

```
Frontend: https://seu-fixr.vercel.app
Backend: Rodan do Supabase (serverless)
Database: Supabase PostgreSQL
Storage: Supabase Storage
Auth: Supabase Auth
Realtime: Supabase Realtime

Tudo conectado automaticamente!
```

---

## 🆘 Troubleshooting Supabase

### "Auth não funciona"
```
Verificar:
1. NEXT_PUBLIC_SUPABASE_URL correto?
2. NEXT_PUBLIC_SUPABASE_ANON_KEY correto?
3. Email confirmado no Supabase?
```

### "Realtime não funciona"
```
Verificar:
1. Tabela tem toggle "Realtime" ON?
2. Browser console mostra erros?
3. Abrir Supabase logs para ver erro
```

### "Upload não salva"
```
Verificar:
1. Bucket "fixr-files" existe?
2. Policies permitem INSERT?
3. User está autenticado?
```

### "Slow queries"
```
Supabase Dashboard → SQL Editor
EXPLAIN ANALYZE sua_query;
→ Ver plano de execução
→ Criar índices se necessário
```

---

## 📊 Comparativa: AWS Free vs Supabase Free

```
┌──────────────┬───────────────┬────────────────┐
│ Feature      │ AWS Free Tier │ Supabase Free  │
├──────────────┼───────────────┼────────────────┤
│ Database     │ 750h/mês      │ 500MB sempre   │
│ Storage      │ 5GB/ano       │ 1GB sempre     │
│ Backend      │ Precisa EC2   │ Edge Fn FREE   │
│ Auth         │ Precisa setup │ Included FREE  │
│ Realtime     │ Precisa setup │ Included FREE  │
│ Setup time   │ 4-5 horas     │ 1 hora         │
│ Complexity   │ Médio         │ Baixo          │
│ Custo depois │ R$ 50-100/mês │ $25/mês (Pro)  │
└──────────────┴───────────────┴────────────────┘

VENCEDOR: Supabase por ser mais simples! 🎉
```

---

## ✅ Checklist Final

```
ANTES DE LANÇAR:
☑️ Supabase conta criada
☑️ Migrations aplicadas
☑️ Auth testado
☑️ Storage testado
☑️ Realtime testado
☑️ Vercel deployed
☑️ Tudo funcionando 100%

CUSTOS:
☑️ Supabase FREE: R$ 0
☑️ Vercel FREE: R$ 0
☑️ OneSignal FREE: R$ 0
☑️ TOTAL: R$ 0 ✅

🚀 READY TO LAUNCH!
```

---

## 📞 Próximo Passo

```
1. Crie conta Supabase (grátis)
2. Crie projeto
3. Faça migrations: supabase db push
4. Deploy Next.js em Vercel
5. Configure environment variables
6. Teste tudo
7. 🚀 LANÇA!

Tempo total: ~60 minutos
Custo: R$ 0
Result: Fixr LIVE!
```

---

**Status:** ✅ 100% Supabase + Vercel  
**Tempo:** 1 hora  
**Custo:** R$ 0  
**Dificuldade:** Muito Fácil  

🚀 **VAMOS LANÇAR!**
