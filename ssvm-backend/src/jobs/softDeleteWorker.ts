import { Worker, Job } from "bullmq";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

const env = getEnv();

// ═══════════════════════════════════════════
// Soft Delete Cleanup Worker (GAP 7)
// ═══════════════════════════════════════════
// Permanently deletes records that were soft-deleted more than 30 days ago.
// Runs daily. Uses batching to avoid locking tables for too long.
// Follows GDPR/DPDPA data minimization principles.

const RETENTION_DAYS = 30;
const BATCH_SIZE = 500;

export function startSoftDeleteCleanupWorker() {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not set — Soft Delete Cleanup Worker will not start");
    return;
  }

  const worker = new Worker(
    "maintenanceQueue",
    async (job: Job) => {
      if (job.name === "cleanupSoftDeletes") {
        logger.info("Starting soft delete cleanup job");
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        let totalDeleted = 0;
        const modelsWithSoftDelete = [
          "Student",
          "Teacher",
          "User",
          "Invoice",
          "PaymentTransaction",
          "Admission",
        ];

        for (const modelName of modelsWithSoftDelete) {
          const modelDelegate = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
          
          if (!modelDelegate) continue;

          let deletedInModel = 0;
          let hasMore = true;

          while (hasMore) {
            // Find records to delete (must use raw query or bypass soft-delete extension)
            // Since the Prisma extension hides deletedAt !== null by default on findMany, 
            // we use a raw query to fetch IDs to delete.
            
            const tableName = getTableName(modelName);
            if (!tableName) break;

            const recordsToDelete = await prisma.$queryRawUnsafe<{id: string}[]>(
              `SELECT id FROM "${tableName}" WHERE "deletedAt" <= $1 LIMIT $2`,
              cutoffDate,
              BATCH_SIZE
            );

            if (recordsToDelete.length === 0) {
              hasMore = false;
              break;
            }

            const ids = recordsToDelete.map(r => r.id);

            // Permanently delete them using raw query to bypass any extensions
            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
            await prisma.$executeRawUnsafe(
              `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`,
              ...ids
            );

            deletedInModel += ids.length;
            totalDeleted += ids.length;

            // Small delay to prevent DB overload during large cleanups
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          if (deletedInModel > 0) {
            logger.info({ model: modelName, deletedCount: deletedInModel }, "Soft-deleted records permanently removed");
          }
        }

        if (totalDeleted > 0) {
          // Log audit event for compliance
          await prisma.systemLog.create({
            data: {
              level: "INFO",
              module: "DATA_RETENTION",
              message: `Permanently deleted ${totalDeleted} records older than ${RETENTION_DAYS} days`,
              metadata: JSON.stringify({ totalDeleted, cutoffDate: cutoffDate.toISOString() }),
            }
          });
        }

        logger.info({ totalDeleted }, "Soft delete cleanup job completed");
      }
    },
    {
      connection: { url: env.REDIS_URL },
    }
  );

  return worker;
}

function getTableName(modelName: string): string | null {
  const map: Record<string, string> = {
    "Student": "students",
    "Teacher": "teachers",
    "User": "users",
    "Invoice": "invoices",
    "PaymentTransaction": "payment_transactions",
    "Admission": "admissions",
  };
  return map[modelName] || null;
}
