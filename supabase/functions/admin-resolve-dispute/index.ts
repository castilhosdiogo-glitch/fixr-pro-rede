// admin-resolve-dispute edge function
// Admin-only: resolves a service_disputes row (deny / refund_full / refund_partial).
// Refunds call the Pagar.me API directly against the charge's split; the existing
// pagarme-webhook (charge.refunded) may also fire asynchronously for full refunds —
// both paths converge on the same payments fields, so this is safe to run first.
//
// Required env vars:
//   PAGARME_API_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Body: {
//   dispute_id: uuid,
//   resolution: "refund_full" | "refund_partial" | "deny",
//   refund_amount_cents?: number,  // required for refund_partial
//   resolution_notes: string
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

type Resolution = "refund_full" | "refund_partial" | "deny";

type RequestBody = {
  dispute_id: string;
  resolution: Resolution;
  refund_amount_cents?: number;
  resolution_notes: string;
};

async function sendNotification(userId: string, type: string, title: string, body: string, data: Record<string, unknown>) {
  await db.from("notifications").insert({ user_id: userId, type, title, body, data });
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/push-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ user_id: userId, title, body, tag: "dispute-resolved" }),
    });
  } catch {
    // push é best-effort, nunca bloqueia a resolução
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.slice(7));
  if (authErr || !user) return json({ error: "invalid_token" }, 401);

  const { data: isAdmin, error: adminErr } = await db.rpc("is_admin", { _user_id: user.id });
  if (adminErr || !isAdmin) return json({ error: "forbidden" }, 403);

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.dispute_id || !body.resolution || !body.resolution_notes?.trim()) {
    return json({ error: "missing_fields" }, 400);
  }
  if (!["refund_full", "refund_partial", "deny"].includes(body.resolution)) {
    return json({ error: "invalid_resolution" }, 400);
  }
  if (body.resolution === "refund_partial" && (!body.refund_amount_cents || body.refund_amount_cents < 1)) {
    return json({ error: "refund_amount_required" }, 400);
  }

  const { data: dispute } = await db
    .from("service_disputes")
    .select("id, status, service_request_id, payment_id, client_id, professional_id")
    .eq("id", body.dispute_id)
    .maybeSingle();

  if (!dispute) return json({ error: "dispute_not_found" }, 404);
  if (!["open", "under_review"].includes(dispute.status)) {
    return json({ error: "dispute_already_resolved" }, 409);
  }

  const payment = dispute.payment_id
    ? (await db.from("payments").select("id, pagarme_charge_id, amount_paid_cents, escrow_status").eq("id", dispute.payment_id).maybeSingle()).data
    : null;

  let disputeStatus: string;
  let notifyTitle: string;
  let notifyBody: string;

  if (body.resolution === "deny") {
    disputeStatus = "resolved_denied";
    if (payment && payment.escrow_status === "held_by_admin") {
      await db.from("payments").update({
        escrow_status: "released",
        escrow_released_at: new Date().toISOString(),
        escrow_released_by: user.id,
      }).eq("id", payment.id);
    }
    notifyTitle = "Disputa analisada";
    notifyBody = "O time Fixr analisou sua contestação e decidiu manter o pagamento ao profissional.";
  } else {
    if (!payment?.pagarme_charge_id) {
      return json({ error: "payment_or_charge_missing" }, 409);
    }
    if (!PAGARME_API_KEY) {
      return json({ error: "gateway_not_configured" }, 500);
    }

    // NOTA: endpoint/payload não verificado contra a doc atual do Pagar.me nesta
    // sessão (acesso bloqueado). Confirmar POST /core/v5/charges/{id}/refund com
    // { amount } antes de usar em produção — ver docs.pagar.me/reference/refund-charge.
    const refundPayload: Record<string, unknown> = body.resolution === "refund_partial"
      ? { amount: body.refund_amount_cents }
      : {};

    try {
      const res = await fetch(`${PAGARME_BASE}/charges/${payment.pagarme_charge_id}/refund`, {
        method: "POST",
        headers: { "Authorization": pagarmeAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(refundPayload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        console.error("[admin-resolve-dispute] Pagar.me refund error:", detail);
        return json({ error: "refund_failed", detail }, 502);
      }
    } catch (err) {
      console.error("[admin-resolve-dispute] Pagar.me fetch error:", err);
      return json({ error: "refund_request_failed" }, 502);
    }

    const nowIso = new Date().toISOString();
    if (body.resolution === "refund_full") {
      disputeStatus = "resolved_refund_full";
      await db.from("payments").update({
        status: "refunded",
        escrow_status: "refunded",
        refunded_at: nowIso,
        refunded_by: user.id,
        refund_reason: body.resolution_notes,
      }).eq("id", payment.id);
      notifyTitle = "Reembolso aprovado";
      notifyBody = "O time Fixr aprovou o reembolso total do seu serviço contestado.";
    } else {
      disputeStatus = "resolved_refund_partial";
      await db.from("payments").update({
        escrow_status: "partially_refunded",
        refunded_at: nowIso,
        refunded_by: user.id,
        refund_reason: body.resolution_notes,
      }).eq("id", payment.id);
      notifyTitle = "Reembolso parcial aprovado";
      notifyBody = `O time Fixr aprovou um reembolso parcial de R$ ${((body.refund_amount_cents ?? 0) / 100).toFixed(2)}.`;
    }
  }

  await db.from("service_disputes").update({
    status: disputeStatus,
    resolution_amount_cents: body.resolution === "refund_partial" ? body.refund_amount_cents : null,
    resolution_notes: body.resolution_notes,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
  }).eq("id", dispute.id);

  await db.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "dispute_resolved",
    target_type: "service_dispute",
    target_id: dispute.id,
    metadata: { resolution: body.resolution, refund_amount_cents: body.refund_amount_cents ?? null },
  });

  await sendNotification(dispute.client_id, "dispute_resolved", notifyTitle, notifyBody, {
    url: "/meu-painel", dispute_id: dispute.id,
  });
  if (body.resolution !== "deny") {
    await sendNotification(dispute.professional_id, "dispute_resolved", "Disputa resolvida", notifyBody, {
      url: "/meu-painel", dispute_id: dispute.id,
    });
  }

  return json({ dispute_id: dispute.id, status: disputeStatus });
});
