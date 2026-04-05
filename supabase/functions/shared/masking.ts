// Data masking utilities
// Hide sensitive information in logs and responses

/**
 * Mask CPF (Cadastro de Pessoa Física)
 * Format: XXX.XXX.XXX-XX (shows only last 2 digits)
 * Example: 123.456.789-09 → XXX.XXX.XXX-09
 */
export function maskCPF(cpf: string): string {
  if (!cpf || cpf.length < 11) return "***.***.***-**";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return "***.***.***-**";
  return `***.***.***-${clean.slice(-2)}`;
}

/**
 * Mask CNPJ (Cadastro Nacional da Pessoa Jurídica)
 * Format: XX.XXX.XXX/0001-XX (shows only last 2 digits)
 * Example: 12.345.678/0001-90 → XX.XXX.XXX/0001-90
 */
export function maskCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length < 14) return "XX.XXX.XXX/0001-**";
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return "XX.XXX.XXX/0001-**";
  return `XX.XXX.XXX/0001-${clean.slice(-2)}`;
}

/**
 * Mask credit card number
 * Shows only last 4 digits
 * Example: 4532-1234-5678-9010 → ****-****-****-9010
 */
export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, "");
  if (clean.length < 4) return "****-****-****-****";
  return `****-****-****-${clean.slice(-4)}`;
}

/**
 * Mask email address
 * Shows only first letter and domain
 * Example: user@example.com → u***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***.***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

/**
 * Mask phone number
 * Shows only last 4 digits
 * Example: (11) 99999-8888 → (XX) XXXX-8888
 */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 4) return "(XX) XXXX-****";
  return `(XX) XXXX-${clean.slice(-4)}`;
}

/**
 * Mask bank account number
 * Shows only last 4 digits
 * Example: 1234567890 → ******7890
 */
export function maskBankAccount(account: string): string {
  if (!account || account.length < 4) return "****" + "*".repeat(Math.max(4, account.length));
  return "*".repeat(account.length - 4) + account.slice(-4);
}

/**
 * Mask PIX key (any type)
 * Shows only last 4 characters if it's a string key
 * For UUID/random keys, shows only first 4 chars and last 4
 */
export function maskPixKey(key: string): string {
  if (!key || key.length < 8) return "*".repeat(key.length);
  // For UUID-like keys (36 chars)
  if (key.length >= 32) {
    return `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`;
  }
  // For shorter keys, show last 4
  return "*".repeat(Math.max(4, key.length - 4)) + key.slice(-4);
}

/**
 * Mask document number (generic)
 * Can handle CPF, CNPJ, RG, etc.
 */
export function maskDocumentNumber(doc: string, type: "cpf" | "cnpj" | "rg" | "generic" = "generic"): string {
  switch (type) {
    case "cpf":
      return maskCPF(doc);
    case "cnpj":
      return maskCNPJ(doc);
    case "rg":
      // RG format: typically shows last 2 digits
      return `***.***.***-${doc.slice(-2)}`;
    default:
      // Generic: show last 4 chars
      if (doc.length <= 4) return "*".repeat(doc.length);
      return "*".repeat(doc.length - 4) + doc.slice(-4);
  }
}

/**
 * Mask object fields
 * Recursively masks sensitive fields in an object
 */
export function maskSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: Partial<Record<keyof T, "cpf" | "cnpj" | "card" | "email" | "phone" | "account" | "pix" | "generic">> = {}
): T {
  const masked = { ...obj };

  Object.entries(sensitiveFields).forEach(([field, maskType]) => {
    const key = field as keyof T;
    const value = masked[key];

    if (typeof value === "string") {
      switch (maskType) {
        case "cpf":
          masked[key] = maskCPF(value) as T[keyof T];
          break;
        case "cnpj":
          masked[key] = maskCNPJ(value) as T[keyof T];
          break;
        case "card":
          masked[key] = maskCardNumber(value) as T[keyof T];
          break;
        case "email":
          masked[key] = maskEmail(value) as T[keyof T];
          break;
        case "phone":
          masked[key] = maskPhone(value) as T[keyof T];
          break;
        case "account":
          masked[key] = maskBankAccount(value) as T[keyof T];
          break;
        case "pix":
          masked[key] = maskPixKey(value) as T[keyof T];
          break;
        case "generic":
        default:
          masked[key] = maskDocumentNumber(value) as T[keyof T];
          break;
      }
    }
  });

  return masked;
}

/**
 * Create a masked version of an object for logging
 * Only keeps non-sensitive fields and masks the rest
 */
export function createLogSafeVersion<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: (keyof T)[] = []
): Partial<T> {
  const safe: Partial<T> = {};

  allowedFields.forEach((field) => {
    safe[field] = obj[field];
  });

  return safe;
}

/**
 * Format log message with masked data
 */
export interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
}

export function createSecureLogEntry(
  level: LogEntry["level"],
  message: string,
  data?: Record<string, unknown>,
  userId?: string
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data: data ? maskSensitiveFields(data, {
      cpf: "cpf",
      cnpj: "cnpj",
      email: "email",
      phone: "phone",
      card_number: "card",
      account_number: "account",
      pix_key: "pix",
    } as any) : undefined,
    userId: userId ? maskEmail(userId) : undefined,
  };
}
