// push-notify edge function
// Sends Web Push notifications with security validation
//
// Environment variables required (set via `supabase secrets set`):
//   VAPID_PUBLIC_KEY   — base64url uncompressed P-256 public key
//   VAPID_PRIVATE_KEY  — base64url P-256 private key
//   SUPABASE_URL       — injected automatically
//   SUPABASE_SERVICE_ROLE_KEY — injected automatically

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PushNotificationSchema,
  validateRequestBody,
} from "../shared/validation.ts";
import {
  successResponse,
  validationErrorResponse,
  corsPreflightResponse,
  handleError,
  errorResponse,
} from "../shared/response.ts";
import { sanitizeUUID, RateLimiter } from "../shared/sanitization.ts";
import { createSecureLogEntry } from "../shared/masking.ts";

// Rate limiter: 30 notifications per minute per IP
const pushRateLimiter = new RateLimiter(30, 60000);

// ── VAPID helpers (no external web-push lib needed) ─────────────────────────

function base64urlToUint8(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ToBase64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function buildVapidHeaders(
  endpoint: string,
  vapidPublic: string,
  vapidPrivate: string,
): Promise<{ Authorization: string; "Crypto-Key": string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const subject = "mailto:admin@fixr.com.br";

  const header = uint8ToBase64url(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const payload = uint8ToBase64url(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  );

  const signingInput = `${header}.${payload}`;
  const privKeyBytes = base64urlToUint8(vapidPrivate);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    privKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const sig = uint8ToBase64url(new Uint8Array(sigBuf));
  const jwt = `${signingInput}.${sig}`;

  return {
    Authorization: `vapid t=${jwt},k=${vapidPublic}`,
    "Crypto-Key": `p256ecdsa=${vapidPublic}`,
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

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
    if (!pushRateLimiter.check(clientIp)) {
      console.warn(`[RATE_LIMIT] Push notification attempt from ${clientIp}`);
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many notification requests",
        429
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req, PushNotificationSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { user_id, title, body, icon, badge, tag } = validation.data!;

    // Sanitize UUID
    const sanitizedUserId = sanitizeUUID(user_id);
    if (!sanitizedUserId) {
      return validationErrorResponse({
        user_id: "Invalid UUID format",
      });
    }

    // Log notification attempt (masked)
    const logEntry = createSecureLogEntry(
      "info",
      "Push notification initiated",
      {
        user_id: sanitizedUserId,
        title: title.slice(0, 30), // Log first 30 chars only
        subscriptions_count: "pending",
      }
    );
    console.log(JSON.stringify(logEntry));

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Fetch subscriptions for this user
    const { data: subs, error: subsError } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, id")
      .eq("user_id", sanitizedUserId);

    if (subsError) {
      return handleError(subsError, "Fetch Subscriptions");
    }

    if (!subs || subs.length === 0) {
      console.log(`[INFO] No push subscriptions found for user: ${sanitizedUserId}`);
      return successResponse({
        sent: 0,
        message: "User has no active subscriptions",
      });
    }

    const payload = JSON.stringify({
      title: title.slice(0, 100),
      body: body.slice(0, 500),
      icon: icon || "/pwa-icon-512.png",
      badge: badge || "/pwa-icon-192.png",
      tag: tag || "fixr-notification",
      timestamp: new Date().toISOString(),
    });

    // Send push to all subscriptions in parallel
    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          const vapidHeaders = await buildVapidHeaders(
            sub.endpoint,
            vapidPublic,
            vapidPrivate
          );

          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              ...vapidHeaders,
              "Content-Type": "application/json",
              "Content-Length": String(new TextEncoder().encode(payload).length),
              "TTL": "300",
              "Urgency": "high",
            },
            body: payload,
          });

          // Remove expired subscriptions (410 Gone)
          if (res.status === 410) {
            console.warn(
              `[SUBSCRIPTION_EXPIRED] Removing subscription: ${sub.id}`
            );
            await db
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }

          return {
            status: res.status,
            success: res.ok,
          };
        } catch (err) {
          console.error(
            `[PUSH_ERROR] Failed to send to endpoint: ${(err as Error).message}`
          );
          return {
            status: 0,
            success: false,
          };
        }
      })
    );

    // Count successful sends
    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success
    ).length;

    console.log(
      `[SUCCESS] Push notification sent to ${sent}/${subs.length} subscriptions for user: ${sanitizedUserId}`
    );

    return successResponse({
      sent,
      total: subs.length,
      failed: subs.length - sent,
    });
  } catch (err) {
    return handleError(err, "Push Notification");
  }
});
