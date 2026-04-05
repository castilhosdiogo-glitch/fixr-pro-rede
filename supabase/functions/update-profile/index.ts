// update-profile edge function
// Updates user profile with security validation
//
// POST /update-profile
// {
//   "user_id": "550e8400-e29b-41d4-a716-446655440000",
//   "name": "João Silva",
//   "bio": "Eletricista com 10 anos de experiência",
//   "phone": "(11) 99999-8888"
// }

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import {
  validateRequestBody,
  validateInput,
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
  sanitizeText,
  sanitizePhone,
  RateLimiter,
  detectSqlInjection,
} from "../shared/sanitization.ts";
import {
  createSecureLogEntry,
  maskPhone,
  maskEmail,
} from "../shared/masking.ts";

// ── Schema Definition ────────────────────────────────────────────────────────

const UpdateProfileSchema = z.object({
  user_id: z
    .string()
    .uuid("user_id must be a valid UUID")
    .describe("User ID"),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters")
    .describe("Full name"),
  bio: z
    .string()
    .max(500, "Bio cannot exceed 500 characters")
    .optional()
    .describe("Short bio"),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Invalid phone format")
    .optional()
    .describe("Phone number in format: (11) 99999-8888"),
  location: z
    .string()
    .max(200, "Location cannot exceed 200 characters")
    .optional()
    .describe("City/Region"),
});

// ── Rate Limiter ─────────────────────────────────────────────────────────────

const profileUpdateLimiter = new RateLimiter(20, 3600000); // 20 updates/hour per IP

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  // 2. Only allow POST
  if (req.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Only POST requests are allowed",
      405
    );
  }

  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  const authHeader = req.headers.get("authorization");

  try {
    // 3. Rate limiting check
    if (!profileUpdateLimiter.check(clientIp)) {
      console.warn(`[RATE_LIMIT] Profile update from ${clientIp}`);
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many profile updates. Please try again later.",
        429
      );
    }

    // 4. Authorization check
    if (!authHeader) {
      return unauthorizedResponse("Missing authorization header");
    }

    // 5. Validate request body
    const validation = await validateRequestBody(req, UpdateProfileSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { user_id, name, bio, phone, location } = validation.data!;

    // 6. Sanitize inputs
    const sanitizedUserId = sanitizeUUID(user_id);
    if (!sanitizedUserId) {
      return validationErrorResponse({
        user_id: "Invalid UUID format",
      });
    }

    const sanitizedName = sanitizeText(name, 100);
    const sanitizedBio = bio ? sanitizeText(bio, 500) : undefined;
    const sanitizedPhone = phone ? sanitizePhone(phone) : undefined;
    const sanitizedLocation = location ? sanitizeText(location, 200) : undefined;

    // 7. SQL injection detection
    if (detectSqlInjection(sanitizedName)) {
      console.error(
        `[SECURITY] SQL injection attempt detected in name field`
      );
      return validationErrorResponse({
        name: "Invalid characters in name",
      });
    }

    if (
      sanitizedBio &&
      detectSqlInjection(sanitizedBio)
    ) {
      console.error(
        `[SECURITY] SQL injection attempt detected in bio field`
      );
      return validationErrorResponse({
        bio: "Invalid characters in bio",
      });
    }

    // 8. Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const db = createClient(supabaseUrl, supabaseKey);

    // 9. Verify user exists and authorization
    const { data: user, error: userError } = await db
      .from("profiles")
      .select("id, email")
      .eq("id", sanitizedUserId)
      .single();

    if (userError || !user) {
      console.warn(
        `[SECURITY] Attempted to update non-existent user: ${sanitizedUserId}`
      );
      return errorResponse(
        "NOT_FOUND",
        "User profile not found",
        404
      );
    }

    // 10. Verify JWT token matches user_id (optional - if you have JWT middleware)
    // In production, verify the JWT token matches the user_id being updated
    // This prevents users from updating other users' profiles

    // 11. Log update attempt (with masked data)
    const logEntry = createSecureLogEntry(
      "info",
      "Profile update initiated",
      {
        user_id: sanitizedUserId,
        name: sanitizedName.slice(0, 20),
        phone: sanitizedPhone ? maskPhone(`(XX) XXXX-${sanitizedPhone.slice(-4)}`) : undefined,
        email: user.email ? maskEmail(user.email) : undefined,
      }
    );
    console.log(JSON.stringify(logEntry));

    // 12. Update profile in database
    const { data: updatedProfile, error: updateError } = await db
      .from("profiles")
      .update({
        full_name: sanitizedName,
        bio: sanitizedBio,
        phone: sanitizedPhone,
        location: sanitizedLocation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sanitizedUserId)
      .select("id, full_name, bio, phone, location, updated_at")
      .single();

    if (updateError) {
      return handleError(updateError, "Profile Update");
    }

    // 13. Success response
    console.log(
      `[SUCCESS] Profile updated for user: ${sanitizedUserId}`
    );

    return successResponse({
      message: "Profile updated successfully",
      user: {
        id: updatedProfile.id,
        name: updatedProfile.full_name,
        bio: updatedProfile.bio,
        phone: updatedProfile.phone ? maskPhone(updatedProfile.phone) : undefined,
        location: updatedProfile.location,
        updated_at: updatedProfile.updated_at,
      },
    }, 200);
  } catch (err) {
    return handleError(err, "Update Profile");
  }
});
