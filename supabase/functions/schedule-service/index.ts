// schedule-service edge function
// Schedules a service appointment with validation
//
// POST /schedule-service
// {
//   "user_id": "550e8400-e29b-41d4-a716-446655440000",
//   "service_request_id": "660e8400-e29b-41d4-a716-446655440001",
//   "scheduled_date": "2026-04-15",
//   "scheduled_time": "14:30",
//   "notes": "Preferência por turno da tarde"
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
  sanitizeText,
  RateLimiter,
} from "../shared/sanitization.ts";
import {
  createSecureLogEntry,
} from "../shared/masking.ts";

// 1. Define scheduling schema
const ScheduleServiceSchema = z.object({
  user_id: z
    .string()
    .uuid("user_id must be a valid UUID")
    .describe("Professional user ID"),
  service_request_id: z
    .string()
    .uuid("service_request_id must be a valid UUID")
    .describe("Service request ID"),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD")
    .describe("Scheduled date"),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in format HH:MM")
    .describe("Scheduled time (24-hour format)"),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .describe("Additional notes about the appointment"),
});

// 2. Rate limiter: max 30 scheduling per hour per IP
const scheduleRateLimiter = new RateLimiter(30, 3600000);

// 3. Helper to validate date/time
function validateDateTime(date: string, time: string): boolean {
  try {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    // Validate ranges
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (hour < 0 || hour > 23) return false;
    if (minute < 0 || minute > 59) return false;

    // Check if date is in the future (at least 1 hour from now)
    const scheduledDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    const minFutureTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    if (scheduledDateTime < minFutureTime) {
      return false;
    }

    // Check if date is not more than 90 days in the future
    const maxFutureTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    if (scheduledDateTime > maxFutureTime) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
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
    if (!scheduleRateLimiter.check(clientIp)) {
      console.warn(`[RATE_LIMIT] Schedule attempt from ${clientIp}`);
      return errorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many scheduling requests. Please try again later.",
        429
      );
    }

    // Validate request body
    const validation = await validateRequestBody(req, ScheduleServiceSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.errors!);
    }

    const { user_id, service_request_id, scheduled_date, scheduled_time, notes } = validation.data!;

    // Sanitize inputs
    const safeUserId = sanitizeUUID(user_id);
    const safeRequestId = sanitizeUUID(service_request_id);
    const safeNotes = notes ? sanitizeText(notes, 500) : null;

    if (!safeUserId || !safeRequestId) {
      return validationErrorResponse({
        user_id: safeUserId ? undefined : "Invalid user ID format",
        service_request_id: safeRequestId ? undefined : "Invalid request ID format",
      });
    }

    // Validate date/time logic
    if (!validateDateTime(scheduled_date, scheduled_time)) {
      return validationErrorResponse({
        scheduled_date: "Date must be at least 1 hour in the future and within 90 days",
        scheduled_time: "Time must be in the future and valid format HH:MM",
      });
    }

    // Log scheduling attempt (masked)
    const logEntry = createSecureLogEntry(
      "info",
      "Service scheduling initiated",
      {
        user_id: safeUserId,
        service_request_id: safeRequestId,
        scheduled_date,
        scheduled_time,
      }
    );
    console.log(JSON.stringify(logEntry));

    // Initialize Supabase
    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify professional exists
    const { data: professional, error: profError } = await db
      .from("profiles")
      .select("id, email")
      .eq("id", safeUserId)
      .eq("user_type", "professional")
      .single();

    if (profError || !professional) {
      console.warn(
        `[SECURITY] Schedule attempt by non-professional: ${safeUserId}`
      );
      return errorResponse(
        "FORBIDDEN",
        "Only professionals can schedule services",
        403
      );
    }

    // Verify service request exists and is accepted
    const { data: serviceRequest, error: requestError } = await db
      .from("service_requests")
      .select("id, client_id, status")
      .eq("id", safeRequestId)
      .single();

    if (requestError || !serviceRequest) {
      return errorResponse("NOT_FOUND", "Service request not found", 404);
    }

    if (serviceRequest.status !== "accepted") {
      return errorResponse(
        "CONFLICT",
        "Service request must be accepted before scheduling",
        409
      );
    }

    // Create scheduling record
    const scheduleDateTime = new Date(`${scheduled_date}T${scheduled_time}:00`);

    const { data: schedule, error: scheduleError } = await db
      .from("service_schedules")
      .insert({
        service_request_id: safeRequestId,
        professional_id: safeUserId,
        scheduled_at: scheduleDateTime.toISOString(),
        notes: safeNotes,
        status: "scheduled",
        created_at: new Date().toISOString(),
      })
      .select("id, scheduled_at, status")
      .single();

    if (scheduleError) {
      return handleError(scheduleError, "Schedule Creation");
    }

    // Update service request status
    await db
      .from("service_requests")
      .update({ status: "scheduled" })
      .eq("id", safeRequestId);

    // Get client for notification
    const { data: client } = await db
      .from("profiles")
      .select("id")
      .eq("id", serviceRequest.client_id)
      .single();

    // Trigger notification (if needed)
    if (client) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/push-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            user_id: client.id,
            title: "Agendamento Confirmado",
            body: `Seu serviço foi agendado para ${scheduled_date} às ${scheduled_time}`,
            tag: "service-scheduled",
          }),
        });
      } catch (err) {
        console.error("[NOTIFICATION_ERROR] Failed to send scheduling notification:", (err as Error).message);
        // Continue anyway - scheduling was successful
      }
    }

    // Success response
    console.log(
      `[SUCCESS] Service scheduled: ${safeRequestId} by professional ${safeUserId}`
    );

    return successResponse({
      message: "Service scheduled successfully",
      schedule: {
        id: schedule.id,
        scheduled_at: schedule.scheduled_at,
        status: schedule.status,
      },
    }, 201);
  } catch (err) {
    return handleError(err, "Service Scheduling");
  }
});
