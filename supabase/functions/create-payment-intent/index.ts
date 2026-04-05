// create-payment-intent edge function
// Creates a Stripe Payment Intent with security validation

import { createClient } from "npm:@supabase/supabase-js@2";
import { PaymentIntentSchema, validateRequestBody } from "../shared/validation.ts";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  corsPreflightResponse,
  handleError,
} from "../shared/response.ts";
import { RateLimiter, sanitizeUUID } from "../shared/sanitization.ts";
import { createSecureLogEntry } from "../shared/masking.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const COMMISSION_PERCENT = 15;

// Rate limiter: max 10 payment attempts per minute per IP
const paymentRateLimiter = new RateLimiter(10, 60000);

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests are allowed", 405);
  }

  const clientIp = req.headers.get("x-forwarded-for") || "unknown";

  try {
    // Rate limiting
    if (!paymentRateLimiter.check(clientIp)) {
      console.warn(`[RATE_LIMIT] Payment attempt from ${clientIp}`);
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many payment requests. Please try again later.",
        429
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const db = createClient(supabaseUrl, supabaseKey);

    // Validate and parse request body
    const validation = await validateRequestBody(req, PaymentIntentSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const {
      broadcast_id,
      professional_id,
      amount_cents,
      client_id,
      idempotency_key,
    } = validation.data!;

    // Sanitize UUIDs
    const sanitizedBroadcastId = sanitizeUUID(broadcast_id);
    const sanitizedProfessionalId = sanitizeUUID(professional_id);
    const sanitizedClientId = sanitizeUUID(client_id);

    if (!sanitizedBroadcastId || !sanitizedProfessionalId || !sanitizedClientId) {
      return validationErrorResponse({
        broadcast_id: "Invalid format",
        professional_id: "Invalid format",
        client_id: "Invalid format",
      });
    }

    // Log payment attempt (masked)
    const logEntry = createSecureLogEntry(
      "info",
      "Payment intent creation initiated",
      {
        broadcast_id: sanitizedBroadcastId,
        amount_cents,
        client_id: sanitizedClientId,
      }
    );
    console.log(JSON.stringify(logEntry));

    // Check idempotency: if same key exists, return existing payment
    const { data: existingPayment, error: idempotencyError } = await db
      .from("payments")
      .select("stripe_payment_intent, amount_paid_cents")
      .eq("idempotency_key", idempotency_key)
      .single();

    if (idempotencyError && idempotencyError.code !== "PGRST116") {
      // PGRST116 = no rows found (expected)
      return handleError(idempotencyError, "Idempotency Check");
    }

    if (existingPayment) {
      console.log(
        `[IDEMPOTENCY] Returning existing payment for key: ${idempotency_key}`
      );
      return successResponse({
        client_secret: existingPayment.stripe_payment_intent,
        amount_cents: existingPayment.amount_paid_cents,
        isIdempotent: true,
      });
    }

    // Verify broadcast exists and belongs to this client
    const { data: broadcast, error: broadcastError } = await db
      .from("service_requests")
      .select("id, description, client_id")
      .eq("id", sanitizedBroadcastId)
      .eq("client_id", sanitizedClientId)
      .single();

    if (broadcastError || !broadcast) {
      console.warn(
        `[SECURITY] Broadcast not found or access denied: ${sanitizedBroadcastId}`
      );
      return errorResponse(
        "NOT_FOUND",
        "Service request not found",
        404
      );
    }

    // Calculate commission
    const commission_cents = Math.round((amount_cents * COMMISSION_PERCENT) / 100);

    // Create Stripe PaymentIntent
    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amount_cents),
        currency: "brl",
        description: `Fixr - Service Payment`,
        metadata: {
          broadcast_id: sanitizedBroadcastId,
          professional_id: sanitizedProfessionalId,
          commission_percent: String(COMMISSION_PERCENT),
        },
        idempotency_key,
      }).toString(),
    });

    const stripeData = (await stripeResponse.json()) as {
      id?: string;
      client_secret?: string;
      error?: { message: string };
    };

    if (!stripeData.client_secret) {
      console.error(
        `[STRIPE_ERROR] Payment creation failed: ${stripeData.error?.message}`
      );
      return errorResponse(
        "PAYMENT_CREATION_FAILED",
        "Unable to create payment intent",
        400
      );
    }

    // Store payment record in DB
    const { data: payment, error: paymentError } = await db
      .from("payments")
      .insert({
        service_request_id: sanitizedBroadcastId,
        client_id: sanitizedClientId,
        professional_id: sanitizedProfessionalId,
        amount_paid_cents: amount_cents,
        commission_percent: COMMISSION_PERCENT,
        commission_amount_cents: commission_cents,
        stripe_payment_intent: stripeData.id,
        idempotency_key: idempotency_key,
        status: "pending",
      })
      .select("id")
      .single();

    if (paymentError) {
      console.error(`[DB_ERROR] Failed to record payment: ${paymentError.message}`);
      return handleError(paymentError, "Payment Record Storage");
    }

    // Success
    console.log(
      `[SUCCESS] Payment intent created: ${sanitizedClientId} - ${amount_cents} cents`
    );
    return successResponse({
      client_secret: stripeData.client_secret,
      amount_cents,
      commission_cents,
      payment_id: payment.id,
    });
  } catch (err) {
    return handleError(err, "Create Payment Intent");
  }
});
