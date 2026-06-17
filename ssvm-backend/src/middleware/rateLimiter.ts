import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { getEnv } from "../config/env";
import { Request, Response } from "express";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// Rate Limiting (GAP 8 — Hardened)
// ═══════════════════════════════════════════
// 12 named limiters with Redis persistence.
// Standardized 429 responses with Retry-After + X-RateLimit-* headers.

const env = getEnv();

// Configure Redis Client for Rate Limiting
const redisClient = env.REDIS_URL ? new Redis(env.REDIS_URL) : undefined;

if (!redisClient) {
  logger.warn("REDIS_URL not provided. Rate limiters will use memory store (not recommended for cluster mode).");
}

const defaultHandler = (req: Request, res: Response, _next: any, options: any) => {
  const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
  res.setHeader("Retry-After", retryAfterSeconds);
  res.status(options.statusCode).json({
    success: false,
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please slow down.",
    retryAfter: retryAfterSeconds,
  });
};

const createLimiter = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  prefix: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,  // Return X-RateLimit-Limit, X-RateLimit-Remaining
    legacyHeaders: false,
    handler: defaultHandler,
    keyGenerator: options.keyGenerator,
    skipFailedRequests: options.skipFailedRequests,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    store: redisClient
      ? new RedisStore({
          sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
          prefix: `rl:${options.prefix}:`,
        })
      : undefined,
    validate: false,
  });
};

// ─────────────────────────────────────────────────────────────────────
// 1. Auth Limiter: 10 req / 15 min per IP+email (dual-key)
// ─────────────────────────────────────────────────────────────────────
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: "auth",
  keyGenerator: (req: Request) => {
    const email = req.body?.email || req.body?.admissionNo || "";
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "unknown";
    return `${ip}:${email}`;
  },
});

// ─────────────────────────────────────────────────────────────────────
// 2. Strict Limiter: 30 req / min per IP+userId
// ─────────────────────────────────────────────────────────────────────
export const strictLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  prefix: "strict",
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || "anonymous";
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "unknown";
    return `${ip}-${userId}`;
  },
});

// ─────────────────────────────────────────────────────────────────────
// 3. Upload Limiter: 10 req / min per userId
// ─────────────────────────────────────────────────────────────────────
export const uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: "upload",
  keyGenerator: (req: Request) => {
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "unknown";
    return (req as any).user?.id || ip;
  },
});

// ─────────────────────────────────────────────────────────────────────
// 4. Bulk Limiter: 3 req / min per userId
// ─────────────────────────────────────────────────────────────────────
export const bulkLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 3,
  prefix: "bulk",
  keyGenerator: (req: Request) => {
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "unknown";
    return (req as any).user?.id || ip;
  },
});

// ─────────────────────────────────────────────────────────────────────
// 5. Webhook Limiter: 1000 req / min per IP (raised for Razorpay bursts)
// ─────────────────────────────────────────────────────────────────────
export const webhookLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 1000,
  prefix: "webhook",
});

// ─────────────────────────────────────────────────────────────────────
// 6. Default Limiter: 100 req / min per IP
// ─────────────────────────────────────────────────────────────────────
export const defaultLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: "default",
});

// ─────────────────────────────────────────────────────────────────────
// 7. Per-School Rate Limiter: 300 req / min per school
// ─────────────────────────────────────────────────────────────────────
export const perSchoolRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  prefix: "school",
  keyGenerator: (req: Request) => {
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "unknown";
    const schoolId = (req as any).user?.schoolId || ip;
    return `school:${schoolId}`;
  },
});

// ═══════════════════════════════════════════
// GAP 8 — New Limiters
// ═══════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// 8. OTP Limiter: 3 OTP requests / 5 min per IP+userId
// ─────────────────────────────────────────────────────────────────────
export const otpLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 3,
  prefix: "otp",
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || req.body?.userId || "anonymous";
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "unknown";
    return `${ip}:${userId}`;
  },
});

// ─────────────────────────────────────────────────────────────────────
// 9. Password Reset Limiter: 3 req / 30 min per email
// ─────────────────────────────────────────────────────────────────────
export const passwordResetLimiter = createLimiter({
  windowMs: 30 * 60 * 1000,
  max: 3,
  prefix: "pwdreset",
  keyGenerator: (req: Request) => {
    const email = req.body?.email || "unknown";
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "unknown";
    return `${ip}:${email}`;
  },
});

// ─────────────────────────────────────────────────────────────────────
// 10. Payment Create Limiter: 10 req / 5 min per userId
// Prevents rapid order creation (click-spam, bot attacks)
// ─────────────────────────────────────────────────────────────────────
export const paymentCreateLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  prefix: "paycreate",
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip || "unknown";
  },
});

// ─────────────────────────────────────────────────────────────────────
// 11. Payment Verify Limiter: 20 req / min per IP
// Prevents brute-force signature guessing
// ─────────────────────────────────────────────────────────────────────
export const paymentVerifyLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  prefix: "payverify",
  skipSuccessfulRequests: true, // Only count failed attempts
});

// ─────────────────────────────────────────────────────────────────────
// 12. CRM/Enquiry Limiter: 5 req / min per IP
// Public-facing forms — strict to prevent spam
// ─────────────────────────────────────────────────────────────────────
export const crmLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  prefix: "crm",
});
