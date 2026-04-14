// create-pagarme-subscription edge function
// Creates a Pagar.me subscription for the Parceiro plan (R$29.90/mo)
//
// Required env vars:
//   PAGARME_API_KEY — secret API key (sk_live_... or sk_test_...)
//   PAGARME_PARCEIRO_PLAN_ID — plan id created in Pagar.me dashboard
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injected
//
// Body: { payment_method: "credit_card"|"pix"|"boleto", card_token?: string,
//         customer: { name, email, document, phone } }

import { createClient } from "npm:@supabase/supabase-js@2";

const PAGARME_API_KEY = Deno.env.get("PAGARME_API_KEY") ?? "";
const PAGARME_PLAN_ID = Deno.env.get("PAGARME_PARCEIRO_PLAN_ID") ?? "";
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
  payment_method: "credit_card" | "pix" | "boleto";
  card_token?: string;
  customer: {
    name: string;
    email: string;
    document: string;
    phone: string;
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!PAGARME_API_KEY || !PAGARME_PLAN_ID) {
    console.error("[create-pagarme-subscription] Missing PAGARME_API_KEY or PAGARME_PARCEIRO_PLAN_ID");
    return json({ error: "gateway_not_configured" }, 500);
  }

  // Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const { data: { user }, error: authErr } = await db.auth.getUser(
    authHeader.slice(7),
  );
  if (authErr || !user) return json({ error: "invalid_token" }, 401);

  // Body
  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.payment_method || !body.customer?.name || !body.customer?.email) {
    return json({ error: "missing_fields" }, 400);
  }
  if (body.payment_method === "credit_card" && !body.card_token) {
    return json({ error: "card_token_required" }, 400);
  }

  // Idempotency: block if user already has an active subscription
  const { data: existing } = await db
    .from("subscriptions")
    .select("id, status, pagarme_subscription_id")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "pending"])
    .maybeSingle();

  if (existing) {
    return json({ error: "already_subscribed", subscription_id: existing.id }, 409);
  }

  // Upsert Pagar.me customer
  let pagarmeCustomerId: string | null = null;
  const { data: proProfile } = await db
    .from("professional_profiles")
    .select("id, pagarme_recipient_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Create or reuse Pagar.me customer
  try {
    const customerRes = await fetch(`${PAGARME_BASE}/customers`, {
      method: "POST",
      headers: {
        "Authorization": pagarmeAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.customer.name,
        email: body.customer.email,
        document: body.customer.document.replace(/\D/g, ""),
        document_type: body.customer.document.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF",
        type: "individual",
        phones: {
          mobile_phone: parsePhone(body.customer.phone),
        },
        metadata: { user_id: user.id },
      }),
    });
    const customerData = await customerRes.json() as { id?: string; errors?: unknown };
    if (!customerRes.ok || !customerData.id) {
      console.error("[create-pagarme-subscription] Customer error:", customerData);
      return json({ error: "customer_failed", detail: customerData.errors ?? null }, 502);
    }
    pagarmeCustomerId = customerData.id;
  } catch (err) {
    console.error("[create-pagarme-subscription] Customer fetch error:", err);
    return json({ error: "customer_request_failed" }, 502);
  }

  // Create subscription
  const subPayload: Record<string, unknown> = {
    plan_id: PAGARME_PLAN_ID,
    customer_id: pagarmeCustomerId,
    payment_method: body.payment_method,
    metadata: { user_id: user.id, plan_name: "parceiro" },
  };
  if (body.payment_method === "credit_card") {
    subPayload.card_token = body.card_token;
  }

  let pagarmeSub: {
    id?: string;
    status?: string;
    current_cycle?: { start_at?: string; end_at?: string };
    errors?: unknown;
  };

  try {
    const subRes = await fetch(`${PAGARME_BASE}/subscriptions`, {
      method: "POST",
      headers: {
        "Authorization": pagarmeAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subPayload),
    });
    pagarmeSub = await subRes.json();
    if (!subRes.ok || !pagarmeSub.id) {
      console.error("[create-pagarme-subscription] Subscription error:", pagarmeSub);
      return json({ error: "subscription_failed", detail: pagarmeSub.errors ?? null }, 502);
    }
  } catch (err) {
    console.error("[create-pagarme-subscription] Subscription fetch error:", err);
    return json({ error: "subscription_request_failed" }, 502);
  }

  // Persist
  const { data: subRecord, error: insertErr } = await db
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan_name: "parceiro",
      status: pagarmeSub.status === "active" ? "active" : "pending",
      pagarme_subscription_id: pagarmeSub.id,
      pagarme_customer_id: pagarmeCustomerId,
      amount_cents: 2990,
      current_period_start: pagarmeSub.current_cycle?.start_at ?? null,
      current_period_end: pagarmeSub.current_cycle?.end_at ?? null,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[create-pagarme-subscription] DB insert error:", insertErr);
    return json({ error: "db_insert_failed" }, 500);
  }

  // Sync plan immediately if active (webhook is authoritative, this is optimistic)
  if (pagarmeSub.status === "active" && proProfile?.id) {
    await db
      .from("professional_profiles")
      .update({ plan_name: "parceiro", commission_rate: 10, search_boost: 2 })
      .eq("id", proProfile.id);
  }

  return json({
    subscription_id: subRecord.id,
    pagarme_subscription_id: pagarmeSub.id,
    status: pagarmeSub.status,
  }, 201);
});

function parsePhone(raw: string): { country_code: string; area_code: string; number: string } {
  const digits = raw.replace(/\D/g, "");
  // BR: 55 + 2-digit area + 8-9 digit number
  if (digits.startsWith("55") && digits.length >= 12) {
    return {
      country_code: "55",
      area_code: digits.slice(2, 4),
      number: digits.slice(4),
    };
  }
  if (digits.length >= 10) {
    return {
      country_code: "55",
      area_code: digits.slice(0, 2),
      number: digits.slice(2),
    };
  }
  return { country_code: "55", area_code: "00", number: digits };
}
