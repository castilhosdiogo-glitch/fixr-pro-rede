// Validation schemas using Zod
// Deno import compatible

import { z } from "npm:zod@3.22.4";

/**
 * Payment Intent Validation Schema
 * Validates payment request data
 */
export const PaymentIntentSchema = z.object({
  broadcast_id: z
    .string()
    .uuid("broadcast_id must be a valid UUID")
    .describe("Broadcast request ID"),
  professional_id: z
    .string()
    .uuid("professional_id must be a valid UUID")
    .describe("Professional ID"),
  client_id: z
    .string()
    .uuid("client_id must be a valid UUID")
    .describe("Client ID"),
  amount_cents: z
    .number()
    .int("amount_cents must be an integer")
    .min(100, "Minimum amount is R$1.00 (100 cents)")
    .max(10000000, "Maximum amount is R$100,000.00 (10,000,000 cents)")
    .describe("Amount in cents (BRL)"),
  idempotency_key: z
    .string()
    .min(10)
    .max(255)
    .regex(
      /^[a-zA-Z0-9\-_]+$/,
      "idempotency_key must contain only alphanumeric characters, hyphens, and underscores"
    )
    .describe("Unique idempotency key for preventing duplicate payments"),
});

/**
 * Push Notification Subscription Schema
 */
export const PushSubscriptionSchema = z.object({
  user_id: z
    .string()
    .uuid("user_id must be a valid UUID")
    .describe("User ID"),
  endpoint: z
    .string()
    .url("endpoint must be a valid URL")
    .describe("Push service endpoint"),
  p256dh: z
    .string()
    .min(20)
    .describe("P256DH key"),
  auth: z
    .string()
    .min(20)
    .describe("Auth token"),
});

/**
 * Service Request Schema
 */
export const ServiceRequestSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title cannot exceed 200 characters")
    .describe("Service title"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters")
    .describe("Service description"),
  category: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z\s]+$/, "Category must contain only letters and spaces")
    .describe("Service category"),
  location: z
    .string()
    .min(5)
    .max(500)
    .describe("Service location"),
  budget_cents: z
    .number()
    .int()
    .positive("Budget must be positive")
    .optional()
    .describe("Budget in cents (optional)"),
});

/**
 * Push Notification Schema
 * For sending push notifications to users
 */
export const PushNotificationSchema = z.object({
  user_id: z
    .string()
    .uuid("user_id must be a valid UUID")
    .describe("User ID to send notification to"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title cannot exceed 100 characters")
    .describe("Notification title"),
  body: z
    .string()
    .min(1, "Body is required")
    .max(500, "Body cannot exceed 500 characters")
    .describe("Notification body"),
  icon: z
    .string()
    .url("Icon must be a valid URL")
    .optional()
    .describe("Icon URL (optional)"),
  badge: z
    .string()
    .url("Badge must be a valid URL")
    .optional()
    .describe("Badge URL (optional)"),
  tag: z
    .string()
    .max(50, "Tag cannot exceed 50 characters")
    .optional()
    .describe("Notification tag for grouping (optional)"),
});

/**
 * Generic validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

/**
 * Generic validation function
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with data or errors
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return {
      success: false,
      errors: { _general: "Validation failed" },
    };
  }
}

/**
 * Validate and parse JSON request body
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await req.json();
    return validateInput(schema, body);
  } catch {
    return {
      success: false,
      errors: { _body: "Invalid JSON in request body" },
    };
  }
}
