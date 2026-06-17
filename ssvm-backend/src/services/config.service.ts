import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { cache, invalidateCache, isRedisAvailable } from "../lib/redis";

export class ConfigService {
  /**
   * Fetch a configuration value with Redis caching.
   * Caches the value for 5 minutes.
   */
  static async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const cacheKey = `config:${key}`;
    const ttl = 300; // 5 minutes

    const fetchConfig = async () => {
      const config = await prisma.appConfiguration.findUnique({
        where: { key }
      });

      if (!config) return defaultValue;

      try {
        switch (config.type) {
          case "BOOLEAN":
            return (config.value === "true") as unknown as T;
          case "NUMBER":
            return Number(config.value) as unknown as T;
          case "JSON":
            return JSON.parse(config.value) as unknown as T;
          default:
            return config.value as unknown as T;
        }
      } catch (err) {
        logger.error({ err, key, value: config.value }, "Failed to parse config value");
        return defaultValue;
      }
    };

    if (isRedisAvailable()) {
      return cache(cacheKey, ttl, fetchConfig);
    }
    return fetchConfig();
  }

  /**
   * Set or update a configuration value with history tracking.
   */
  static async set(
    key: string,
    value: any,
    type: "STRING" | "BOOLEAN" | "NUMBER" | "JSON" = "STRING",
    userId: string = "SYSTEM",
    reason: string = "Manual update"
  ): Promise<void> {
    const stringValue = type === "JSON" ? JSON.stringify(value) : String(value);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.appConfiguration.findUnique({ where: { key } });

      const config = await tx.appConfiguration.upsert({
        where: { key },
        update: { value: stringValue, type, updatedBy: userId },
        create: { key, value: stringValue, type, updatedBy: userId, description: reason }
      });

      // Record history
      await tx.configHistory.create({
        data: {
          configurationId: config.id,
          oldValue: existing?.value || null,
          newValue: stringValue,
          changedBy: userId,
          reason
        }
      });
    });

    // Invalidate Redis Cache
    await invalidateCache(`config:${key}`);
    logger.info({ key, type, userId }, "Configuration updated");
  }

  /**
   * Get all configurations (excluding secrets).
   */
  static async getAll() {
    return prisma.appConfiguration.findMany({
      where: { isSecret: false }
    });
  }
}
