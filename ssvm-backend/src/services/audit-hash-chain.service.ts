import prisma from '../lib/prisma';
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import logger from "../lib/logger";


// ═══════════════════════════════════════════
// Audit Hash Chain Service (GAP 13)
// ═══════════════════════════════════════════
// Ensures audit log immutability through SHA-256 hash chaining.
// Each audit entry's hash includes the previous entry's hash,
// making tampering detectable through chain verification.

interface AuditEntry {
  userId?: string;
  schoolId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldState?: any;
  newState?: any;
  ipAddress?: string;
  metadata?: any;
}

export class AuditHashChainService {
  /**
   * Create an immutable audit log entry with hash chain linkage.
   */
  static async createEntry(entry: AuditEntry): Promise<string> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Get the last audit entry for this school (or global if no schoolId)
      const lastEntry = await tx.auditLog.findFirst({
        where: entry.schoolId ? { schoolId: entry.schoolId } : {},
        orderBy: { createdAt: "desc" },
        select: { id: true, hash: true },
      });

      const previousHash = lastEntry?.hash || "GENESIS";

      // Build the hash payload
      const hashPayload = JSON.stringify({
        previousHash,
        action: entry.action,
        entity: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId,
        schoolId: entry.schoolId,
        timestamp: new Date().toISOString(),
        details: entry.newState,
      });

      const currentHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

      // Create the audit entry
      const auditLog = await tx.auditLog.create({
        data: {
          action: entry.action,
          entity: entry.entityType,
          entityId: entry.entityId,
          userId: entry.userId || "SYSTEM",
          schoolId: entry.schoolId,
          details: entry.newState ? JSON.stringify(entry.newState) : null,
          ipAddress: entry.ipAddress,
          previousHash,
          hash: currentHash,
        },
      });

      return auditLog.id;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  /**
   * Verify the integrity of the audit hash chain for a school.
   * Returns the break point if tampering is detected.
   */
  static async verifyChain(schoolId?: string): Promise<{
    isValid: boolean;
    totalEntries: number;
    brokenAt?: string;
    brokenEntryId?: string;
  }> {
    const entries = await prisma.auditLog.findMany({
      where: schoolId ? { schoolId } : {},
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        schoolId: true,
        details: true,
        createdAt: true,
        previousHash: true,
        hash: true,
      },
    });

    let expectedPreviousHash = "GENESIS";

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Check previous hash linkage
      if (entry.previousHash !== expectedPreviousHash) {
        logger.error(
          { entryId: entry.id, index: i, expected: expectedPreviousHash, actual: entry.previousHash },
          "Audit hash chain BROKEN — previousHash mismatch"
        );
        return {
          isValid: false,
          totalEntries: entries.length,
          brokenAt: `Entry ${i + 1} of ${entries.length}`,
          brokenEntryId: entry.id,
        };
      }

      // Verify the hash itself
      const hashPayload = JSON.stringify({
        previousHash: entry.previousHash,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        userId: entry.userId,
        schoolId: entry.schoolId,
        timestamp: entry.createdAt.toISOString(),
        details: entry.details ? JSON.parse(entry.details as string) : null,
      });

      const computedHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

      if (computedHash !== entry.hash) {
        logger.error(
          { entryId: entry.id, index: i },
          "Audit hash chain BROKEN — hash tampered"
        );
        return {
          isValid: false,
          totalEntries: entries.length,
          brokenAt: `Entry ${i + 1} (hash tampered)`,
          brokenEntryId: entry.id,
        };
      }

      expectedPreviousHash = entry.hash!;
    }

    return { isValid: true, totalEntries: entries.length };
  }
}
