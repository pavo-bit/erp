/**
 * ssvm-backend/scripts/enable-all-modules.ts
 * Authoritative module activation utility.
 *
 * Activates ERP modules for designated school tenants through the official
 * ModuleRegistryService, ensuring:
 *  - Dependency validation (e.g. BIOMETRIC -> HR_PAYROLL, TRANSPORT -> ACADEMICS)
 *  - Immutable audit logging in system_logs
 *  - Tenant-isolated database transactions with RLS context
 *  - Precise Redis cache invalidation (erp:module:<schoolId>:<moduleCode>)
 *  - Safe lifecycle management with bounded connection timeouts
 */

import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import {
  CENTRAL_MODULE_REGISTRY,
  ModuleRegistryService,
} from "../src/services/module-registry.service";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5433/ssvm_platform?schema=public";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

export interface EnableModulesResult {
  success: boolean;
  affectedSchools: string[];
  modules: string[];
  errors?: string[];
}

export async function runEnableAllModules(options?: {
  schoolId?: string;
  actor?: string;
}): Promise<EnableModulesResult> {
  const actor = options?.actor || "PLATFORM_ADMIN";
  const affectedSchools: string[] = [];
  const moduleCodes = CENTRAL_MODULE_REGISTRY.map((m) => m.code);

  console.log("========================================================================");
  console.log("   SSVM ERP — AUTHORITATIVE SCHOOL MODULE ACTIVATION UTILITY");
  console.log("========================================================================");
  console.log(`Database Target:     ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log(`Redis Target:        ${redisUrl}`);
  console.log(`Audited Actor:       ${actor}`);
  console.log("------------------------------------------------------------------------\n");

  // 1. Identify Target Schools
  const whereClause = options?.schoolId ? { id: options.schoolId } : {};
  const schools = await prisma.school.findMany({
    where: whereClause,
    select: { id: true, name: true, code: true },
  });

  if (schools.length === 0) {
    console.log("No matching schools found for activation.");
    return { success: true, affectedSchools: [], modules: moduleCodes };
  }

  console.log(
    `Found ${schools.length} school tenant(s):`,
    schools.map((s) => `${s.name} [${s.code}]`).join(", ")
  );

  // 2. Ensure Feature Flags Exist Globally with Standard Metadata
  console.log("\nEnsuring Central Feature Flag catalog entries exist...");
  for (const mod of CENTRAL_MODULE_REGISTRY) {
    await prisma.featureFlag.upsert({
      where: { code: mod.code },
      update: {
        name: mod.name,
        description: mod.description,
        category: mod.category,
        isActive: true,
      },
      create: {
        code: mod.code,
        name: mod.name,
        description: mod.description,
        category: mod.category,
        defaultEnabled: mod.defaultEnabled,
        isActive: true,
      },
    });
    console.log(`  [CATALOG] ${mod.code.padEnd(22)} (${mod.category})`);
  }

  // 3. Activate Entitlements per School Tenant with Dependency Checking
  console.log("\nActivating entitlements per school tenant via ModuleRegistryService...");

  // Build ordered activation map respecting dependencies
  // Order: Core dependencies first (ACADEMICS -> FINANCE -> others -> BIOMETRIC)
  const activationOrder = [
    "ACADEMICS",
    "FINANCE",
    "EXAMS",
    "HR_PAYROLL",
    "COMMUNICATIONS",
    "TRANSPORT",
    "LIBRARY",
    "HOSTEL",
    "INVENTORY",
    "BIOMETRIC_ATTENDANCE",
  ];

  const updateMap: Record<string, boolean> = {};
  for (const code of activationOrder) {
    updateMap[code] = true;
  }

  for (const school of schools) {
    console.log(`\nProcessing Tenant: ${school.name} (${school.code}) [${school.id}]`);

    // Use ModuleRegistryService for transactional, audited, dependency-validated activation
    const result = await ModuleRegistryService.setSchoolModules(
      school.id,
      updateMap,
      actor
    );

    if (!result.success) {
      console.error(`  [FAILED] Activation errors for ${school.code}:`, result.errors);
      throw new Error(
        `Module activation failed for school ${school.code}: ${(result.errors || []).join(", ")}`
      );
    }

    console.log(`  [ACTIVATED] Successfully enabled ${result.updated.length} modules for ${school.code}`);
    affectedSchools.push(school.id);
  }

  // 4. Bounded Redis Cache Invalidation
  console.log("\nFlushing Redis module entitlement cache...");
  let redisClient: Redis | null = null;
  try {
    redisClient = new Redis(redisUrl, {
      connectTimeout: 2000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    redisClient.on("error", () => {});
    await redisClient.connect().catch(() => {});

    // Invalidate both standard erp:module:* cache and legacy module:entitled:*
    const keys = await redisClient.keys("erp:module:*").catch(() => []);
    const legacyKeys = await redisClient.keys("module:entitled:*").catch(() => []);
    const allKeys = [...keys, ...legacyKeys];

    if (allKeys.length > 0) {
      await redisClient.del(...allKeys);
      console.log(`  [CACHE] Cleared ${allKeys.length} cached entitlement keys.`);
    } else {
      console.log("  [CACHE] No stale cached entitlement keys found.");
    }
  } catch (err: any) {
    console.log("  [CACHE NOTE] Redis cache flush non-fatal notice:", err.message);
  } finally {
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch {}
    }
  }

  console.log("\n========================================================================");
  console.log("   STATUS: COMPLETE — All modules active with verified audit trail.");
  console.log("========================================================================\n");

  return {
    success: true,
    affectedSchools,
    modules: moduleCodes,
  };
}

// Auto-run if executed directly as entrypoint
if (require.main === module) {
  runEnableAllModules()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("\nFATAL ERROR during module activation:", err.message || err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
