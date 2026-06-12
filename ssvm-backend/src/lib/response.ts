import { Response } from "express";
import crypto from "crypto";

// ═══════════════════════════════════════════
// Standardized API Response Helpers
// ═══════════════════════════════════════════
// Every response follows: { success: boolean, data?: T, error?: string, meta?: object }

/**
 * 200 OK — Standard success response.
 */
export function success<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

/**
 * 200 OK — Success with pagination metadata.
 */
export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
): void {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

/**
 * 201 Created — Resource created successfully.
 */
export function created<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data });
}

/**
 * 202 Accepted — Request queued for background processing.
 */
export function accepted(res: Response, message: string, jobId?: string): void {
  res.status(202).json({ success: true, message, ...(jobId && { jobId }) });
}

/**
 * 204 No Content — Successful deletion or action with no body.
 */
export function noContent(res: Response): void {
  res.status(204).send();
}

/**
 * 400 Bad Request — Client sent invalid data.
 */
export function badRequest(res: Response, error: string): void {
  res.status(400).json({ success: false, error });
}

/**
 * 401 Unauthorized — Missing or invalid authentication.
 */
export function unauthorized(res: Response, error = "Unauthorized — please log in"): void {
  res.status(401).json({ success: false, error });
}

/**
 * 403 Forbidden — Authenticated but insufficient permissions.
 */
export function forbidden(res: Response, error = "Forbidden — insufficient permissions"): void {
  res.status(403).json({ success: false, error });
}

/**
 * 404 Not Found — Resource does not exist.
 */
export function notFound(res: Response, resource = "Resource"): void {
  res.status(404).json({ success: false, error: `${resource} not found` });
}

/**
 * 409 Conflict — Duplicate key or business rule violation.
 */
export function conflict(res: Response, error: string): void {
  res.status(409).json({ success: false, error });
}

/**
 * 422 Unprocessable Entity — Validation errors.
 */
export function unprocessable(res: Response, errors: Record<string, string[]> | string): void {
  if (typeof errors === "string") {
    res.status(422).json({ success: false, error: errors });
  } else {
    res.status(422).json({ success: false, error: "Validation failed", details: errors });
  }
}

/**
 * 429 Too Many Requests — Rate limit exceeded.
 */
export function tooManyRequests(res: Response, retryAfterSeconds?: number): void {
  if (retryAfterSeconds) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
  }
  res.status(429).json({ success: false, error: "Too many requests — please try again later" });
}

/**
 * 500 Internal Server Error.
 */
export function serverError(res: Response, error = "An unexpected error occurred"): void {
  res.status(500).json({ success: false, error });
}

// ═══════════════════════════════════════════
// Response Middleware
// ═══════════════════════════════════════════

/**
 * Middleware that adds X-Request-ID and X-API-Version to every response.
 */
export function addResponseHeaders() {
  return (_req: import("express").Request, res: Response, next: import("express").NextFunction): void => {
    res.setHeader("X-Request-ID", crypto.randomUUID());
    res.setHeader("X-API-Version", "v1");
    next();
  };
}
