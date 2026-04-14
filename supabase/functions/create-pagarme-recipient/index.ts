// create-pagarme-recipient edge function
// Creates a Pagar.me Recipient (payee bank account) for a professional.
// Used during onboarding so split payments can be routed to the pro.
//
// Required env vars:
//   PAGARME_API_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Body: {
//   bank: { bank_code, branch_number, account_number, account_check_digit,
//           holder_name, holder_document, type: "checking"|"savings" },
//   transfer_interval: "weekly"|"monthly"|"daily" (default weekly)
// }

import { createClient } from "npm:@supabase/supabase-js@2";

const PAGARME_API_KEY = Deno.env.get("PAGARME_API_KEY") ?? "";
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

type BankAccount = {
  bank_code: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  holder_name: string;
  holder_document: string;
  type: "checking" | "savings";
};

type RequestBody = {
  bank: BankAccount;
  transfer_interval?: "daily" | "weekly" | "monthly";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!PAGARME_API_KEY) {
    return json({ error: "gateway_not_configured" }, 500);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.slice(7));
  if (authErr || !user) return json({ error: "invalid_token" }, 401);

  // Must be a professional
  const { data: proProfile } = await db
    .from("professional_profiles")
    .select("id, pagarme_recipient_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!proProfile) return json({ error: "not_a_professional" }, 403);
  if (proProfile.pagarme_recipient_id) {
    return json({ error: "recipient_already_exists", recipient_id: proProfile.pagarme_recipient_id }, 409);
  }

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const b = body.bank;
  if (!b?.bank_code || !b.branch_number || !b.account_number || !b.account_check_digit ||
      !b.holder_name || !b.holder_document || !b.type) {
    return json({ error: "missing_bank_fields" }, 400);
  }

  const doc = b.holder_document.replace(/\D/g, "");
  const registerCode = doc.length > 11 ? "CNPJ" : "CPF";

  const payload = {
    register_information: {
      email: user.email,
      document: doc,
      type: registerCode === "CPF" ? "individual" : "corporation",
      name: b.holder_name,
      site_url: null,
      main_address: null,
    },
    transfer_settings: {
      transfer_enabled: true,
      transfer_interval: body.transfer_interval ?? "weekly",
      transfer_day: body.transfer_interval === "monthly" ? 5 : 1,
    },
    default_bank_account: {
      holder_name: b.holder_name,
      holder_type: registerCode === "CPF" ? "individual" : "company",
      holder_document: doc,
      bank: b.bank_code,
      branch_number: b.branch_number,
      branch_check_digit: b.branch_check_digit ?? null,
      account_number: b.account_number,
      account_check_digit: b.account_check_digit,
      type: b.type,
    },
    metadata: { user_id: user.id, professional_id: proProfile.id },
  };

  let recipientData: { id?: string; status?: string; errors?: unknown };
  try {
    const res = await fetch(`${PAGARME_BASE}/recipients`, {
      method: "POST",
      headers: {
        "Authorization": pagarmeAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    recipientData = await res.json();
    if (!res.ok || !recipientData.id) {
      console.error("[create-pagarme-recipient] Error:", recipientData);
      return json({ error: "recipient_failed", detail: recipientData.errors ?? null }, 502);
    }
  } catch (err) {
    console.error("[create-pagarme-recipient] Fetch error:", err);
    return json({ error: "recipient_request_failed" }, 502);
  }

  const { error: updateErr } = await db
    .from("professional_profiles")
    .update({
      pagarme_recipient_id: recipientData.id,
      pagarme_recipient_status: recipientData.status ?? "registration",
    })
    .eq("id", proProfile.id);

  if (updateErr) {
    console.error("[create-pagarme-recipient] DB update error:", updateErr);
    return json({ error: "db_update_failed" }, 500);
  }

  return json({
    recipient_id: recipientData.id,
    status: recipientData.status,
  }, 201);
});
