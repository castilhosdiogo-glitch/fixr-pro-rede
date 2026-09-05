import { z } from "zod";

export const channelTypeSchema = z.enum([
  "whatsapp",
  "web",
  "api",
  "internal",
  "other",
]);

export const agentKindSchema = z.enum([
  "customer",
  "professional",
  "external",
  "system",
]);

export const agentStatusSchema = z.enum([
  "active",
  "suspended",
  "revoked",
]);

export const serviceRequestStatusSchema = z.enum([
  "draft",
  "discovery",
  "matching",
  "negotiating",
  "proposed",
  "accepted",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
  "disputed",
]);

export const quoteStatusSchema = z.enum([
  "draft",
  "submitted",
  "countered",
  "accepted",
  "rejected",
  "expired",
  "withdrawn",
]);

export const availabilityStatusSchema = z.enum([
  "available",
  "blocked",
  "tentative",
  "booked",
]);

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const moneySchema = z.object({
  amount_cents: z.number().int().nonnegative(),
  currency: z.string().length(3).default("BRL"),
});

export const agentIdentitySchema = z.object({
  id: z.string().uuid().optional(),
  owner_user_id: z.string().uuid().nullable().optional(),
  kind: agentKindSchema,
  provider: z.string().min(1).max(80),
  external_subject: z.string().min(1).max(255).nullable().optional(),
  display_name: z.string().min(1).max(120).nullable().optional(),
  default_channel: channelTypeSchema.default("api"),
  scopes: z.array(z.string().min(1).max(120)).default([]),
  status: agentStatusSchema.default("active"),
  metadata: z.record(z.unknown()).default({}),
});

export const serviceCapabilitySchema = z.object({
  id: z.string().uuid().optional(),
  professional_id: z.string().uuid(),
  category_id: z.string().min(1).max(120),
  title: z.string().min(2).max(160),
  description: z.string().max(1000).nullable().optional(),
  active: z.boolean().default(true),
  min_price_cents: z.number().int().nonnegative().nullable().optional(),
  max_price_cents: z.number().int().nonnegative().nullable().optional(),
  pricing_unit: z.string().min(1).max(50).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
}).superRefine((value, ctx) => {
  if (
    value.min_price_cents != null &&
    value.max_price_cents != null &&
    value.min_price_cents > value.max_price_cents
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["max_price_cents"],
      message: "max_price_cents must be >= min_price_cents",
    });
  }
});

export const serviceRequestInputSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  requester_agent_id: z.string().uuid().nullable().optional(),
  category_id: z.string().min(1).max(120),
  description: z.string().min(3).max(3000),
  city: z.string().min(2).max(120).nullable().optional(),
  state: z.string().min(2).max(40).nullable().optional(),
  address_text: z.string().max(500).nullable().optional(),
  location: geoPointSchema.nullable().optional(),
  urgency: z.enum(["today", "week", "flexible"]).default("week"),
  desired_start: z.string().datetime({ offset: true }).nullable().optional(),
  desired_end: z.string().datetime({ offset: true }).nullable().optional(),
  budget_min_cents: z.number().int().nonnegative().nullable().optional(),
  budget_max_cents: z.number().int().nonnegative().nullable().optional(),
  hard_constraints: z.record(z.unknown()).default({}),
  soft_preferences: z.record(z.unknown()).default({}),
  source_channel: channelTypeSchema.default("api"),
  idempotency_key: z.string().min(8).max(255),
}).superRefine((value, ctx) => {
  if (
    value.budget_min_cents != null &&
    value.budget_max_cents != null &&
    value.budget_min_cents > value.budget_max_cents
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["budget_max_cents"],
      message: "budget_max_cents must be >= budget_min_cents",
    });
  }

  if (value.desired_start && value.desired_end) {
    const start = Date.parse(value.desired_start);
    const end = Date.parse(value.desired_end);
    if (Number.isFinite(start) && Number.isFinite(end) && start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["desired_end"],
        message: "desired_end must be >= desired_start",
      });
    }
  }
});

export const quoteInputSchema = z.object({
  request_id: z.string().uuid(),
  professional_id: z.string().uuid(),
  professional_agent_id: z.string().uuid().nullable().optional(),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).default("BRL"),
  proposed_start: z.string().datetime({ offset: true }).nullable().optional(),
  proposed_end: z.string().datetime({ offset: true }).nullable().optional(),
  terms: z.record(z.unknown()).default({}),
  valid_until: z.string().datetime({ offset: true }).nullable().optional(),
  idempotency_key: z.string().min(8).max(255),
});

export const negotiationAuthoritySchema = z.object({
  may_auto_accept: z.boolean().default(false),
  max_customer_price_cents: z.number().int().nonnegative().nullable().optional(),
  min_professional_price_cents: z.number().int().nonnegative().nullable().optional(),
  allowed_start: z.string().datetime({ offset: true }).nullable().optional(),
  allowed_end: z.string().datetime({ offset: true }).nullable().optional(),
  requires_human_approval_for_cancel: z.boolean().default(true),
});

export type ChannelType = z.infer<typeof channelTypeSchema>;
export type AgentKind = z.infer<typeof agentKindSchema>;
export type AgentIdentity = z.infer<typeof agentIdentitySchema>;
export type ServiceCapability = z.infer<typeof serviceCapabilitySchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestInputSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type NegotiationAuthority = z.infer<typeof negotiationAuthoritySchema>;
