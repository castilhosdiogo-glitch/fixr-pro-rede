// YUD Service Network — WhatsApp Cloud API ingress adapter
//
// Responsibilities are intentionally narrow:
// 1. verify Meta webhook setup/signature;
// 2. normalize inbound provider messages into yud_channel_events;
// 3. resolve an existing YUD agent binding when one exists;
// 4. return quickly.
//
// It does NOT contain service/matching/model logic. WhatsApp is a channel,
// not the YUD core.

import { createClient } from "npm:@supabase/supabase-js@2";

const encoder = new TextEncoder();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody),
  );

  const expected = `sha256=${toHex(digest)}`;
  return constantTimeEqual(expected, signatureHeader.toLowerCase());
}

function getMessageText(message: Record<string, unknown>): string | null {
  if (message.type === "text") {
    const text = message.text as { body?: unknown } | undefined;
    return typeof text?.body === "string" ? text.body : null;
  }

  if (message.type === "button") {
    const button = message.button as { text?: unknown } | undefined;
    return typeof button?.text === "string" ? button.text : null;
  }

  if (message.type === "interactive") {
    const interactive = message.interactive as Record<string, unknown> | undefined;
    const buttonReply = interactive?.button_reply as { title?: unknown } | undefined;
    const listReply = interactive?.list_reply as { title?: unknown } | undefined;
    if (typeof buttonReply?.title === "string") return buttonReply.title;
    if (typeof listReply?.title === "string") return listReply.title;
  }

  return null;
}

function getMediaId(message: Record<string, unknown>): string | null {
  const type = typeof message.type === "string" ? message.type : "";
  if (!["audio", "image", "video", "document", "sticker"].includes(type)) {
    return null;
  }

  const media = message[type] as { id?: unknown } | undefined;
  return typeof media?.id === "string" ? media.id : null;
}

Deno.serve(async (req) => {
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      verifyToken && mode === "subscribe" && token === verifyToken && challenge
    ) {
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!appSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "SERVER_CONFIGURATION_ERROR" }, 500);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const validSignature = await verifyMetaSignature(rawBody, signature, appSecret);
  if (!validSignature) {
    return jsonResponse({ error: "INVALID_SIGNATURE" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "INVALID_JSON" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows: Array<Record<string, unknown>> = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value as Record<string, unknown> | undefined;
      if (!value) continue;

      const metadata = value.metadata as Record<string, unknown> | undefined;
      const recipient = typeof metadata?.phone_number_id === "string"
        ? metadata.phone_number_id
        : null;
      const messages = Array.isArray(value.messages) ? value.messages : [];

      for (const rawMessage of messages) {
        const message = rawMessage as Record<string, unknown>;
        const providerEventId = typeof message.id === "string" ? message.id : null;
        const sender = typeof message.from === "string" ? message.from : null;
        const messageType = typeof message.type === "string" ? message.type : "unknown";

        if (!providerEventId || !sender) continue;

        const { data: binding } = await admin
          .from("agent_channel_bindings")
          .select("agent_id")
          .eq("channel", "whatsapp")
          .eq("external_id", sender)
          .maybeSingle();

        rows.push({
          channel: "whatsapp",
          provider_event_id: providerEventId,
          external_sender_id: sender,
          external_recipient_id: recipient,
          message_type: messageType,
          text_body: getMessageText(message),
          media_id: getMediaId(message),
          agent_id: binding?.agent_id ?? null,
          status: "received",
          raw_payload: message,
          received_at: typeof message.timestamp === "string"
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
        });
      }
    }
  }

  if (rows.length === 0) {
    // Meta can send delivery/status notifications in the same webhook. They are
    // deliberately ignored by this first inbound-message adapter.
    return jsonResponse({ received: true, inserted: 0 });
  }

  const { error } = await admin
    .from("yud_channel_events")
    .upsert(rows, {
      onConflict: "channel,provider_event_id",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("YUD WhatsApp ingress failed", error.code, error.message);
    // Meta retries non-2xx responses. Do not expose provider payload/secrets.
    return jsonResponse({ error: "INGRESS_PERSISTENCE_FAILED" }, 500);
  }

  return jsonResponse({ received: true, inserted: rows.length });
});
