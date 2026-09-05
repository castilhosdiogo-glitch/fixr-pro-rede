// YUD Service Network — first-party authenticated API
//
// This endpoint intentionally supports only authenticated human-owned flows.
// BYOA/external-agent authentication will be added behind a separate governed
// credential layer. Do not treat arbitrary caller-supplied agent IDs as trusted.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import {
  corsPreflightResponse,
  errorResponse,
  handleError,
  successResponse,
  validationErrorResponse,
} from "../shared/response.ts";
import { RateLimiter } from "../shared/sanitization.ts";

const DiscoverSchema = z.object({
  action: z.literal("discover"),
  category_id: z.string().min(1).max(120),
  city: z.string().min(2).max(120).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

const CreateRequestSchema = z.object({
  action: z.literal("create_request"),
  requester_agent_id: z.string().uuid().nullable().optional(),
  category_id: z.string().min(1).max(120),
  description: z.string().min(3).max(3000),
  city: z.string().min(2).max(120).nullable().optional(),
  state: z.string().min(2).max(40).nullable().optional(),
  address_text: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  urgency: z.enum(["today", "week", "flexible"]).default("week"),
  desired_start: z.string().datetime({ offset: true }).nullable().optional(),
  desired_end: z.string().datetime({ offset: true }).nullable().optional(),
  budget_min_cents: z.number().int().nonnegative().nullable().optional(),
  budget_max_cents: z.number().int().nonnegative().nullable().optional(),
  hard_constraints: z.record(z.unknown()).default({}),
  soft_preferences: z.record(z.unknown()).default({}),
  source_channel: z.enum(["whatsapp", "web", "api", "internal", "other"]).default("api"),
  idempotency_key: z.string().min(8).max(255),
});

const SubmitQuoteSchema = z.object({
  action: z.literal("submit_quote"),
  request_id: z.string().uuid(),
  professional_agent_id: z.string().uuid().nullable().optional(),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).default("BRL"),
  proposed_start: z.string().datetime({ offset: true }).nullable().optional(),
  proposed_end: z.string().datetime({ offset: true }).nullable().optional(),
  terms: z.record(z.unknown()).default({}),
  valid_until: z.string().datetime({ offset: true }).nullable().optional(),
  idempotency_key: z.string().min(8).max(255),
});

const GetRequestSchema = z.object({
  action: z.literal("get_request"),
  request_id: z.string().uuid(),
});

const AcceptQuoteSchema = z.object({
  action: z.literal("accept_quote"),
  request_id: z.string().uuid(),
  quote_id: z.string().uuid(),
  idempotency_key: z.string().min(8).max(255),
});

const BodySchema = z.discriminatedUnion("action", [
  DiscoverSchema,
  CreateRequestSchema,
  SubmitQuoteSchema,
  GetRequestSchema,
  AcceptQuoteSchema,
]);

const limiter = new RateLimiter(120, 60_000);

function bearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function validateRanges(body: z.infer<typeof BodySchema>): string | null {
  if (body.action === "create_request") {
    if (
      body.budget_min_cents != null &&
      body.budget_max_cents != null &&
      body.budget_min_cents > body.budget_max_cents
    ) return "budget_max_cents must be >= budget_min_cents";

    if (body.desired_start && body.desired_end) {
      if (Date.parse(body.desired_start) > Date.parse(body.desired_end)) {
        return "desired_end must be >= desired_start";
      }
    }
  }

  if (body.action === "submit_quote" && body.proposed_start && body.proposed_end) {
    if (Date.parse(body.proposed_start) > Date.parse(body.proposed_end)) {
      return "proposed_end must be >= proposed_start";
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests are allowed", 405);
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!limiter.check(ip)) {
    return errorResponse("RATE_LIMIT_EXCEEDED", "Too many requests", 429);
  }

  try {
    const token = bearerToken(req);
    if (!token) return errorResponse("UNAUTHORIZED", "Missing bearer token", 401);

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors);
    }

    const body = parsed.data;
    const rangeError = validateRanges(body);
    if (rangeError) return validationErrorResponse({ request: rangeError });

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!url || !anonKey || !serviceRoleKey) {
      return errorResponse("SERVER_CONFIGURATION_ERROR", "Service is not configured", 500);
    }

    // User-scoped client: all ordinary reads/writes are evaluated through RLS.
    const userDb = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userDb.auth.getUser();
    const user = authData.user;
    if (authError || !user) return errorResponse("UNAUTHORIZED", "Invalid session", 401);

    if (body.action === "discover") {
      const { data, error } = await userDb.rpc("yud_discover_professionals", {
        p_category_id: body.category_id,
        p_city: body.city ?? null,
        p_latitude: body.latitude ?? null,
        p_longitude: body.longitude ?? null,
        p_limit: body.limit,
      });

      if (error) return handleError(error, "YUD professional discovery");
      return successResponse({ professionals: data ?? [] });
    }

    if (body.action === "create_request") {
      if (body.requester_agent_id) {
        const { data: ownedAgent, error: ownedAgentError } = await userDb
          .from("agent_identities")
          .select("id, status")
          .eq("id", body.requester_agent_id)
          .eq("owner_user_id", user.id)
          .single();

        if (ownedAgentError || !ownedAgent || ownedAgent.status !== "active") {
          return errorResponse("FORBIDDEN", "Agent is not owned and active", 403);
        }
      }

      const payload = {
        client_id: user.id,
        requester_agent_id: body.requester_agent_id ?? null,
        category_id: body.category_id,
        description: body.description,
        city: body.city ?? null,
        state: body.state ?? null,
        address_text: body.address_text ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        urgency: body.urgency,
        desired_start: body.desired_start ?? null,
        desired_end: body.desired_end ?? null,
        budget_min_cents: body.budget_min_cents ?? null,
        budget_max_cents: body.budget_max_cents ?? null,
        hard_constraints: body.hard_constraints,
        soft_preferences: body.soft_preferences,
        source_channel: body.source_channel,
        status: "discovery",
        idempotency_key: body.idempotency_key,
      };

      const { data, error } = await userDb
        .from("agent_service_requests")
        .insert(payload)
        .select("*")
        .single();

      if (error && error.code === "23505") {
        const { data: existing, error: existingError } = await userDb
          .from("agent_service_requests")
          .select("*")
          .eq("idempotency_key", body.idempotency_key)
          .single();

        if (existingError) return handleError(existingError, "YUD request idempotency lookup");
        return successResponse({ request: existing, idempotent_replay: true });
      }

      if (error) return handleError(error, "YUD request creation");
      return successResponse({ request: data, idempotent_replay: false }, 201);
    }

    if (body.action === "submit_quote") {
      const { data: pro, error: proError } = await userDb
        .from("professional_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (proError || !pro) {
        return errorResponse("FORBIDDEN", "Professional profile required", 403);
      }

      if (body.professional_agent_id) {
        const { data: ownedAgent, error: ownedAgentError } = await userDb
          .from("agent_identities")
          .select("id, status, kind")
          .eq("id", body.professional_agent_id)
          .eq("owner_user_id", user.id)
          .single();

        if (
          ownedAgentError || !ownedAgent ||
          ownedAgent.status !== "active" || ownedAgent.kind !== "professional"
        ) {
          return errorResponse("FORBIDDEN", "Professional agent is not owned and active", 403);
        }
      }

      const { data, error } = await userDb
        .from("agent_service_quotes")
        .insert({
          request_id: body.request_id,
          professional_id: user.id,
          professional_agent_id: body.professional_agent_id ?? null,
          amount_cents: body.amount_cents,
          currency: body.currency.toUpperCase(),
          proposed_start: body.proposed_start ?? null,
          proposed_end: body.proposed_end ?? null,
          terms: body.terms,
          status: "submitted",
          valid_until: body.valid_until ?? null,
          idempotency_key: body.idempotency_key,
        })
        .select("*")
        .single();

      if (error && error.code === "23505") {
        const { data: existing, error: existingError } = await userDb
          .from("agent_service_quotes")
          .select("*")
          .eq("idempotency_key", body.idempotency_key)
          .eq("professional_id", user.id)
          .single();

        if (existingError) return handleError(existingError, "YUD quote idempotency lookup");
        return successResponse({ quote: existing, idempotent_replay: true });
      }

      if (error) return handleError(error, "YUD quote submission");
      return successResponse({ quote: data, idempotent_replay: false }, 201);
    }

    if (body.action === "get_request") {
      const { data: requestData, error: requestError } = await userDb
        .from("agent_service_requests")
        .select("*")
        .eq("id", body.request_id)
        .single();

      if (requestError || !requestData) {
        // Avoid leaking whether a request exists when RLS hides it.
        return errorResponse("NOT_FOUND", "Request not found", 404);
      }

      const { data: quotes } = await userDb
        .from("agent_service_quotes")
        .select("*")
        .eq("request_id", body.request_id)
        .order("created_at", { ascending: false });

      return successResponse({ request: requestData, quotes: quotes ?? [] });
    }

    // accept_quote is consequential and therefore server-mediated after
    // explicit human authentication and ownership checks.
    const adminDb = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: requestData, error: requestError } = await adminDb
      .from("agent_service_requests")
      .select("id, client_id, status")
      .eq("id", body.request_id)
      .single();

    if (requestError || !requestData || requestData.client_id !== user.id) {
      return errorResponse("FORBIDDEN", "Only the request owner may accept a quote", 403);
    }

    const { data: quote, error: quoteError } = await adminDb
      .from("agent_service_quotes")
      .select("*")
      .eq("id", body.quote_id)
      .eq("request_id", body.request_id)
      .single();

    if (quoteError || !quote) return errorResponse("NOT_FOUND", "Quote not found", 404);
    if (!["submitted", "countered", "accepted"].includes(quote.status)) {
      return errorResponse("CONFLICT", "Quote cannot be accepted in its current state", 409);
    }
    if (quote.valid_until && Date.parse(quote.valid_until) < Date.now()) {
      return errorResponse("CONFLICT", "Quote has expired", 409);
    }

    const { data: existingTransaction } = await adminDb
      .from("agent_service_transactions")
      .select("*")
      .eq("request_id", body.request_id)
      .maybeSingle();

    if (existingTransaction) {
      return successResponse({
        transaction: existingTransaction,
        idempotent_replay: true,
      });
    }

    const { data: transaction, error: transactionError } = await adminDb
      .from("agent_service_transactions")
      .insert({
        request_id: body.request_id,
        accepted_quote_id: quote.id,
        client_id: user.id,
        professional_id: quote.professional_id,
        agreed_amount_cents: quote.amount_cents,
        currency: quote.currency,
        scheduled_start: quote.proposed_start,
        scheduled_end: quote.proposed_end,
        status: quote.proposed_start ? "scheduled" : "accepted",
        metadata: { acceptance_idempotency_key: body.idempotency_key },
      })
      .select("*")
      .single();

    if (transactionError) return handleError(transactionError, "YUD transaction acceptance");

    await adminDb
      .from("agent_service_quotes")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("request_id", body.request_id)
      .neq("id", body.quote_id)
      .in("status", ["submitted", "countered"]);

    await adminDb
      .from("agent_service_quotes")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", body.quote_id);

    await adminDb
      .from("agent_service_requests")
      .update({
        status: quote.proposed_start ? "scheduled" : "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.request_id);

    await adminDb.from("agent_action_audit").insert({
      actor_user_id: user.id,
      action: "accept_quote",
      resource_type: "agent_service_request",
      resource_id: body.request_id,
      input_hash: null,
      decision: {
        quote_id: body.quote_id,
        transaction_id: transaction.id,
        amount_cents: quote.amount_cents,
      },
      authorization_context: {
        authenticated_human: true,
        request_owner: true,
        idempotency_key: body.idempotency_key,
      },
      success: true,
    });

    return successResponse({
      transaction,
      idempotent_replay: false,
    }, 201);
  } catch (err) {
    return handleError(err, "YUD Agent Network");
  }
});
