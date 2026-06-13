import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import { StorageService } from "../services/StorageService";
import logger from "../lib/logger";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const health = {
    version: process.env.npm_package_version || "3.0.0",
    database: "unhealthy",
    redis: "unhealthy",
    queue: "unhealthy",
    storage: "unhealthy"
  };

  try {
    // 1. Check Database
    await prisma.$queryRaw`SELECT 1`;
    health.database = "healthy";

    // 2. Check Redis
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        await redis.ping();
        health.redis = "healthy";
      }
    }

    // 3. Check Queue (BullMQ uses Redis, so if Redis is healthy, assume queue is ready for connections)
    // You could also check specific Queue instances if needed
    if (health.redis === "healthy") {
      health.queue = "healthy";
    }

    // 4. Check Storage
    try {
      const storage = StorageService.getClient();
      if (storage) {
        // Just checking if the client initialized. A full ListObjects might be too slow.
        health.storage = "healthy";
      }
    } catch (e) {
      health.storage = "unhealthy";
    }

    const isFullyHealthy = 
      health.database === "healthy" && 
      health.redis === "healthy" && 
      health.queue === "healthy" && 
      health.storage === "healthy";

    res.status(isFullyHealthy ? 200 : 503).json(health);

  } catch (error: any) {
    logger.error({ err: error.message }, "Health check failed");
    res.status(503).json(health);
  }
});

export default router;
