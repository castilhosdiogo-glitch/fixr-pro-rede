// pagarme-webhook edge function
// Receives Pagar.me v5 webhook events with HMAC signature verification
//
// Environment variables required:
//   PAGARME_WEBHOOK_SECRET — shared secret configured in Pagar.me dashboard
//   SUPABASE_URL — injected automatically
//   SUPABASE_SERVICE_ROLE_KEY — injected automatically
//
// Docs: https://docs.pagar.me/reference/webhooks-2

import { createClient } from "npm:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("PAGARME_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── HMAC signature verification (Pagar.me sends sha256 hex in X-Hub-Signature) ─
async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.error("[pagarme-webhook] PAGARME_WEBHOOK_SECRET not configured");
    return false;
  }
  if (!header) return false;

  // Header formats: "sha256=<hex>" or raw "<hex>"
  const expectedHex = header.startsWith("sha256=") ? header.slice(7) : header;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare
  if (computedHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

// ── Event handlers ────────────────────────────────────────────────────────────

type PagarmeEvent = {
  id: string;
  type: string;
  created_at: string;
  data: Record<string, unknown>;
};

async function handleChargePaid(event: PagarmeEvent) {
  const charge = event.data as {
    id: string;
    order_id?: string;
    last_transaction?: { id?: string };
    payment_method?: string;
  };

  await db
    .from("payments")
    .update({
      status: "succeeded",
      pagarme_transaction_id: charge.last_transaction?.id ?? null,
      payment_method: charge.payment_method ?? null,
    })
    .eq("pagarme_charge_id", charge.id);
}

async function handleChargeFailed(event: PagarmeEvent) {
  const charge = event.data as { id: string };
  await db
    .from("payments")
    .update({ status: "failed" })
    .eq("pagarme_charge_id", charge.id);
}

async function handleChargeRefunded(event: PagarmeEvent) {
  const charge = event.data as { id: string };
  await db
    .from("payments")
    .update({
      status: "refunded",
      escrow_status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_reason: "pagarme_webhook",
    })
    .eq("pagarme_charge_id", charge.id);
}

async function handleSubscriptionCreated(event: PagarmeEvent) {
  const sub = event.data as {
    id: string;
    customer?: { id?: string };
    current_cycle?: { start_at?: string; end_at?: string };
    status?: string;
    metadata?: Record<string, string>;
  };
  const userId = sub.metadata?.user_id;
  if (!userId) return;

  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_name: "parceiro",
      status: (sub.status ?? "active") as string,
      pagarme_subscription_id: sub.id,
      pagarme_customer_id: sub.customer?.id ?? null,
      amount_cents: 2990,
      current_period_start: sub.current_cycle?.start_at ?? null,
      current_period_end: sub.current_cycle?.end_at ?? null,
    },
    { onConflict: "pagarme_subscription_id" },
  );

  // Sync plan on professional_profiles
  await db
    .from("professional_profiles")
    .update({ plan_name: "parceiro", commission_rate: 10, search_boost: 2 })
    .eq("user_id", userId);
}

async function handleSubscriptionCanceled(event: PagarmeEvent) {
  const sub = event.data as { id: string };
  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("pagarme_subscription_id", sub.id)
    .maybeSingle();

  await db
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("pagarme_subscription_id", sub.id);

  if (existing?.user_id) {
    await db
      .from("professional_profiles")
      .update({ plan_name: "explorador", commission_rate: 15, search_boost: 0 })
      .eq("user_id", existing.user_id);
  }
}

async function handleInvoicePaymentFailed(event: PagarmeEvent) {
  const invoice = event.data as {
    subscription?: { id?: string };
    charge?: { last_transaction?: { gateway_response?: { errors?: { message?: string }[] } } };
  };
  const subId = invoice.subscription?.id;
  if (!subId) return;

  const errMsg =
    invoice.charge?.last_transaction?.gateway_response?.errors?.[0]?.message ??
    "Cobrança recusada";

  await db.rpc("increment_subscription_failure", {
    p_pagarme_subscription_id: subId,
    p_reason: errMsg,
  }).then(async ({ error }) => {
    if (error) {
      // Fallback if RPC doesn't exist — direct update
      const { data: sub } = await db
        .from("subscriptions")
        .select("failure_count")
        .eq("pagarme_subscription_id", subId)
        .maybeSingle();
      await db
        .from("subscriptions")
        .update({
          status: "past_due",
          last_failed_at: new Date().toISOString(),
          failure_reason: errMsg,
          failure_count: (sub?.failure_count ?? 0) + 1,
        })
        .eq("pagarme_subscription_id", subId);
    }
  });
}

// ── Router ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature") ?? req.headers.get("X-Hub-Signature");

  const ok = await verifySignature(rawBody, signature);
  if (!ok) {
    console.warn("[pagarme-webhook] Invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: PagarmeEvent;
  try {
    event = JSON.parse(rawBody) as PagarmeEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!event.id || !event.type) {
    return new Response("Missing event id/type", { status: 400 });
  }

  // Idempotency check
  const { data: existing } = await db
    .from("pagarme_webhook_events")
    .select("id, processed_at")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing?.processed_at) {
    return new Response("OK (duplicate)", { status: 200 });
  }

  if (!existing) {
    await db.from("pagarme_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      payload: event,
    });
  }

  let processingError: string | null = null;
  try {
    switch (event.type) {
      case "charge.paid":
        await handleChargePaid(event);
        break;
      case "charge.payment_failed":
      case "charge.refused":
        await handleChargeFailed(event);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event);
        break;
      case "subscription.created":
      case "subscription.renewed":
        await handleSubscriptionCreated(event);
        break;
      case "subscription.canceled":
        await handleSubscriptionCanceled(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      default:
        console.log(`[pagarme-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    processingError = err instanceof Error ? err.message : String(err);
    console.error(`[pagarme-webhook] Processing error for ${event.type}:`, processingError);
  }

  await db
    .from("pagarme_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_error: processingError,
    })
    .eq("event_id", event.id);

  if (processingError) {
    return new Response("Processed with error", { status: 500 });
  }
  return new Response("OK", { status: 200 });
});
