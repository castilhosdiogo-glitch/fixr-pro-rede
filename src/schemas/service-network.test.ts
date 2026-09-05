import { describe, expect, it } from "vitest";
import {
  negotiationAuthoritySchema,
  quoteInputSchema,
  serviceCapabilitySchema,
  serviceRequestInputSchema,
} from "./service-network";

describe("YUD Service Network schemas", () => {
  it("accepts a minimal machine-readable service request", () => {
    const parsed = serviceRequestInputSchema.parse({
      category_id: "eletricista",
      description: "Instalar um chuveiro amanhã à tarde",
      city: "Curitiba",
      state: "PR",
      source_channel: "whatsapp",
      idempotency_key: "wa-msg-12345678",
    });

    expect(parsed.urgency).toBe("week");
    expect(parsed.source_channel).toBe("whatsapp");
    expect(parsed.hard_constraints).toEqual({});
    expect(parsed.soft_preferences).toEqual({});
  });

  it("rejects an inverted budget range", () => {
    const result = serviceRequestInputSchema.safeParse({
      category_id: "encanador",
      description: "Consertar vazamento",
      budget_min_cents: 30000,
      budget_max_cents: 20000,
      idempotency_key: "request-12345678",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an inverted desired time range", () => {
    const result = serviceRequestInputSchema.safeParse({
      category_id: "pintor",
      description: "Pintar uma parede",
      desired_start: "2026-09-06T18:00:00-03:00",
      desired_end: "2026-09-06T16:00:00-03:00",
      idempotency_key: "request-87654321",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an inverted professional price range", () => {
    const result = serviceCapabilitySchema.safeParse({
      professional_id: "5f12dcf5-667c-4a6c-9d8c-8aa470e257b0",
      category_id: "montador",
      title: "Montagem de móveis",
      min_price_cents: 25000,
      max_price_cents: 15000,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a bounded negotiation authority", () => {
    const parsed = negotiationAuthoritySchema.parse({
      may_auto_accept: true,
      max_customer_price_cents: 30000,
      allowed_start: "2026-09-06T14:00:00-03:00",
      allowed_end: "2026-09-06T18:00:00-03:00",
    });

    expect(parsed.may_auto_accept).toBe(true);
    expect(parsed.requires_human_approval_for_cancel).toBe(true);
  });

  it("accepts a professional quote contract", () => {
    const parsed = quoteInputSchema.parse({
      request_id: "5f12dcf5-667c-4a6c-9d8c-8aa470e257b0",
      professional_id: "72f4b29e-78aa-4d91-8c6d-4a68a15b6510",
      amount_cents: 18000,
      proposed_start: "2026-09-06T16:00:00-03:00",
      idempotency_key: "quote-12345678",
    });

    expect(parsed.currency).toBe("BRL");
    expect(parsed.amount_cents).toBe(18000);
  });
});
