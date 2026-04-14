// create-pagarme-payment edge function
// Creates a Pagar.me Order (charge) with split_rules to route money
// to the professional's recipient, keeping commission in the platform account.
//
// Required env vars:
//   PAGARME_API_KEY
//   PAGARME_PLATFORM_RECIPIENT_ID — platform's own recipient id (commission)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Body: {
//   service_request_id: uuid,
//   amount_cents: integer,
//   idempotency_key: string,
//   payment_method: "pix" | "credit_card" | "boleto",
//   card_token?: string  (required for credit_card)
// }

import { createClient } from "npm:@supabase/supabase-js@2";

const PAGARME_API_KEY = Deno.env.get("PAGARME_API_KEY") ?? "";
const PLATFORM_RECIPIENT_ID = Deno.env.get("PAGARME_PLATFORM_RECIPIENT_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PAGARME_BASE = "https://api.pagar.me/core/v5";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function pagarmeAuthHeader(): string {
  return `Basic ${btoa(`${PAGARME_API_KEY}:`)}`;
}

type RequestBody = {
  service_request_id: string;
  amount_cents: number;
  idempotency_key: string;
  payment_method: "pix" | "credit_card" | "boleto";
  card_token?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!PAGARME_API_KEY || !PLATFORM_RECIPIENT_ID) {
    return json({ error: "gateway_not_configured" }, 500);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.slice(7));
  if (authErr || !user) return json({ error: "invalid_token" }, 401);

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.service_request_id || !body.amount_cents || !body.idempotency_key || !body.payment_method) {
    return json({ error: "missing_fields" }, 400);
  }
  if (body.amount_cents < 100) {
    return json({ error: "amount_too_small" }, 400);
  }
  if (body.payment_method === "credit_card" && !body.card_token) {
    return json({ error: "card_token_required" }, 400);
  }

  // Idempotency
  const { data: existingPayment } = await db
    .from("payments")
    .select("id, pagarme_order_id, pagarme_charge_id, status")
    .eq("idempotency_key", body.idempotency_key)
    .maybeSingle();

  if (existingPayment) {
    return json({
      payment_id: existingPayment.id,
      pagarme_order_id: existingPayment.pagarme_order_id,
      pagarme_charge_id: existingPayment.pagarme_charge_id,
      status: existingPayment.status,
      idempotent: true,
    });
  }

  // Validate service + ownership
  const { data: service } = await db
    .from("service_requests")
    .select("id, client_id, professional_id, description")
    .eq("id", body.service_request_id)
    .maybeSingle();

  if (!service) return json({ error: "service_not_found" }, 404);
  if (service.client_id !== user.id) return json({ error: "not_service_client" }, 403);

  // Fetch pro recipient + commission rate
  const { data: pro } = await db
    .from("professional_profiles")
    .select("id, pagarme_recipient_id, pagarme_recipient_status, commission_rate")
    .eq("user_id", service.professional_id)
    .maybeSingle();

  if (!pro?.pagarme_recipient_id) {
    return json({ error: "professional_recipient_missing" }, 409);
  }
  if (pro.pagarme_recipient_status && pro.pagarme_recipient_status !== "active") {
    return json({ error: "professional_recipient_not_active", status: pro.pagarme_recipient_status }, 409);
  }

  const commissionPercent = Number(pro.commission_rate ?? 15);
  const commissionCents = Math.round((body.amount_cents * commissionPercent) / 100);
  const proCents = body.amount_cents - commissionCents;

  // Fetch customer profile for Pagar.me
  const { data: clientProfile } = await db
    .from("profiles")
    .select("full_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const customer = {
    name: clientProfile?.full_name ?? "Cliente Fixr",
    email: user.email,
    type: "individual",
  };

  const splitRules = [
    {
      recipient_id: pro.pagarme_recipient_id,
      amount: proCents,
      type: "flat",
      options: { charge_processing_fee: false, charge_remainder_fee: false, liable: true },
    },
    {
      recipient_id: PLATFORM_RECIPIENT_ID,
      amount: commissionCents,
      type: "flat",
      options: { charge_processing_fee: true, charge_remainder_fee: true, liable: true },
    },
  ];

  const paymentPayload: Record<string, unknown> = {
    payment_method: body.payment_method,
    split: splitRules,
  };
  if (body.payment_method === "credit_card") {
    paymentPayload.credit_card = {
      recurrence: false,
      installments: 1,
      statement_descriptor: "FIXR",
      card_token: body.card_token,
    };
  } else if (body.payment_method === "pix") {
    paymentPayload.pix = { expires_in: 3600 };
  } else if (body.payment_method === "boleto") {
    paymentPayload.boleto = {
      instructions: "Pagamento de serviço Fixr",
      due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const orderPayload = {
    items: [
      {
        amount: body.amount_cents,
        description: (service.description ?? "Serviço Fixr").slice(0, 255),
        quantity: 1,
      },
    ],
    customer,
    payments: [paymentPayload],
    metadata: {
      service_request_id: service.id,
      user_id: user.id,
      professional_id: service.professional_id,
    },
  };

  let order: {
    id?: string;
    charges?: Array<{
      id?: string;
      status?: string;
      last_transaction?: { id?: string; qr_code?: string; qr_code_url?: string; pdf?: string; url?: string };
    }>;
    errors?: unknown;
  };

  try {
    const res = await fetch(`${PAGARME_BASE}/orders`, {
      method: "POST",
      headers: {
        "Authorization": pagarmeAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });
    order = await res.json();
    if (!res.ok || !order.id) {
      console.error("[create-pagarme-payment] Order error:", order);
      return json({ error: "payment_failed", detail: order.errors ?? null }, 502);
    }
  } catch (err) {
    console.error("[create-pagarme-payment] Fetch error:", err);
    return json({ error: "payment_request_failed" }, 502);
  }

  const charge = order.charges?.[0];
  if (!charge?.id) {
    return json({ error: "charge_missing" }, 502);
  }

  const { data: paymentRecord, error: insertErr } = await db
    .from("payments")
    .insert({
      service_request_id: service.id,
      client_id: user.id,
      professional_id: service.professional_id,
      amount_paid_cents: body.amount_cents,
      commission_percent: commissionPercent,
      commission_amount_cents: commissionCents,
      status: charge.status === "paid" ? "succeeded" : "pending",
      pagarme_order_id: order.id,
      pagarme_charge_id: charge.id,
      pagarme_transaction_id: charge.last_transaction?.id ?? null,
      payment_method: body.payment_method,
      idempotency_key: body.idempotency_key,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[create-pagarme-payment] DB insert error:", insertErr);
    return json({ error: "db_insert_failed" }, 500);
  }

  return json({
    payment_id: paymentRecord.id,
    pagarme_order_id: order.id,
    pagarme_charge_id: charge.id,
    status: charge.status,
    qr_code: charge.last_transaction?.qr_code ?? null,
    qr_code_url: charge.last_transaction?.qr_code_url ?? null,
    boleto_url: charge.last_transaction?.pdf ?? charge.last_transaction?.url ?? null,
  }, 201);
});
