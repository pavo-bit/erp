"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRedis = initRedis;
exports.getRedisClient = getRedisClient;
exports.isRedisAvailable = isRedisAvailable;
exports.cache = cache;
exports.invalidateCache = invalidateCache;
exports.invalidatePattern = invalidatePattern;
exports.invalidateSchoolStats = invalidateSchoolStats;
exports.blocklistAccessToken = blocklistAccessToken;
exports.isTokenBlocklisted = isTokenBlocklisted;
exports.disconnectRedis = disconnectRedis;
exports.increment2FAAttempts = increment2FAAttempts;
exports.incrementFailedLogins = incrementFailedLogins;
exports.getFailedLogins = getFailedLogins;
exports.resetFailedLogins = resetFailedLogins;
const logger_1 = __importDefault(require("./logger"));
// ═══════════════════════════════════════════
// Redis Client (Phase 2 — Caching & Rate Limiting)
// ═══════════════════════════════════════════
// Fail-open pattern: Redis errors never crash the server.
// If Redis is unavailable, cache misses fall through to the database.
let redisClient = null;
let redisAvailable = false;
/**
 * Initialize Redis client. Called on startup if REDIS_URL is set.
 * Safe to call even if Redis is not configured — returns null.
 */
async function initRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        logger_1.default.info("REDIS_URL not set — caching disabled, using in-memory rate limiting");
        return;
    }
    try {
        const Redis = (await Promise.resolve().then(() => __importStar(require("ioredis")))).default;
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5)
                    return null; // Stop retrying after 5 attempts
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });
        redisClient.on("connect", () => {
            redisAvailable = true;
            logger_1.default.info("Redis connected");
        });
        redisClient.on("error", (err) => {
            redisAvailable = false;
            logger_1.default.warn({ err: err.message }, "Redis error — caching disabled");
        });
        redisClient.on("close", () => {
            redisAvailable = false;
        });
        await redisClient.connect();
    }
    catch (err) {
        logger_1.default.warn({ err }, "Failed to connect to Redis — caching disabled");
        redisClient = null;
        redisAvailable = false;
    }
}
/**
 * Get the Redis client instance (may be null if Redis is not configured).
 */
function getRedisClient() {
    return redisClient;
}
/**
 * Check if Redis is available.
 */
function isRedisAvailable() {
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
async function cache(key, ttl, fetchFn) {
    if (!isRedisAvailable()) {
        return fetchFn();
    }
    try {
        const cached = await redisClient.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
    }
    catch (err) {
        logger_1.default.warn({ err, key }, "Redis cache GET error — falling through");
    }
    // Cache miss — fetch from source
    const data = await fetchFn();
    // Store in cache (fire-and-forget)
    try {
        await redisClient.set(key, JSON.stringify(data), "EX", ttl);
    }
    catch (err) {
        logger_1.default.warn({ err, key }, "Redis cache SET error");
    }
    return data;
}
/**
 * Invalidate a single cache key.
 */
async function invalidateCache(key) {
    if (!isRedisAvailable())
        return;
    try {
        await redisClient.del(key);
    }
    catch (err) {
        logger_1.default.warn({ err, key }, "Redis cache DEL error");
    }
}
/**
 * Invalidate all cache keys matching a pattern (e.g. "stats:*:school123").
 * Uses SCAN to avoid blocking Redis with KEYS command.
 */
async function invalidatePattern(pattern) {
    if (!isRedisAvailable())
        return;
    try {
        let cursor = "0";
        do {
            const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redisClient.del(...keys);
            }
        } while (cursor !== "0");
    }
    catch (err) {
        logger_1.default.warn({ err, pattern }, "Redis invalidatePattern error");
    }
}
/**
 * Invalidate all stats caches for a school.
 * Call this after any stats-affecting write (new student, payment, etc.)
 */
async function invalidateSchoolStats(schoolId) {
    await invalidatePattern(`stats:*:${schoolId}`);
}
/**
 * Add an access token JTI (or signature) to the blocklist on logout.
 * Uses the token's remaining TTL for expiration.
 */
async function blocklistAccessToken(jtiOrSig, ttlSeconds = 900) {
    if (!isRedisAvailable()) {
        logger_1.default.error("Redis unavailable — failing closed on blocklist set");
        throw new Error("Security Service Unavailable");
    }
    try {
        await redisClient.set(`blocklist:${jtiOrSig}`, "1", "EX", ttlSeconds);
    }
    catch (err) {
        logger_1.default.error({ err, jtiOrSig }, "Redis blocklist set error — failing closed");
        throw new Error("Security Service Unavailable");
    }
}
/**
 * Check if an access token JTI (or signature) is blocklisted.
 */
async function isTokenBlocklisted(jtiOrSig) {
    if (!isRedisAvailable()) {
        logger_1.default.error("Redis unavailable — failing closed on token check");
        if (process.env.NODE_ENV === "test")
            return false;
        return true; // Fail closed (block access)
    }
    try {
        const isBlocked = await redisClient.exists(`blocklist:${jtiOrSig}`);
        return isBlocked === 1;
    }
    catch (err) {
        logger_1.default.error({ err, jtiOrSig }, "Redis blocklist check error — failing closed");
        return true; // Fail closed
    }
}
/**
 * Graceful shutdown — disconnect Redis.
 */
async function disconnectRedis() {
    if (redisClient) {
        await redisClient.quit();
        logger_1.default.info("Redis disconnected");
    }
}
/**
 * Increment 2FA attempts for a user (5 min window).
 * Returns the number of attempts in the current window.
 */
async function increment2FAAttempts(userId) {
    if (!isRedisAvailable()) {
        logger_1.default.error("Redis unavailable during 2FA — failing closed");
        throw new Error("Security Service Unavailable"); // Fail closed
    }
    try {
        const key = `2fa_attempts:${userId}`;
        const attempts = await redisClient.incr(key);
        if (attempts === 1) {
            await redisClient.expire(key, 300); // 5 minutes
        }
        return attempts;
    }
    catch (err) {
        logger_1.default.error({ err }, "Redis 2fa limit error — failing closed");
        throw new Error("Security Service Unavailable");
    }
}
/**
 * Increment failed login attempts for a user (15 min window).
 */
async function incrementFailedLogins(email) {
    if (!isRedisAvailable())
        return 0;
    try {
        const key = `failed_logins:${email}`;
        const attempts = await redisClient.incr(key);
        if (attempts === 1) {
            await redisClient.expire(key, 900); // 15 minutes lockout window
        }
        return attempts;
    }
    catch (err) {
        logger_1.default.error({ err }, "Redis failed logins error");
        return 0;
    }
}
async function getFailedLogins(email) {
    if (!isRedisAvailable() || !redisClient)
        return 0;
    try {
        const attempts = await redisClient.get(`failed_logins:${email}`);
        return attempts ? parseInt(attempts, 10) : 0;
    }
    catch {
        return 0;
    }
}
/**
 * Reset failed login attempts on successful login.
 */
async function resetFailedLogins(email) {
    if (!isRedisAvailable())
        return;
    try {
        await redisClient.del(`failed_logins:${email}`);
    }
    catch (err) {
        logger_1.default.error({ err }, "Redis reset failed logins error");
    }
}
