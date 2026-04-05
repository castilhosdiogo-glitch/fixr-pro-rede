// Response and error handling utilities
// Standardized API responses with security headers

import { getSecurityHeaders } from "./sanitization.ts";

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

/**
 * Success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...getSecurityHeaders(),
    },
  });
}

/**
 * Error response
 */
export function errorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...getSecurityHeaders(),
    },
  });
}

/**
 * Validation error response
 */
export function validationErrorResponse(
  errors: Record<string, string>
): Response {
  return errorResponse(
    "VALIDATION_ERROR",
    "Input validation failed",
    400,
    { fields: errors }
  );
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message: string = "Unauthorized"): Response {
  return errorResponse("UNAUTHORIZED", message, 401);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message: string = "Forbidden"): Response {
  return errorResponse("FORBIDDEN", message, 403);
}

/**
 * Not found response
 */
export function notFoundResponse(resource: string = "Resource"): Response {
  return errorResponse(
    "NOT_FOUND",
    `${resource} not found`,
    404
  );
}

/**
 * Rate limit exceeded response
 */
export function rateLimitResponse(retryAfter: number = 60): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        details: { retryAfter },
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        ...getSecurityHeaders(),
      },
    }
  );
}

/**
 * Server error response
 */
export function serverErrorResponse(
  message: string = "Internal server error"
): Response {
  // In production, log the full error securely but don't expose details
  return errorResponse(
    "INTERNAL_SERVER_ERROR",
    message,
    500
  );
}

/**
 * Bad request response
 */
export function badRequestResponse(message: string): Response {
  return errorResponse("BAD_REQUEST", message, 400);
}

/**
 * Conflict response (e.g., duplicate entry)
 */
export function conflictResponse(message: string): Response {
  return errorResponse("CONFLICT", message, 409);
}

/**
 * Handle CORS preflight request
 */
export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGINS || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
      "Access-Control-Max-Age": "86400",
      ...getSecurityHeaders(),
    },
  });
}

/**
 * Wrap response with CORS headers
 */
export function corsResponse(response: Response, origin?: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin || "*");
  headers.set("Access-Control-Allow-Credentials", "true");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Type-safe error handler
 */
export async function handleError(
  error: unknown,
  context: string = "Operation"
): Promise<Response> {
  if (error instanceof Error) {
    console.error(`[${context}] Error:`, error.message);

    // Don't expose internal error details to client
    if (error.message.includes("PERMISSION_DENIED")) {
      return forbiddenResponse("You don't have permission to perform this action");
    }

    if (error.message.includes("NOT_FOUND")) {
      return notFoundResponse("Resource");
    }

    if (error.message.includes("VALIDATION")) {
      return badRequestResponse("Invalid request data");
    }

    return serverErrorResponse();
  }

  console.error(`[${context}] Unknown error:`, error);
  return serverErrorResponse();
}
