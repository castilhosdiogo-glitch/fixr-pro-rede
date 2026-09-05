// YUD Service Network — WhatsApp Cloud API outbound worker
//
// Provider-specific sending is deliberately isolated from the Service Network
// core. Business logic writes provider-neutral messages to yud_channel_outbox;
// this worker delivers one queued WhatsApp text message.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";

const RequestSchema = z.object({
  outbox_id: z.string().uuid(),
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const workerToken = Deno.env.get("YUD_CHANNEL_WORKER_TOKEN") ?? "";
  const suppliedToken = req.headers.get("x-yud-worker-token") ?? "";
  if (!workerToken || !constantTimeEqual(workerToken, suppliedToken)) {
    return jsonResponse({ error: "UNAUTHORIZED" }, 401);
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonResponse({ error: "INVALID_REQUEST" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
  const graphVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION") ?? "v23.0";

  if (
    !supabaseUrl || !serviceRoleKey || !accessToken || !phoneNumberId ||
    !/^v\d+\.\d+$/.test(graphVersion)
  ) {
    return jsonResponse({ error: "SERVER_CONFIGURATION_ERROR" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: message, error: loadError } = await admin
    .from("yud_channel_outbox")
    .select("*")
    .eq("id", parsed.data.outbox_id)
    .eq("channel", "whatsapp")
    .single();

  if (loadError || !message) {
    return jsonResponse({ error: "OUTBOX_MESSAGE_NOT_FOUND" }, 404);
  }

  if (message.status === "sent") {
    return jsonResponse({ sent: true, idempotent_replay: true, message });
  }

  if (!["pending", "failed"].includes(message.status)) {
    return jsonResponse({ error: "OUTBOX_MESSAGE_NOT_SENDABLE" }, 409);
  }

  if (message.available_at && Date.parse(message.available_at) > Date.now()) {
    return jsonResponse({ error: "OUTBOX_MESSAGE_NOT_AVAILABLE_YET" }, 409);
  }

  if (message.message_type !== "text" || typeof message.text_body !== "string") {
    return jsonResponse({ error: "UNSUPPORTED_MESSAGE_TYPE" }, 422);
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("yud_channel_outbox")
    .update({
      status: "sending",
      attempts: Number(message.attempts ?? 0) + 1,
      updated_at: now,
    })
    .eq("id", message.id)
    .in("status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (claimError) {
    return jsonResponse({ error: "OUTBOX_CLAIM_FAILED" }, 500);
  }
  if (!claimed) {
    return jsonResponse({ error: "OUTBOX_ALREADY_CLAIMED" }, 409);
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.external_recipient_id,
          type: "text",
          text: {
            preview_url: false,
            body: message.text_body,
          },
        }),
      },
    );

    const providerBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("WhatsApp send failed", response.status);
      await admin
        .from("yud_channel_outbox")
        .update({
          status: "failed",
          last_error: `provider_http_${response.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      return jsonResponse({ error: "PROVIDER_SEND_FAILED" }, 502);
    }

    const providerMessageId = Array.isArray(providerBody?.messages) &&
        typeof providerBody.messages[0]?.id === "string"
      ? providerBody.messages[0].id
      : null;

    const { data: sent, error: updateError } = await admin
      .from("yud_channel_outbox")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", message.id)
      .select("*")
      .single();

    if (updateError) {
      // The provider may have accepted the message even if local persistence
      // failed. Keep this visible as an incident rather than silently retrying.
      console.error("WhatsApp provider accepted but local outbox update failed");
      return jsonResponse({
        error: "PROVIDER_ACCEPTED_LOCAL_STATE_UNRESOLVED",
        provider_message_id: providerMessageId,
      }, 500);
    }

    return jsonResponse({ sent: true, idempotent_replay: false, message: sent });
  } catch (error) {
    console.error("WhatsApp network error", error instanceof Error ? error.message : "unknown");
    await admin
      .from("yud_channel_outbox")
      .update({
        status: "failed",
        last_error: "provider_network_error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", message.id);

    return jsonResponse({ error: "PROVIDER_NETWORK_ERROR" }, 502);
  }
});
