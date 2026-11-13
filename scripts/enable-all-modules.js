"use strict";
/**
 * scripts/enable-all-modules.ts
 * Activates all standard ERP modules for all schools in the platform database.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const module_registry_service_1 = require("../ssvm-backend/src/services/module-registry.service");
const ioredis_1 = __importDefault(require("ioredis"));
const databaseUrl = process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5433/ssvm_platform?schema=public";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const prisma = new client_1.PrismaClient({
    datasources: { db: { url: databaseUrl } },
});
async function main() {
    console.log("Connecting to platform database:", databaseUrl);
    const schools = await prisma.school.findMany({ select: { id: true, name: true, code: true } });
    console.log(`Found ${schools.length} school(s):`, schools.map((s) => `${s.name} (${s.code})`));
    console.log("\nEnsuring all modules exist in FeatureFlag table...");
    const featureMap = new Map();
    for (const mod of module_registry_service_1.CENTRAL_MODULE_REGISTRY) {
        const flag = await prisma.featureFlag.upsert({
            where: { code: mod.code },
            update: {
                name: mod.name,
                description: mod.description,
                category: mod.category,
                defaultEnabled: true,
                isActive: true,
            },
            create: {
                code: mod.code,
                name: mod.name,
                description: mod.description,
                category: mod.category,
                defaultEnabled: true,
                isActive: true,
            },
        });
        featureMap.set(mod.code, flag.id);
        console.log(`  [FLAG] ${mod.code.padEnd(22)} -> Active (defaultEnabled: true)`);
    }
    console.log("\nActivating all modules for each school...");
    for (const school of schools) {
        console.log(`\nProcessing School: ${school.name} [${school.id}]`);
        for (const mod of module_registry_service_1.CENTRAL_MODULE_REGISTRY) {
            const featureId = featureMap.get(mod.code);
            if (!featureId)
                continue;
            await prisma.schoolFeature.upsert({
                where: {
                    schoolId_featureId: { schoolId: school.id, featureId },
                },
                update: { isEnabled: true, enabledBy: "PLATFORM_ADMIN" },
                create: {
                    schoolId: school.id,
                    featureId,
                    isEnabled: true,
                    enabledBy: "PLATFORM_ADMIN",
                },
            });
            console.log(`  [ENABLED] ${mod.code.padEnd(22)} -> School ${school.code}`);
        }
    }
    // Clear redis cache
    try {
        const redis = new ioredis_1.default(redisUrl, {
            enableOfflineQueue: false,
            lazyConnect: true,
            retryStrategy: () => null,
            maxRetriesPerRequest: 1,
        });
        redis.on("error", () => { });
        await redis.connect().catch(() => { });
        const keys = await redis.keys("module:entitled:*").catch(() => []);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`\nCleared ${keys.length} cached module entitlement keys in Redis.`);
        }
        redis.disconnect();
    }
    catch (err) {
        console.log("Redis cache clear note:", err.message);
    }
    console.log("\nSUCCESS: All modules are now ACTIVE across ERP Admin and Super Admin!");
}
main()
    .catch((e) => {
    console.error("Error activating modules:", e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
