// export-user-data edge function
// Exports user's personal data for LGPD/GDPR Article 20 compliance
//
// POST /export-user-data
// {
//   "user_id": "550e8400-e29b-41d4-a716-446655440000",
//   "password": "user_password_for_verification"
// }

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import {
  validateRequestBody,
} from "../shared/validation.ts";
import {
  successResponse,
  validationErrorResponse,
  corsPreflightResponse,
  handleError,
  errorResponse,
  unauthorizedResponse,
} from "../shared/response.ts";
import {
  sanitizeUUID,
  RateLimiter,
} from "../shared/sanitization.ts";
import {
  createSecureLogEntry,
  maskEmail,
} from "../shared/masking.ts";

// 1. Define data export schema
const ExportDataSchema = z.object({
  user_id: z
    .string()
    .uuid("user_id must be a valid UUID")
    .describe("User ID requesting data export"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .describe("User password for verification"),
});

// 2. Rate limiter: max 5 export requests per hour per IP
const exportRateLimiter = new RateLimiter(5, 3600000);

// 3. Helper to fetch all user data
async function fetchUserData(
  db: ReturnType<typeof createClient>,
  userId: string
): Promise<Record<string, unknown>> {
  const [
    { data: profile },
    { data: services },
    { data: reviews },
    { data: payments },
    { data: kyc },
    { data: consents },
    { data: auditLog },
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).single(),
    db
      .from("service_requests")
      .select("*")
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`),
    db
      .from("reviews")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
    db
      .from("payments")
      .select("*")
      .or(`client_id.eq.${userId},professional_id.eq.${userId}`),
    db.from("kyc_submissions").select("*").eq("user_id", userId),
    db.from("user_consents").select("*").eq("user_id", userId),
    db.from("audit_log").select("*").eq("user_id", userId),
  ]);

  return {
    profile,
    services: services || [],
    reviews: reviews || [],
    payments: payments || [],
    kyc_submissions: kyc || [],
    consents: consents || [],
    audit_log: auditLog || [],
    export_date: new Date().toISOString(),
    format_version: "1.0",
  };
}

// 4. Handler
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  // Method check
  if (req.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Only POST requests are allowed",
      405
    );
  }

  const clientIp = req.headers.get("x-forwarded-for") || "unknown";

  try {
    // Rate limiting
    if (!exportRateLimiter.check(clientIp)) {
      console.warn(`[RATE_LIMIT] Data export attempt from ${clientIp}`);
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many export requests. Please try again later.",
        429
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req, ExportDataSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { user_id, password } = validation.data!;

    // Sanitize user ID
    const safeUserId = sanitizeUUID(user_id);
    if (!safeUserId) {
      return validationErrorResponse({
        user_id: "Invalid user ID format",
      });
    }

    // Log request (masked)
    const logEntry = createSecureLogEntry(
      "info",
      "User data export initiated",
      {
        user_id: safeUserId,
      }
    );
    console.log(JSON.stringify(logEntry));

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const db = createClient(supabaseUrl, supabaseKey);

    // Authenticate user (verify password)
    const {
      data: { user: authUser },
      error: authError,
    } = await db.auth.admin.getUserById(safeUserId);

    if (authError || !authUser) {
      console.warn(`[SECURITY] Export attempt for non-existent user: ${safeUserId}`);
      return unauthorizedResponse("User not found");
    }

    // Verify password by attempting sign in (requires valid password)
    const { error: signInError } = await db.auth.signInWithPassword({
      email: authUser.email!,
      password,
    });

    if (signInError) {
      console.warn(
        `[SECURITY] Invalid password for data export: ${maskEmail(authUser.email!)}`
      );
      return unauthorizedResponse("Invalid password");
    }

    // Get user profile for reference
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", safeUserId)
      .single();

    if (profileError || !profile) {
      return errorResponse("NOT_FOUND", "User profile not found", 404);
    }

    // Fetch all user data
    const userData = await fetchUserData(db, safeUserId);

    // Log successful export
    const successLog = createSecureLogEntry(
      "info",
      "User data exported successfully (LGPD Article 20)",
      {
        user_id: safeUserId,
        email: maskEmail(profile.email || ""),
        data_records: Object.keys(userData).length,
      }
    );
    console.log(JSON.stringify(successLog));

    // Insert audit log entry
    await db.from("audit_log").insert({
      user_id: safeUserId,
      action: "DATA_EXPORT",
      timestamp: new Date().toISOString(),
      details: {
        reason: "LGPD Article 20 - User data export",
        format: "JSON",
      },
    });

    // Return data as JSON (can be downloaded by frontend)
    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="fixr-data-${safeUserId}-${Date.now()}.json"`,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (err) {
    return handleError(err, "User Data Export");
  }
});
