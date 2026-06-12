import rateLimit from "express-rate-limit";
import { AuthRequest } from "./auth";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// Rate Limiters (Phase 1.3)
// ═══════════════════════════════════════════
// Three tiers: global (IP), per-school (schoolId), and auth-specific (IP+email)

/**
 * Global rate limiter: 500 req/min per IP.
 * Applies to all routes as the first line of defense.
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests — please try again later" },
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  },
});

/**
 * Per-school rate limiter: 300 req/min per schoolId.
 * Prevents a single school from exhausting platform capacity.
 * Must be applied AFTER authenticate middleware.
 */
export const perSchoolLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "School rate limit exceeded — please try again later" },
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return `school:${authReq.user?.schoolId || req.ip || "unknown"}`;
  },
  skip: (req) => {
    // Skip for SUPER_ADMIN (they operate cross-school)
    const authReq = req as AuthRequest;
    return authReq.user?.role === "SUPER_ADMIN";
  },
});

/**
 * Auth rate limiter: 10 req/15min per IP.
 * Applies to login, register, OTP endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts — please try again after 15 minutes" },
  keyGenerator: (req) => {
    // Combine IP + email to prevent distributed attacks on a single account
    const email = req.body?.email || req.body?.admissionNo || "";
    return `auth:${req.ip || "unknown"}:${email}`;
  },
});

/**
 * OTP rate limiter: 5 req/15min per phone number.
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many OTP requests — please try again later" },
  keyGenerator: (req) => {
    return `otp:${req.body?.phone || req.ip || "unknown"}`;
  },
});

/**
 * Refresh token rate limiter: 30 req/15min per IP.
 * Generous enough for normal use but prevents abuse.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many refresh requests" },
});
