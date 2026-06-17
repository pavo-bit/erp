import { Request, Response, NextFunction } from "express";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// Brute Force Protection (GAP 8)
// ═══════════════════════════════════════════
// Progressive delay after failed auth attempts.
// After N failures, introduces increasing delays before responding.
// After MAX_FAILURES, locks the account temporarily.
//
// Redis key: auth:failures:{identifier}
// Redis value: JSON { count, firstFailedAt, lockedUntil }

const MAX_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const FAILURE_WINDOW_MS = 15 * 60 * 1000;   // 15 min window
const REDIS_PREFIX = "auth:failures:";

interface FailureRecord {
  count: number;
  firstFailedAt: number;
  lockedUntil: number | null;
}

/**
 * Get the failure record for an identifier (email or IP).
 */
async function getFailureRecord(identifier: string): Promise<FailureRecord | null> {
  if (!isRedisAvailable()) return null;

  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get(`${REDIS_PREFIX}${identifier}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Record a failed authentication attempt.
 */
async function recordFailure(identifier: string): Promise<FailureRecord> {
  const record: FailureRecord = {
    count: 1,
    firstFailedAt: Date.now(),
    lockedUntil: null,
  };

  if (!isRedisAvailable()) return record;

  const redis = getRedisClient();
  if (!redis) return record;

  try {
    const existing = await getFailureRecord(identifier);

    if (existing) {
      // Check if window has expired — reset
      if (Date.now() - existing.firstFailedAt > FAILURE_WINDOW_MS) {
        // Reset the window
        record.count = 1;
      } else {
        record.count = existing.count + 1;
        record.firstFailedAt = existing.firstFailedAt;
      }
    }

    // Lock if max failures reached
    if (record.count >= MAX_FAILURES) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      logger.warn({ identifier, count: record.count }, "Account locked due to brute force");
    }

    // Store with TTL slightly longer than lockout
    const ttlSeconds = Math.ceil((LOCKOUT_DURATION_MS + FAILURE_WINDOW_MS) / 1000);
    await redis.set(
      `${REDIS_PREFIX}${identifier}`,
      JSON.stringify(record),
      "EX",
      ttlSeconds
    );

    return record;
  } catch {
    return record;
  }
}

/**
 * Clear failure record on successful login.
 */
async function clearFailures(identifier: string): Promise<void> {
  if (!isRedisAvailable()) return;

  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`${REDIS_PREFIX}${identifier}`);
  } catch {
    // Ignore
  }
}

/**
 * Calculate progressive delay in milliseconds based on failure count.
 * Delays: 0, 0, 1s, 2s, 4s (then lockout at 5)
 */
function calculateDelay(failureCount: number): number {
  if (failureCount <= 1) return 0;
  if (failureCount === 2) return 1000;
  if (failureCount === 3) return 2000;
  if (failureCount === 4) return 4000;
  return 0; // Locked — no delay, just reject
}

/**
 * Middleware: Check if the account/IP is locked due to brute force.
 * Must be placed BEFORE the auth handler.
 */
export function bruteForceCheck(identifierExtractor?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identifier = identifierExtractor
      ? identifierExtractor(req)
      : req.body?.email || req.ip || "unknown";

    const record = await getFailureRecord(identifier);

    if (record && record.lockedUntil && Date.now() < record.lockedUntil) {
      const remainingMs = record.lockedUntil - Date.now();
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      res.setHeader("Retry-After", remainingSeconds);
      res.status(429).json({
        success: false,
        error: "ACCOUNT_LOCKED",
        message: `Too many failed attempts. Account locked for ${Math.ceil(remainingSeconds / 60)} minutes.`,
        retryAfter: remainingSeconds,
      });
      return;
    }

    // Add progressive delay if there are prior failures
    if (record && record.count > 1) {
      const delay = calculateDelay(record.count);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    next();
  };
}

/**
 * Call this AFTER a failed login to record the failure.
 */
export async function onAuthFailure(identifier: string): Promise<FailureRecord> {
  return recordFailure(identifier);
}

/**
 * Call this AFTER a successful login to clear failures.
 */
export async function onAuthSuccess(identifier: string): Promise<void> {
  return clearFailures(identifier);
}
