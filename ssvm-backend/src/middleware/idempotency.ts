import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// Payment Idempotency Middleware (GAP 1)
// ═══════════════════════════════════════════
// Two-layer idempotency:
//   Layer 1: Redis SETNX with 24h TTL (fast path)
//   Layer 2: DB IdempotencyRecord (fallback when Redis misses)
//
// For payment endpoints, the key is computed as:
//   SHA256(razorpayOrderId + razorpayPaymentId)
//
// For other endpoints, uses the Idempotency-Key header.

const IDEMPOTENCY_HEADER = "idempotency-key";
const LOCK_EXPIRY_SECONDS = 86400; // 24 hours
const REDIS_KEY_PREFIX = "idempotency:";

/**
 * Compute a deterministic idempotency key from Razorpay payment identifiers.
 * Used for /payments/verify and /payments/webhook endpoints.
 */
function computePaymentIdempotencyKey(razorpayOrderId: string, razorpayPaymentId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${razorpayOrderId}:${razorpayPaymentId}`)
    .digest("hex");
}

/**
 * Extract idempotency key from the request.
 * Priority:
 *   1. Computed from Razorpay IDs in body (for payment endpoints)
 *   2. x-razorpay-event-id header (for webhooks)
 *   3. Idempotency-Key header (for general endpoints)
 */
function extractIdempotencyKey(req: Request): string | null {
  // Payment verification endpoint
  const { razorpay_order_id, razorpay_payment_id } = req.body || {};
  if (razorpay_order_id && razorpay_payment_id) {
    return computePaymentIdempotencyKey(razorpay_order_id, razorpay_payment_id);
  }

  // Webhook: use Razorpay event ID or compute from payload
  const eventId = req.headers["x-razorpay-event-id"] as string;
  if (eventId) {
    return crypto.createHash("sha256").update(eventId).digest("hex");
  }

  // General: use header
  const headerKey = req.headers[IDEMPOTENCY_HEADER];
  if (headerKey) {
    return Array.isArray(headerKey) ? headerKey[0] : headerKey;
  }

  return null;
}

/**
 * Check if a cached response exists in the DB (Layer 2 fallback).
 */
async function checkDbIdempotency(key: string): Promise<{ statusCode: number; body: any } | null> {
  try {
    const record = await (prisma as any).idempotencyRecord.findUnique({
      where: { key },
    });

    if (!record) return null;

    // Check if expired
    if (new Date(record.expiresAt) < new Date()) {
      // Expired — delete and return null
      await (prisma as any).idempotencyRecord.delete({ where: { key } }).catch(() => {});
      return null;
    }

    return record.response as { statusCode: number; body: any };
  } catch (err) {
    logger.warn({ err, key }, "DB idempotency check failed — proceeding");
    return null;
  }
}

/**
 * Store response in DB for Layer 2 durability.
 */
async function storeDbIdempotency(key: string, response: { statusCode: number; body: any }): Promise<void> {
  try {
    await (prisma as any).idempotencyRecord.upsert({
      where: { key },
      update: { response, status: "COMPLETED" },
      create: {
        key,
        response,
        status: "COMPLETED",
        expiresAt: new Date(Date.now() + LOCK_EXPIRY_SECONDS * 1000),
      },
    });
  } catch (err) {
    logger.warn({ err, key }, "DB idempotency store failed");
  }
}

/**
 * Primary idempotency middleware.
 *
 * For POST/PUT/PATCH requests with an idempotency key:
 *   1. Check Redis (Layer 1) → return cached response if found
 *   2. Check DB (Layer 2) → return cached response if found
 *   3. Set PROCESSING lock in Redis
 *   4. Intercept res.json() to capture and cache the response
 *   5. Store response in both Redis and DB
 */
export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Only process state-changing methods
  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
    return next();
  }

  const idempotencyKey = extractIdempotencyKey(req);

  // If no key can be derived, proceed without idempotency checks (fail open)
  if (!idempotencyKey) {
    return next();
  }

  const schoolId = (req as any).user?.schoolId || "system";
  const redisKey = `${REDIS_KEY_PREFIX}${schoolId}:${idempotencyKey}`;

  // ── Layer 1: Redis check ──
  if (isRedisAvailable()) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const existingResponse = await redis.get(redisKey);

        if (existingResponse) {
          if (existingResponse === "PROCESSING") {
            // Another request is currently processing this key — reject with 409
            res.status(409).json({
              success: false,
              error: "CONCURRENT_REQUEST",
              message: "This request is already being processed",
            });
            return;
          }

          // Replay cached response
          const cachedData = JSON.parse(existingResponse);
          logger.info({ idempotencyKey }, "Returning cached idempotent response (Redis)");
          res.status(cachedData.statusCode).json(cachedData.body);
          return;
        }
      }
    } catch (err) {
      logger.warn({ err, idempotencyKey }, "Redis idempotency check failed — falling through to DB");
    }
  }

  // ── Layer 2: DB check (fallback for Redis miss) ──
  const dbCached = await checkDbIdempotency(idempotencyKey);
  if (dbCached) {
    logger.info({ idempotencyKey }, "Returning cached idempotent response (DB fallback)");
    res.status(dbCached.statusCode).json(dbCached.body);
    return;
  }

  // ── Set PROCESSING lock in Redis ──
  if (isRedisAvailable()) {
    try {
      const redis = getRedisClient();
      if (redis) {
        // SETNX — only set if not exists
        const wasSet = await redis.set(redisKey, "PROCESSING", "EX", LOCK_EXPIRY_SECONDS, "NX");
        if (!wasSet) {
          // Another process just grabbed the lock between our GET and SETNX
          res.status(409).json({
            success: false,
            error: "CONCURRENT_REQUEST",
            message: "This request is already being processed",
          });
          return;
        }
      }
    } catch (err) {
      logger.warn({ err }, "Redis idempotency lock failed — proceeding without lock");
    }
  }

  // ── Intercept res.json to capture the response ──
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const responseToCache = {
      statusCode: res.statusCode,
      body,
    };

    // Store in Redis (fire-and-forget)
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        redis
          .set(redisKey, JSON.stringify(responseToCache), "EX", LOCK_EXPIRY_SECONDS)
          .catch((err) => logger.warn({ err }, "Redis idempotency cache store failed"));
      }
    }

    // Store in DB (fire-and-forget, Layer 2 durability)
    storeDbIdempotency(idempotencyKey, responseToCache);

    return originalJson(body);
  };

  next();
};

/**
 * Payment-specific idempotency middleware.
 * Always computes key from Razorpay identifiers when available.
 * Falls back to the general idempotency middleware behavior.
 */
export const paymentIdempotencyMiddleware = idempotencyMiddleware;

/**
 * Exported helper for computing payment idempotency keys.
 * Used by the webhook handler to verify/store idempotency inline.
 */
export { computePaymentIdempotencyKey };
