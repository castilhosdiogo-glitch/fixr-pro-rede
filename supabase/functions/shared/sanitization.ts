// Sanitization utilities for security
// Prevents XSS, HTML injection, and malicious input

/**
 * Escape HTML special characters
 * Prevents XSS attacks
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Remove HTML tags and sanitize
 * Safe for displaying user-generated content
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&[a-z]+;/gi, (entity) => {
      // Decode common entities
      const entities: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'",
      };
      return entities[entity] || entity;
    })
    .trim();
}

/**
 * Sanitize text input for database storage
 * Removes dangerous characters and trims whitespace
 */
export function sanitizeText(
  text: string,
  maxLength: number = 1000
): string {
  return text
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/^\s+|\s+$/g, "") // Trim whitespace
    .replace(/\s+/g, " "); // Normalize spaces
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize phone number
 * Keep only digits
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-11); // Keep last 11 digits for Brazil
}

/**
 * Sanitize URL
 * Prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUUID(uuid: string): string | null {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(uuid)) {
    return uuid.toLowerCase();
  }
  return null;
}

/**
 * Prevent SQL injection by checking for suspicious patterns
 */
export function detectSqlInjection(input: string): boolean {
  const sqlInjectionPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(-{2}|\/\*|\*\/|;)/,
    /(\bOR\b|\bAND\b).*=.*/, // Classic: OR 1=1
  ];

  return sqlInjectionPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize object with HTML escaping
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToEscape: (keyof T)[] = []
): T {
  const sanitized = { ...obj };

  fieldsToEscape.forEach((field) => {
    if (typeof sanitized[field] === "string") {
      sanitized[field] = escapeHtml(sanitized[field] as string) as T[keyof T];
    }
  });

  return sanitized;
}

/**
 * Create secure response headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };
}

/**
 * Rate limit check (in-memory simple implementation)
 * For production, use Redis or database
 */
export class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(identifier: string): boolean {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      // New window
      this.store.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemaining(identifier: string): number {
    const record = this.store.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - record.count);
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
  }
}
