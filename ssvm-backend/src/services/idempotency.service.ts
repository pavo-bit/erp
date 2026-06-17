import logger from '../lib/logger';
import { getRedisClient, isRedisAvailable } from '../lib/redis';

export class IdempotencyService {
  /**
   * Tries to acquire a lock using Redis SETNX.
   * Returns true if lock was acquired, false if it was already locked (conflict).
   * 
   * @param schoolId Context school
   * @param idempotencyKey The unique idempotency key
   * @param ttlSeconds TTL for the lock (default 24 hours = 86400)
   */
  static async acquireLock(schoolId: string, idempotencyKey: string, ttlSeconds: number = 86400): Promise<boolean> {
    if (!isRedisAvailable()) {
      logger.warn('Redis unavailable, idempotency lock bypassed, relying on DB constraints');
      return true; // Fail-open: rely on DB unique constraints
    }

    const redis = getRedisClient();
    if (!redis) return true;

    const lockKey = `idempotency:${schoolId}:${idempotencyKey}`;
    try {
      // NX: Set only if it does not exist
      // EX: Expire after X seconds
      const result = await redis.set(lockKey, 'locked', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      logger.error({ err, lockKey }, 'Redis idempotency lock error');
      return true; // Fail-open
    }
  }

  /**
   * Releases an idempotency lock if an operation failed and should be retried.
   */
  static async releaseLock(schoolId: string, idempotencyKey: string): Promise<void> {
    if (!isRedisAvailable()) return;
    const redis = getRedisClient();
    if (!redis) return;

    const lockKey = `idempotency:${schoolId}:${idempotencyKey}`;
    try {
      await redis.del(lockKey);
    } catch (err) {
      logger.error({ err, lockKey }, 'Redis idempotency unlock error');
    }
  }
}
