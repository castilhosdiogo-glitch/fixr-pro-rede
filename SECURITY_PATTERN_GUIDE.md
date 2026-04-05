# 🛡️ Fixr Security Pattern — Guia Passo-a-Passo

## Template Completo para Edge Functions

Este guia mostra exatamente como implementar um novo edge function seguro usando o padrão do Fixr.

---

## 1️⃣ Imports Obrigatórios

```typescript
// Validação
import { validateRequestBody } from "../shared/validation.ts";
import { z } from "npm:zod@3.22.4";

// Response
import {
  successResponse,
  validationErrorResponse,
  corsPreflightResponse,
  handleError,
  errorResponse,
  unauthorizedResponse,
} from "../shared/response.ts";

// Sanitização
import {
  sanitizeUUID,
  sanitizeText,
  sanitizePhone,
  RateLimiter,
  detectSqlInjection,
} from "../shared/sanitization.ts";

// Mascaramento
import {
  createSecureLogEntry,
  maskPhone,
  maskEmail,
  maskCPF,
} from "../shared/masking.ts";

// Database
import { createClient } from "npm:@supabase/supabase-js@2";
```

---

## 2️⃣ Definir Schema Zod

```typescript
const UpdateProfileSchema = z.object({
  user_id: z
    .string()
    .uuid("user_id must be a valid UUID")
    .describe("User ID"),
  
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters")
    .describe("Full name"),
  
  email: z
    .string()
    .email("Invalid email format")
    .describe("Email address"),
  
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Invalid phone format")
    .optional()
    .describe("Phone number"),
});
```

### Schema Rules

✅ **Sempre defina:**
- `min()` / `max()` para strings
- Padrões específicos com `.regex()` ou `.url()`
- Tipos exatos (não use `any`)
- Descrições com `.describe()`

❌ **Nunca use:**
- `z.any()` — muito permissivo
- Sem limites de tamanho
- Sem validação de formato

---

## 3️⃣ Criar Rate Limiter

```typescript
// Limite: X tentativas por Y milissegundos, por IP
const updateProfileLimiter = new RateLimiter(
  20,        // 20 tentativas
  3600000    // por hora (3.6M ms)
);

const authLimiter = new RateLimiter(
  5,         // 5 tentativas
  60000      // por minuto
);

const paymentLimiter = new RateLimiter(
  10,        // 10 tentativas
  60000      // por minuto
);
```

### Rate Limit Guidelines

| Operação | Limite | Período |
|----------|--------|---------|
| Auth (login, signup) | 5 | 1 minuto |
| Payment | 10 | 1 minuto |
| Push notification | 30 | 1 minuto |
| Profile update | 20 | 1 hora |
| API call (genérica) | 100 | 1 hora |

---

## 4️⃣ Estrutura do Handler

```typescript
Deno.serve(async (req) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  // 2. Method check
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST", 405);
  }

  // 3. Extract metadata
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  const authHeader = req.headers.get("authorization");

  try {
    // 4. Rate limiting
    if (!updateProfileLimiter.check(clientIp)) {
      return errorResponse("RATE_LIMIT_EXCEEDED", "Too many requests", 429);
    }

    // 5. Authorization
    if (!authHeader) {
      return unauthorizedResponse("Missing auth header");
    }

    // 6. Validate body
    const validation = await validateRequestBody(req, UpdateProfileSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { user_id, name, email } = validation.data!;

    // 7. Sanitize
    const safeUserId = sanitizeUUID(user_id);
    const safeName = sanitizeText(name, 100);
    
    if (!safeUserId) {
      return validationErrorResponse({ user_id: "Invalid format" });
    }

    // 8. SQL injection check
    if (detectSqlInjection(safeName)) {
      return validationErrorResponse({ name: "Invalid characters" });
    }

    // 9. Setup database
    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 10. Log operation (masked)
    const logEntry = createSecureLogEntry(
      "info",
      "Profile update started",
      {
        user_id: safeUserId,
        name: safeName.slice(0, 20),
      }
    );
    console.log(JSON.stringify(logEntry));

    // 11. Business logic
    const { data, error } = await db
      .from("profiles")
      .update({ full_name: safeName })
      .eq("id", safeUserId)
      .select()
      .single();

    if (error) {
      return handleError(error, "Update Profile");
    }

    // 12. Success
    return successResponse({ message: "Updated", user: data }, 200);

  } catch (err) {
    return handleError(err, "Operation Name");
  }
});
```

---

## 5️⃣ Sanitização — Quando Usar Cada Uma

```typescript
import {
  sanitizeUUID,      // Para IDs de usuário, broadcast, etc
  sanitizeText,      // Para nomes, bios, descrições
  sanitizeEmail,     // Para emails
  sanitizePhone,     // Para telefones
  sanitizeURL,       // Para URLs de callback
  detectSqlInjection // Antes de usar em queries
} from "../shared/sanitization.ts";

// Exemplo: Profile update
const safeUserId = sanitizeUUID(user_id);           // ✅
const safeName = sanitizeText(name, 100);           // ✅
const safeEmail = sanitizeEmail(email);             // ✅
const safePhone = sanitizePhone(phone);             // ✅
const safeCallbackUrl = sanitizeURL(url);           // ✅

if (detectSqlInjection(safeName)) {                 // ✅
  return errorResponse("...invalid characters...");
}
```

---

## 6️⃣ Logging Seguro — Nunca Exponha Dados

```typescript
// ❌ NUNCA FAÇA ISTO
console.log("User data:", {
  cpf: "123.456.789-09",         // NUNCA!
  card: "4532-1234-5678-9010",   // NUNCA!
  bankAccount: "1234567890",     // NUNCA!
  email: "user@example.com",     // CUIDADO!
});

// ✅ SEMPRE USE MASCARAMENTO
import { createSecureLogEntry } from "../shared/masking.ts";

const logEntry = createSecureLogEntry(
  "info",
  "Payment processed",
  {
    cpf: userCPF,           // Automaticamente mascarado
    email: userEmail,       // Automaticamente mascarado
    amount: 5000,           // Número não precisa
  }
);
console.log(JSON.stringify(logEntry));

// Output:
// {
//   "level": "info",
//   "message": "Payment processed",
//   "data": {
//     "cpf": "XXX.XXX.XXX-09",
//     "email": "u***@example.com",
//     "amount": 5000
//   }
// }
```

---

## 7️⃣ Response Padronizado

```typescript
import {
  successResponse,           // 200 com dados
  validationErrorResponse,   // 400 erro de validação
  unauthorizedResponse,      // 401 sem autenticação
  forbiddenResponse,        // 403 sem autorização
  notFoundResponse,         // 404 recurso não existe
  conflictResponse,         // 409 dado já existe
  serverErrorResponse,      // 500 erro interno
  handleError,              // wrapper genérico
} from "../shared/response.ts";

// Sucesso
return successResponse({
  message: "Updated",
  user: { id, name, email }
}, 200);

// Validação
return validationErrorResponse({
  email: "Invalid email format",
  phone: "Phone must have 11 digits"
});

// Auth
return unauthorizedResponse("Invalid credentials");

// Permissão
return forbiddenResponse("You cannot update this profile");

// Não encontrado
return notFoundResponse("User");

// Já existe
return conflictResponse("Email already registered");

// Genérico com error handling
try {
  // operação
} catch (err) {
  return handleError(err, "Operation Name");
  // Retorna mensagem genérica
  // Loga detalhes completos
}
```

---

## 8️⃣ Exemplo Completo Mínimo

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import { validateRequestBody } from "../shared/validation.ts";
import { successResponse, validationErrorResponse, corsPreflightResponse, handleError } from "../shared/response.ts";
import { sanitizeUUID, RateLimiter } from "../shared/sanitization.ts";

const MySchema = z.object({
  user_id: z.string().uuid(),
  action: z.string().min(1).max(50),
});

const limiter = new RateLimiter(10, 60000);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const clientIp = req.headers.get("x-forwarded-for") || "unknown";

  try {
    if (!limiter.check(clientIp)) {
      return new Response("Rate limited", { status: 429 });
    }

    const validation = await validateRequestBody(req, MySchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { user_id } = validation.data!;
    const safeId = sanitizeUUID(user_id);

    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await db
      .from("table")
      .select("*")
      .eq("id", safeId)
      .single();

    if (error) return handleError(error, "Query");

    return successResponse({ result: data });
  } catch (err) {
    return handleError(err, "Operation");
  }
});
```

---

## 9️⃣ Checklist — Antes de Fazer Deploy

- [ ] Zod schema definido para toda entrada
- [ ] Rate limiter configurado
- [ ] CORS preflight handler
- [ ] Validação de request body
- [ ] UUIDs sanitizados
- [ ] Textos sanitizados
- [ ] SQL injection detection (se aplicável)
- [ ] Authorization check
- [ ] Logging com dados mascarados
- [ ] Error handling com try/catch + handleError
- [ ] Responses padronizadas (success/error/validation)
- [ ] Sem console.log de dados sensíveis
- [ ] Testado com inputs maliciosos
- [ ] Build passa sem erros

---

## 🔟 Estrutura de Diretórios

```
supabase/functions/
├── shared/
│   ├── validation.ts       ← Schemas Zod
│   ├── response.ts         ← HTTP responses
│   ├── sanitization.ts     ← XSS/SQL prevention
│   ├── masking.ts          ← Data masking
│   └── README.md           ← Documentação
│
├── create-payment-intent/  ← Implementado ✅
│   └── index.ts
│
├── push-notify/            ← Implementado ✅
│   └── index.ts
│
├── update-profile/         ← Exemplo ✅
│   └── index.ts
│
└── seu-novo-endpoint/      ← Use este template!
    └── index.ts
```

---

## 📞 Exemplos de Requisições

### Create Payment Intent
```bash
curl -X POST http://localhost:3000/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "broadcast_id": "550e8400-e29b-41d4-a716-446655440000",
    "professional_id": "660e8400-e29b-41d4-a716-446655440001",
    "client_id": "770e8400-e29b-41d4-a716-446655440002",
    "amount_cents": 5000,
    "idempotency_key": "user-123-broadcast-456-1234567890"
  }'
```

### Push Notification
```bash
curl -X POST http://localhost:3000/push-notify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Novo pedido!",
    "body": "João pediu seu serviço",
    "tag": "new-request"
  }'
```

### Update Profile
```bash
curl -X POST http://localhost:3000/update-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "João Silva",
    "bio": "Eletricista experiente",
    "phone": "(11) 99999-8888"
  }'
```

---

## 📊 Resumo

| Aspecto | Pattern |
|---------|---------|
| **Validação** | `validateRequestBody(req, YourSchema)` |
| **Rate Limiting** | `new RateLimiter(limit, windowMs).check(clientIp)` |
| **Sanitização** | `sanitizeUUID()`, `sanitizeText()`, etc |
| **SQL Injection** | `detectSqlInjection(input)` |
| **Logging** | `createSecureLogEntry()` |
| **Success** | `successResponse(data, 200)` |
| **Errors** | `validationErrorResponse()`, `handleError()` |
| **CORS** | `corsPreflightResponse()` |

---

**Status:** Ready for Production ✅  
**Última atualização:** 2026-04-02  
**Versão:** 1.0
