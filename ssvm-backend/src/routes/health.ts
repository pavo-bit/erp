import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import { StorageService } from "../services/StorageService";
import { HealthMonitorService } from "../services/health-monitor.service";
import logger from "../lib/logger";

const router = Router();

// Liveness probe (Kubernetes process health)
router.get("/liveness", (_req: Request, res: Response) => {
  const liveness = HealthMonitorService.getLiveness();
  res.status(200).json(liveness);
});

// Readiness probe (DB & Redis ready to accept traffic)
router.get("/readiness", async (_req: Request, res: Response) => {
  const readiness = await HealthMonitorService.getReadiness();
  res.status(readiness.ready ? 200 : 503).json(readiness);
});

// Deep dependency health probe for SHFI
router.get("/deep", async (_req: Request, res: Response) => {
  try {
    const deepHealth = await HealthMonitorService.getDeepHealth();
    res.status(deepHealth.overallStatus === "UNHEALTHY" ? 503 : 200).json(deepHealth);
  } catch (error: any) {
    logger.error({ err: error.message }, "Deep health probe failed");
    res.status(503).json({ status: "UNHEALTHY", error: error.message });
  }
});

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

router.get("/database-identity", async (_req: Request, res: Response, next) => {
  try {
    const [identity] = await prisma.$queryRaw<Array<{
      currentUser: string;
      databaseName: string;
      isSuperuser: boolean;
      bypassRls: boolean;
      policyCount: number;
    }>>`
      SELECT current_user AS "currentUser",
             current_database() AS "databaseName",
             role.rolsuper AS "isSuperuser",
             role.rolbypassrls AS "bypassRls",
             (SELECT count(*)::int FROM pg_policy) AS "policyCount"
      FROM pg_roles AS role
      WHERE role.rolname = current_user
    `;

    if (!identity) {
      res.status(500).json({ success: false, error: "Database role could not be resolved" });
      return;
    }

    res.status(200).json(identity);
  } catch (error) {
    next(error);
  }
});

export default router;
