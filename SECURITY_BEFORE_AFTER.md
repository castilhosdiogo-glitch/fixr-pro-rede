# 🔄 Antes vs Depois — Exemplos Práticos

## 1. Validação de Entrada

### ❌ ANTES (Inseguro)
```typescript
Deno.serve(async (req) => {
  const { user_id, amount } = await req.json();
  
  // Sem validação!
  if (!user_id || !amount) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }
  
  // Pode ser string, número negativo, etc
  console.log(`Amount: ${amount}`);
});
```

**Problemas:**
- ❌ Sem schema definition
- ❌ Sem type checking
- ❌ Sem validação de formato
- ❌ Sem mensagens de erro específicas
- ❌ Sem conversão de tipos

### ✅ DEPOIS (Seguro)
```typescript
import { z } from "npm:zod@3.22.4";
import { validateRequestBody } from "../shared/validation.ts";
import { validationErrorResponse } from "../shared/response.ts";

const PaymentSchema = z.object({
  user_id: z.string().uuid("Invalid UUID"),
  amount: z.number().int().positive("Amount must be positive"),
});

Deno.serve(async (req) => {
  const validation = await validateRequestBody(req, PaymentSchema);
  
  if (!validation.success) {
    return validationErrorResponse(validation.errors!);
  }
  
  const { user_id, amount } = validation.data!;
  // Agora é garantido ser UUID e número positivo
});
```

**Benefícios:**
- ✅ Schema type-safe
- ✅ Validação automática
- ✅ Mensagens específicas
- ✅ Rejeição automática de tipos errados

---

## 2. Rate Limiting

### ❌ ANTES (Sem proteção)
```typescript
Deno.serve(async (req) => {
  // Sem rate limiting!
  // Atacante pode fazer 10.000 requisições em segundos
  const { email } = await req.json();
  
  // Brute force attacks possíveis
  const { data: user } = await db.auth.signInWithPassword({
    email,
    password: "tentativa-1",
  });
});
```

**Problemas:**
- ❌ Sem proteção contra força bruta
- ❌ Sem proteção contra DDoS
- ❌ Sem monitoramento

### ✅ DEPOIS (Protegido)
```typescript
import { RateLimiter } from "../shared/sanitization.ts";

const authLimiter = new RateLimiter(5, 60000); // 5 tentativas por minuto

Deno.serve(async (req) => {
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  
  if (!authLimiter.check(clientIp)) {
    return errorResponse("RATE_LIMIT_EXCEEDED", "Too many attempts", 429);
  }
  
  // Agora seguro contra brute force
  const { email } = await req.json();
});
```

**Benefícios:**
- ✅ Proteção contra brute force
- ✅ Proteção contra DDoS
- ✅ Por IP (rastreável)

---

## 3. Sanitização

### ❌ ANTES (Vulnerável a XSS)
```typescript
Deno.serve(async (req) => {
  const { name } = await req.json();
  
  // Sem sanitização!
  const profile = {
    name: name,  // Pode conter <script>alert('XSS')</script>
    bio: bio,    // Pode conter HTML malicioso
  };
  
  await db.from("profiles").insert(profile);
});
```

**Problemas:**
- ❌ XSS attack possível
- ❌ HTML injection possível
- ❌ SQL injection possível (se não usar parameterized queries)

### ✅ DEPOIS (Protegido)
```typescript
import {
  sanitizeText,
  sanitizeUUID,
  detectSqlInjection,
} from "../shared/sanitization.ts";

Deno.serve(async (req) => {
  const { name, user_id } = await req.json();
  
  const safeName = sanitizeText(name, 100);        // Remove control chars
  const safeUserId = sanitizeUUID(user_id);        // Valida UUID
  
  if (detectSqlInjection(safeName)) {
    return validationErrorResponse({ name: "Invalid characters" });
  }
  
  const profile = {
    name: safeName,    // Seguro para usar
    user_id: safeUserId,
  };
  
  await db.from("profiles").insert(profile);
});
```

**Benefícios:**
- ✅ XSS prevention
- ✅ HTML injection prevention
- ✅ SQL injection detection

---

## 4. Mascaramento de Dados em Logs

### ❌ ANTES (Expõe dados sensíveis)
```typescript
Deno.serve(async (req) => {
  const { cpf, email, phone, card_number } = await req.json();
  
  // NUNCA FAÇA ISTO!
  console.log("User data:", {
    cpf,           // 123.456.789-09
    email,         // user@example.com
    phone,         // (11) 99999-8888
    card: card_number, // 4532-1234-5678-9010
  });
  
  // Se alguém vê os logs, tem acesso a dados sensíveis!
});
```

**Problemas:**
- ❌ Dados sensíveis visíveis em logs
- ❌ Risco de data breach
- ❌ Violação de LGPD/GDPR
- ❌ Inspeção visual de logs exponha dados

### ✅ DEPOIS (Dados mascarados)
```typescript
import { createSecureLogEntry } from "../shared/masking.ts";

Deno.serve(async (req) => {
  const { cpf, email, phone, card_number } = await req.json();
  
  // Mascaramento automático!
  const logEntry = createSecureLogEntry(
    "info",
    "Payment processed",
    {
      cpf,           // Automaticamente → XXX.XXX.XXX-09
      email,         // Automaticamente → u***@example.com
      phone,         // Automaticamente → (XX) XXXX-8888
      card: card_number, // Automaticamente → ****-****-****-9010
    }
  );
  
  console.log(JSON.stringify(logEntry));
  
  // Output: { "cpf": "XXX.XXX.XXX-09", "email": "u***@..." }
});
```

**Benefícios:**
- ✅ Dados sensíveis mascarados
- ✅ Compliance com LGPD/GDPR
- ✅ Rastreabilidade sem exposição

---

## 5. Error Handling

### ❌ ANTES (Expõe detalhes)
```typescript
Deno.serve(async (req) => {
  try {
    const result = await db.from("users").select("*").eq("id", userId);
  } catch (err) {
    // Expõe erro completo ao cliente!
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
});

// Se falhar, cliente vê:
// {"error": "connection refused at port 5432"}
// ou
// {"error": "pgboss.tables.job_state_id doesn't exist"}
```

**Problemas:**
- ❌ Stack trace exposto
- ❌ Informações de infraestrutura reveladas
- ❌ Possibilita reconhecimento do sistema

### ✅ DEPOIS (Genérico e seguro)
```typescript
import { handleError } from "../shared/response.ts";

Deno.serve(async (req) => {
  try {
    const result = await db.from("users").select("*").eq("id", userId);
    // ... resto da lógica
  } catch (err) {
    // Mensagem genérica ao cliente
    return handleError(err, "User Lookup");
    
    // Cliente recebe:
    // {"success": false, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "Internal server error"}}
    
    // Servidor loga (privadamente):
    // [2026-04-02T18:30:45Z] ERROR [User Lookup] connection refused at port 5432
  }
});
```

**Benefícios:**
- ✅ Mensagem genérica ao cliente
- ✅ Detalhes completos nos logs privados
- ✅ Segurança + Debugging

---

## 6. Authorization

### ❌ ANTES (Sem verificação)
```typescript
Deno.serve(async (req) => {
  const { user_id } = await req.json();
  
  // Sem verificação de autorização!
  // Qualquer um pode atualizar qualquer perfil
  const { data } = await db
    .from("profiles")
    .update({ name, email })
    .eq("id", user_id);
    
  return new Response(JSON.stringify(data));
});

// Atacante faz:
// POST /update-profile
// { "user_id": "outro-usuario-uuid", "name": "Hacked" }
// E consegue atualizar perfil de outro usuário!
```

**Problemas:**
- ❌ Privilege escalation
- ❌ Unauthorized data modification
- ❌ Sem autenticação

### ✅ DEPOIS (Com verificação)
```typescript
import { unauthorizedResponse } from "../shared/response.ts";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return unauthorizedResponse("Missing auth header");
  }
  
  // Verificar JWT token
  const token = authHeader.replace("Bearer ", "");
  const decoded = await verifyToken(token);
  
  const { user_id } = await req.json();
  
  // Verificar que usuário está atualizando sua própria conta
  if (decoded.sub !== user_id) {
    return forbiddenResponse("Cannot update another user's profile");
  }
  
  // Agora seguro
  const { data } = await db
    .from("profiles")
    .update({ name, email })
    .eq("id", user_id);
    
  return successResponse(data);
});
```

**Benefícios:**
- ✅ Autenticação obrigatória
- ✅ Autorização verificada
- ✅ Prevenção de privilege escalation

---

## 7. CORS

### ❌ ANTES (Wildcard inseguro)
```typescript
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",  // NUNCA em produção!
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }
});
```

**Problemas:**
- ❌ Qualquer site pode fazer requisições
- ❌ CSRF attack possível
- ❌ Cross-origin data theft possível

### ✅ DEPOIS (Restrito)
```typescript
import { corsPreflightResponse } from "../shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
    // Retorna:
    // Access-Control-Allow-Origin: localhost:3000 (ou seu domínio)
    // Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
    // Access-Control-Allow-Headers: authorization, content-type, x-api-key
  }
});
```

**Benefícios:**
- ✅ CORS restrito a domínios conhecidos
- ✅ CSRF protection
- ✅ Métodos específicos permitidos

---

## 📊 Comparação Visual

```
┌─────────────────────────────────────────────────────────────┐
│                      ANTES vs DEPOIS                        │
├─────────────────────────────────────────────────────────────┤
│ Aspecto         │ ❌ ANTES          │ ✅ DEPOIS             │
├─────────────────────────────────────────────────────────────┤
│ Validação       │ Manual            │ Zod Schema            │
│ Erros           │ Mensagens fracas  │ Específicas           │
│ Rate Limiting   │ Nenhum            │ Por IP                │
│ Sanitização     │ Nenhuma           │ Automática            │
│ SQL Injection   │ Vulnerável        │ Detectado             │
│ Logs            │ Dados expostos    │ Dados mascarados      │
│ Errors          │ Stack trace       │ Mensagem genérica     │
│ Auth            │ Nenhuma           │ Obrigatória           │
│ CORS            │ Wildcard (*)      │ Restrito              │
│ Headers         │ Mínimos           │ Security headers      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Conclusão

**Use este padrão para TODOS os novos edge functions:**

```typescript
// 1. Imports
import { validateRequestBody } from "../shared/validation.ts";
import { successResponse, validationErrorResponse } from "../shared/response.ts";
import { sanitizeUUID, RateLimiter } from "../shared/sanitization.ts";
import { createSecureLogEntry } from "../shared/masking.ts";

// 2. Schema
const MySchema = z.object({ ... });

// 3. Limiter
const limiter = new RateLimiter(10, 60000);

// 4. Handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  
  try {
    if (!limiter.check(clientIp)) return errorResponse(...);
    const validation = await validateRequestBody(req, MySchema);
    if (!validation.success) return validationErrorResponse(...);
    
    const safe = sanitizeUUID(data);
    const log = createSecureLogEntry(...);
    console.log(JSON.stringify(log));
    
    return successResponse({ ... });
  } catch (err) {
    return handleError(err, "Operation");
  }
});
```

**✨ Segurança Garantida!**
