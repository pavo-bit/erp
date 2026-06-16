import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma";
import { getRedisClient, isRedisAvailable } from "../../lib/redis";
import { authenticate, requireRole } from "../../middleware/auth";

const router = Router();

// /api/v1/support/diagnostics - Generates the Support Diagnostics Bundle
router.get("/diagnostics", authenticate, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const diagnostics: any = {
    generatedAt: new Date().toISOString(),
    system: {
      version: process.env.npm_package_version || "3.0.0",
      nodeEnv: process.env.NODE_ENV,
      uptimeSeconds: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
    database: {
      status: "unhealthy",
      connected: false
    },
    redis: {
      status: "unhealthy",
      connected: false
    },
    tenants: {
      totalSchools: 0,
      activeSchools: 0
    }
  };

  try {
    // 1. Database Diagnostics
    const dbTest = await prisma.$queryRaw`SELECT 1 as result`;
    if (dbTest) {
      diagnostics.database.status = "healthy";
      diagnostics.database.connected = true;

      // 2. Tenant Diagnostics
      const schoolStats = await prisma.school.groupBy({
        by: ['isActive'],
        _count: { id: true }
      });
      
      diagnostics.tenants.totalSchools = schoolStats.reduce((acc, curr) => acc + curr._count.id, 0);
      diagnostics.tenants.activeSchools = schoolStats.find((s: any) => s.isActive)?._count.id || 0;
    }

    // 3. Redis Diagnostics
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        const ping = await redis.ping();
        if (ping === "PONG") {
          diagnostics.redis.status = "healthy";
          diagnostics.redis.connected = true;
          
          // Get basic Redis info
          const info = await redis.info('memory');
          diagnostics.redis.memory = info.split('\r\n').find((line: string) => line.startsWith('used_memory_human:'))?.split(':')[1] || "unknown";
        }
      }
    }

    // Return as downloadable JSON file
    res.setHeader("Content-Disposition", "attachment; filename=ssvm-support-diagnostics.json");
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(diagnostics, null, 2));

  } catch (error: any) {
    diagnostics.error = error.message;
    res.status(500).json(diagnostics);
  }
});

export default router;
