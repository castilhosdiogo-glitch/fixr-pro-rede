// verify-kyc-document edge function
// Submits KYC document for verification
//
// POST /verify-kyc-document
// {
//   "user_id": "550e8400-e29b-41d4-a716-446655440000",
//   "document_type": "rg",
//   "document_front_url": "https://...",
//   "document_back_url": "https://...",
//   "selfie_url": "https://..."
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
} from "../shared/response.ts";
import {
  sanitizeUUID,
  sanitizeURL,
  RateLimiter,
} from "../shared/sanitization.ts";
import {
  createSecureLogEntry,
} from "../shared/masking.ts";

// 1. Define KYC schema
const KYCDocumentSchema = z.object({
  user_id: z
    .string()
    .uuid("user_id must be a valid UUID")
    .describe("User ID"),
  document_type: z
    .enum(["rg", "cnh", "passport"], {
      errorMap: () => ({
        message: "document_type must be one of: rg, cnh, passport",
      }),
    })
    .describe("Type of document"),
  document_front_url: z
    .string()
    .url("document_front_url must be a valid URL")
    .describe("URL to front of document image"),
  document_back_url: z
    .string()
    .url("document_back_url must be a valid URL")
    .optional()
    .describe("URL to back of document image"),
  selfie_url: z
    .string()
    .url("selfie_url must be a valid URL")
    .describe("URL to selfie holding document"),
});

// 2. Rate limiter: max 5 KYC submissions per hour per IP
const kycLimiter = new RateLimiter(5, 3600000);

// 3. Handler
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
    if (!kycLimiter.check(clientIp)) {
      console.warn(`[RATE_LIMIT] KYC submission from ${clientIp}`);
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many KYC submissions. Please try again later.",
        429
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req, KYCDocumentSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { user_id, document_type, document_front_url, document_back_url, selfie_url } = validation.data!;

    // Sanitize inputs
    const safeUserId = sanitizeUUID(user_id);
    const safeFrontUrl = sanitizeURL(document_front_url);
    const safeBackUrl = document_back_url ? sanitizeURL(document_back_url) : null;
    const safeSelfieUrl = sanitizeURL(selfie_url);

    if (!safeUserId || !safeFrontUrl || !safeSelfieUrl) {
      return validationErrorResponse({
        user_id: safeUserId ? undefined : "Invalid user ID format",
        document_front_url: safeFrontUrl ? undefined : "Invalid document front URL",
        selfie_url: safeSelfieUrl ? undefined : "Invalid selfie URL",
      });
    }

    if (document_back_url && !safeBackUrl) {
      return validationErrorResponse({
        document_back_url: "Invalid document back URL",
      });
    }

    // Log submission (masked)
    const logEntry = createSecureLogEntry(
      "info",
      "KYC document submitted",
      {
        user_id: safeUserId,
        document_type,
      }
    );
    console.log(JSON.stringify(logEntry));

    // Initialize Supabase
    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user exists
    const { data: user, error: userError } = await db
      .from("profiles")
      .select("id, email")
      .eq("id", safeUserId)
      .single();

    if (userError || !user) {
      console.warn(
        `[SECURITY] KYC attempt for non-existent user: ${safeUserId}`
      );
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // Create KYC submission record
    const { data: submission, error: submissionError } = await db
      .from("kyc_submissions")
      .insert({
        user_id: safeUserId,
        document_type,
        document_front_url: safeFrontUrl,
        document_back_url: safeBackUrl,
        selfie_url: safeSelfieUrl,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select("id, status, submitted_at")
      .single();

    if (submissionError) {
      return handleError(submissionError, "KYC Submission");
    }

    // Update profile status
    await db
      .from("profiles")
      .update({ kyc_status: "pending" })
      .eq("id", safeUserId);

    // Success response
    console.log(`[SUCCESS] KYC submitted for user: ${safeUserId}`);

    return successResponse({
      message: "KYC document submitted successfully",
      submission: {
        id: submission.id,
        status: submission.status,
        submitted_at: submission.submitted_at,
      },
    }, 200);
  } catch (err) {
    return handleError(err, "KYC Document Verification");
  }
});
