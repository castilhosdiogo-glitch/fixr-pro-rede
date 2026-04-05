# Fixr Security Shared Modules

Módulos reutilizáveis para segurança em todos os edge functions do Fixr.

## Módulos Disponíveis

### 1. validation.ts
Validação de entrada com Zod. Use para toda requisição.

**Imports:**
```typescript
import { 
  PaymentIntentSchema, 
  ServiceRequestSchema,
  PushSubscriptionSchema,
  validateRequestBody,
  validateInput,
  ValidationResult
} from "../shared/validation.ts";
```

**Uso:**
```typescript
const validation = await validateRequestBody(req, PaymentIntentSchema);
if (!validation.success) {
  return validationErrorResponse(validation.errors!);
}
const data = validation.data!;
```

---

### 2. sanitization.ts
Sanitização de entrada, prevenção de XSS/SQL injection, rate limiting.

**Imports:**
```typescript
import {
  escapeHtml,
  stripHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUUID,
  detectSqlInjection,
  getSecurityHeaders,
  RateLimiter
} from "../shared/sanitization.ts";
```

**Uso - Rate Limiting:**
```typescript
const authLimiter = new RateLimiter(5, 60000); // 5 tentativas/min

if (!authLimiter.check(clientIp)) {
  return errorResponse("RATE_LIMIT_EXCEEDED", "Too many attempts", 429);
}
```

**Uso - Sanitização:**
```typescript
const safeName = sanitizeText(userInput, 100);
const safeEmail = sanitizeEmail(userInput);
const safeUUID = sanitizeUUID(userInput);
const safeUrl = sanitizeURL(userInput);
```

**Uso - Detecção:**
```typescript
if (detectSqlInjection(userInput)) {
  console.error("[SECURITY] SQL injection attempt detected");
  return badRequestResponse("Invalid input");
}
```

---

### 3. masking.ts
Mascaramento de dados sensíveis para logs seguros.

**Imports:**
```typescript
import {
  maskCPF,
  maskCNPJ,
  maskCardNumber,
  maskEmail,
  maskPhone,
  maskBankAccount,
  maskPixKey,
  maskSensitiveFields,
  createSecureLogEntry,
  createLogSafeVersion
} from "../shared/masking.ts";
```

**Uso - Logs Seguros:**
```typescript
const logEntry = createSecureLogEntry(
  "info",
  "User registered",
  {
    email: user.email,
    cpf: user.cpf,
    phone: user.phone,
  }
);
console.log(JSON.stringify(logEntry));
// Output: { email: "u***@example.com", cpf: "XXX.XXX.XXX-09", ... }
```

**Uso - Mascaramento Manual:**
```typescript
const maskedData = maskSensitiveFields(user, {
  email: "email",
  cpf: "cpf",
  account_number: "account",
  pix_key: "pix",
});
```

---

### 4. response.ts
Tratamento padronizado de respostas HTTP com security headers.

**Imports:**
```typescript
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  rateLimitResponse,
  serverErrorResponse,
  badRequestResponse,
  conflictResponse,
  corsPreflightResponse,
  corsResponse,
  handleError,
  ApiResponse
} from "../shared/response.ts";
```

**Uso - Sucesso:**
```typescript
return successResponse({
  client_secret: stripeData.client_secret,
  amount_cents: 5000,
}, 200);
```

**Uso - Erros:**
```typescript
// Validação
return validationErrorResponse({
  email: "Invalid email format",
  amount: "Must be positive",
});

// Autorização
return unauthorizedResponse("Invalid credentials");

// Rate limit
return rateLimitResponse(60); // Retry after 60s

// Genérico
return errorResponse(
  "CUSTOM_ERROR",
  "User-friendly message",
  400,
  { details: "Additional context" }
);
```

**Uso - Error Handling:**
```typescript
try {
  // operação
} catch (err) {
  return handleError(err, "Operation Name");
  // Retorna mensagem genérica ao usuário
  // Loga detalhes completos no servidor
}
```

---

## Template Padrão para Edge Function

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";
import { 
  YourSchema, 
  validateRequestBody 
} from "../shared/validation.ts";
import {
  successResponse,
  validationErrorResponse,
  corsPreflightResponse,
  handleError,
  errorResponse,
} from "../shared/response.ts";
import { 
  sanitizeUUID, 
  RateLimiter 
} from "../shared/sanitization.ts";
import { createSecureLogEntry } from "../shared/masking.ts";

const rateLimiter = new RateLimiter(10, 60000);

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  // HTTP method check
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  const clientIp = req.headers.get("x-forwarded-for") || "unknown";

  try {
    // Rate limiting
    if (!rateLimiter.check(clientIp)) {
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many requests",
        429
      );
    }

    // Validation
    const validation = await validateRequestBody(req, YourSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { field1, field2 } = validation.data!;

    // Sanitization
    const safefield1 = sanitizeUUID(field1);
    if (!safeField1) {
      return validationErrorResponse({
        field1: "Invalid format",
      });
    }

    // Logging
    const logEntry = createSecureLogEntry(
      "info",
      "Operation started",
      { field1: safeField1, field2 }
    );
    console.log(JSON.stringify(logEntry));

    // DB operation
    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await db
      .from("table")
      .select("*")
      .eq("id", safeField1)
      .single();

    if (error) {
      return handleError(error, "Database Query");
    }

    // Success response
    return successResponse({ result: data });

  } catch (err) {
    return handleError(err, "Operation Name");
  }
});
```

---

## Checklist de Implementação

Para cada novo edge function:

- [ ] Importar schemas do shared/validation.ts
- [ ] Adicionar `validateRequestBody()` para todas requisições
- [ ] Adicionar CORS preflight handler
- [ ] Adicionar rate limiting (se aplicável)
- [ ] Sanitizar UUIDs/inputs com funções do shared/sanitization.ts
- [ ] Usar `successResponse()` e `errorResponse()` do shared/response.ts
- [ ] Usar `createSecureLogEntry()` para logs
- [ ] Nunca logar CPF, cartão, conta bancária sem mascaramento
- [ ] Envolver em try/catch com `handleError()`
- [ ] Testar com inputs maliciosos

---

## Exemplos Reais

### Adicionar novo schema
```typescript
// validation.ts
export const UpdateProfileSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(3).max(100),
  bio: z.string().max(500).optional(),
});
```

### Usar em endpoint
```typescript
import { UpdateProfileSchema, validateRequestBody } from "../shared/validation.ts";

const validation = await validateRequestBody(req, UpdateProfileSchema);
if (!validation.success) {
  return validationErrorResponse(validation.errors!);
}

const { user_id, name, bio } = validation.data!;
```

---

## Contribuindo

Ao adicionar novas funções de segurança:
1. Adicione ao arquivo apropriado (validation.ts, sanitization.ts, masking.ts, response.ts)
2. Exporte a função
3. Adicione JSDoc comments
4. Adicione exemplo neste README
5. Teste com inputs maliciosos

---

**Última atualização:** 2026-04-02  
**Versão:** 1.0  
**Status:** Production Ready ✅
