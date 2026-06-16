import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { getEnv } from "../config/env";
import { Request, Response } from "express";

const env = getEnv();

// Configure Redis Client for Rate Limiting
const redisClient = env.REDIS_URL ? new Redis(env.REDIS_URL) : undefined;

if (!redisClient) {
  console.warn("⚠️ REDIS_URL not provided. Rate limiters will use memory store (not recommended for cluster mode).");
}

const defaultHandler = (req: Request, res: Response, next: any, options: any) => {
  res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
  res.status(options.statusCode).json({
    success: false,
    error: "Rate limit exceeded",
    retryAfter: Math.ceil(options.windowMs / 1000),
  });
};

const createLimiter = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  prefix: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: defaultHandler,
    keyGenerator: options.keyGenerator,
    store: redisClient
      ? new RedisStore({
          sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
          prefix: `rl:${options.prefix}:`,
        })
      : undefined,
  });
};

// 1. Auth Limiter: 10 req / 15 min per IP
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: "auth",
  keyGenerator: (req: Request) => {
    // Combine IP + email to prevent distributed attacks
    const email = req.body?.email || req.body?.admissionNo || "";
    return `${req.ip || "unknown"}:${email}`;
  },
});

// 2. Strict Limiter: 30 req / min per IP+userId
export const strictLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  prefix: "strict",
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || "anonymous";
    return `${req.ip}-${userId}`;
  },
});

// 3. Upload Limiter: 10 req / min per userId
export const uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: "upload",
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
});

// 4. Bulk Limiter: 3 req / min per userId
export const bulkLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 3,
  prefix: "bulk",
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
});

// 5. Webhook Limiter: 100 req / min per IP
export const webhookLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: "webhook",
});

// 6. Default Limiter: 100 req / min per IP
export const defaultLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: "default",
});

// 7. Per-School Rate Limiter: 300 req / min per school
export const perSchoolRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  prefix: "school",
  keyGenerator: (req: Request) => {
    const schoolId = (req as any).user?.schoolId || (req as any).ip || "unknown";
    return `school:${schoolId}`;
  },
});
