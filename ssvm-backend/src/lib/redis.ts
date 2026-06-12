import logger from "./logger";

// ═══════════════════════════════════════════
// Redis Client (Phase 2 — Caching & Rate Limiting)
// ═══════════════════════════════════════════
// Fail-open pattern: Redis errors never crash the server.
// If Redis is unavailable, cache misses fall through to the database.

let redisClient: import("ioredis").default | null = null;
let redisAvailable = false;

/**
 * Initialize Redis client. Called on startup if REDIS_URL is set.
 * Safe to call even if Redis is not configured — returns null.
 */
export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.info("REDIS_URL not set — caching disabled, using in-memory rate limiting");
    return;
  }

  try {
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on("connect", () => {
      redisAvailable = true;
      logger.info("Redis connected");
    });

    redisClient.on("error", (err) => {
      redisAvailable = false;
      logger.warn({ err: err.message }, "Redis error — caching disabled");
    });

    redisClient.on("close", () => {
      redisAvailable = false;
    });

    await redisClient.connect();
  } catch (err) {
    logger.warn({ err }, "Failed to connect to Redis — caching disabled");
    redisClient = null;
    redisAvailable = false;
  }
}

/**
 * Get the Redis client instance (may be null if Redis is not configured).
 */
export function getRedisClient(): import("ioredis").default | null {
  return redisClient;
}

/**
 * Check if Redis is available.
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient !== null;
}

// ═══════════════════════════════════════════
// Cache Helpers
// ═══════════════════════════════════════════

/**
 * Cache-aside pattern: Try to get from cache, fall through to fetchFn on miss.
 * On Redis error, silently falls through to fetchFn (fail-open).
 *
 * @param key - Cache key
 * @param ttl - TTL in seconds
 * @param fetchFn - Function to call on cache miss
 */
export async function cache<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
  if (!isRedisAvailable()) {
    return fetchFn();
  }

  try {
    const cached = await redisClient!.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    logger.warn({ err, key }, "Redis cache GET error — falling through");
  }

  // Cache miss — fetch from source
  const data = await fetchFn();

  // Store in cache (fire-and-forget)
  try {
    await redisClient!.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err) {
    logger.warn({ err, key }, "Redis cache SET error");
  }

  return data;
}

/**
 * Invalidate a single cache key.
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redisClient!.del(key);
  } catch (err) {
    logger.warn({ err, key }, "Redis cache DEL error");
  }
}

/**
 * Invalidate all cache keys matching a pattern (e.g. "stats:*:school123").
 * Uses SCAN to avoid blocking Redis with KEYS command.
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient!.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient!.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    logger.warn({ err, pattern }, "Redis invalidatePattern error");
  }
}

/**
 * Invalidate all stats caches for a school.
 * Call this after any stats-affecting write (new student, payment, etc.)
 */
export async function invalidateSchoolStats(schoolId: string): Promise<void> {
  await invalidatePattern(`stats:*:${schoolId}`);
}

/**
 * Add an access token JTI (or signature) to the blocklist on logout.
 * Uses the token's remaining TTL for expiration.
 */
export async function blocklistAccessToken(jtiOrSig: string, ttlSeconds: number = 900): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redisClient!.set(`blocklist:${jtiOrSig}`, "1", "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, jtiOrSig }, "Redis blocklist set error");
  }
}

/**
 * Check if an access token JTI (or signature) is blocklisted.
 */
export async function isTokenBlocklisted(jtiOrSig: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  try {
    const isBlocked = await redisClient!.exists(`blocklist:${jtiOrSig}`);
    return isBlocked === 1;
  } catch (err) {
    logger.warn({ err, jtiOrSig }, "Redis blocklist check error");
    return false; // Fail open
  }
}

/**
 * Graceful shutdown — disconnect Redis.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info("Redis disconnected");
  }
}
