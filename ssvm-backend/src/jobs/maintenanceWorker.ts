import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import { getRedisClient, isRedisAvailable } from "../lib/redis";

const prisma = new PrismaClient();
const env = getEnv();

// ═══════════════════════════════════════════
// Maintenance Worker (GAP 1 — Idempotency Cleanup)
// ═══════════════════════════════════════════
// Handles scheduled cleanup of expired idempotency records
// from both the DB (IdempotencyRecord table) and Redis.

export function startMaintenanceWorker(): Worker | undefined {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — Maintenance worker will not start");
    return undefined;
  }

  const connection = { url: env.REDIS_URL };

  const worker = new Worker(
    "maintenanceQueue",
    async (job: Job) => {
      switch (job.name) {
        case "cleanupExpiredIdempotencyRecords":
          await cleanupExpiredIdempotencyRecords();
          break;

        default:
          logger.warn({ jobName: job.name }, "Unknown maintenance job type");
      }
    },
    {
      connection,
      concurrency: 1, // Maintenance jobs should run one at a time
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, "Maintenance job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, "Maintenance job failed");
  });

  logger.info("Maintenance worker started");
  return worker;
}

/**
 * Cleanup expired IdempotencyRecord entries from the database.
 *
 * Runs in batches to avoid locking large swaths of the table.
 * Also cleans up corresponding Redis keys if they exist.
 */
async function cleanupExpiredIdempotencyRecords(): Promise<void> {
  const now = new Date();
  const BATCH_SIZE = 500;
  let totalDeleted = 0;

  logger.info("Starting IdempotencyRecord cleanup");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Find expired records in batches
    const expiredRecords = await (prisma as any).idempotencyRecord.findMany({
      where: {
        expiresAt: { lt: now },
      },
      take: BATCH_SIZE,
      select: { id: true, key: true },
    });

    if (expiredRecords.length === 0) {
      break; // No more expired records
    }

    const idsToDelete = expiredRecords.map((r: any) => r.id);

    // Delete from DB
    const deleteResult = await (prisma as any).idempotencyRecord.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    totalDeleted += deleteResult.count;

    // Also clean up Redis keys (fire-and-forget)
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        const redisKeys = expiredRecords.map((r: any) => `idempotency:system:${r.key}`);
        try {
          await redis.del(...redisKeys);
        } catch (err) {
          logger.warn({ err }, "Failed to clean Redis idempotency keys");
        }
      }
    }

    // If we got fewer than BATCH_SIZE, we're done
    if (expiredRecords.length < BATCH_SIZE) {
      break;
    }
  }

  logger.info({ totalDeleted }, "IdempotencyRecord cleanup completed");
}
