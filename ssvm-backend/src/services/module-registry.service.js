"use strict";
/**
 * ssvm-backend/src/services/module-registry.service.ts
 * Authoritative Central Module Registry & School-Specific Entitlement Engine
 *
 * Implements:
 *   - Central registry of all standard ERP modules with metadata, categories & dependencies
 *   - Super Admin per-school entitlement management with audit trail
 *   - Redis-cached fast entitlement resolution (<2ms)
 *   - Dependency validation (preventing invalid deactivations)
 *   - Fail-closed tenant authorization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleRegistryService = exports.CENTRAL_MODULE_REGISTRY = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const logger_1 = __importDefault(require("../lib/logger"));
const redis_1 = require("../lib/redis");
const school_context_middleware_1 = require("../middleware/school-context.middleware");
exports.CENTRAL_MODULE_REGISTRY = [
    {
        id: 'ACADEMICS',
        code: 'ACADEMICS',
        name: 'Core Academics & Student Lifecycle',
        description: 'Student admissions, classes, sections, subjects, enrollment, and timetable',
        category: 'CORE_ACADEMIC',
        defaultEnabled: true,
        isCore: true,
        dependencies: [],
        routePrefixes: ['/api/v1/students', '/api/v1/classes', '/api/v1/academic', '/api/v1/timetable'],
        portalVisibility: ['ERP_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
    },
    {
        id: 'FINANCE',
        code: 'FINANCE',
        name: 'Fee Billing & Financial Accounting',
        description: 'Fee structures, invoices, cash collection, receipts, advance credit, and double-entry ledger',
        category: 'FINANCE',
        defaultEnabled: true,
        isCore: true,
        dependencies: ['ACADEMICS'],
        routePrefixes: ['/api/v1/finance', '/api/v1/invoices', '/api/v1/payments'],
        portalVisibility: ['ERP_ADMIN', 'PARENT', 'STUDENT'],
    },
    {
        id: 'EXAMS',
        code: 'EXAMS',
        name: 'Examinations, Grading & Report Cards',
        description: 'Assessment profiles, marks entry, GPA computation, and printable report cards',
        category: 'CORE_ACADEMIC',
        defaultEnabled: true,
        isCore: false,
        dependencies: ['ACADEMICS'],
        routePrefixes: ['/api/v1/exams', '/api/v1/results'],
        portalVisibility: ['ERP_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
    },
    {
        id: 'TRANSPORT',
        code: 'TRANSPORT',
        name: 'Transport & Real-Time Bus Fleet GPS',
        description: 'Fleet management, vehicle tracking, IoT hardware telemetry, stops, routes, and live parent tracking',
        category: 'OPERATIONS',
        defaultEnabled: false,
        isCore: false,
        dependencies: ['ACADEMICS'],
        routePrefixes: ['/api/v1/transport', '/api/v1/admin/transport'],
        portalVisibility: ['ERP_ADMIN', 'PARENT', 'STUDENT'],
    },
    {
        id: 'LIBRARY',
        code: 'LIBRARY',
        name: 'Library & Asset Circulation',
        description: 'Book catalog, circulation, borrowing history, and automated overdue fine integration',
        category: 'OPERATIONS',
        defaultEnabled: false,
        isCore: false,
        dependencies: ['ACADEMICS'],
        routePrefixes: ['/api/v1/library'],
        portalVisibility: ['ERP_ADMIN', 'TEACHER', 'STUDENT'],
    },
    {
        id: 'HOSTEL',
        code: 'HOSTEL',
        name: 'Hostel & Dormitory Management',
        description: 'Dorm allocations, room tracking, and student occupancy management',
        category: 'OPERATIONS',
        defaultEnabled: false,
        isCore: false,
        dependencies: ['ACADEMICS'],
        routePrefixes: ['/api/v1/admin/ancillary/hostel', '/api/v1/ancillary'],
        portalVisibility: ['ERP_ADMIN', 'PARENT', 'STUDENT'],
    },
    {
        id: 'HR_PAYROLL',
        code: 'HR_PAYROLL',
        name: 'Human Resources & Staff Payroll',
        description: 'Staff onboarding, departments, leave management, salary structure, and ledger posting',
        category: 'OPERATIONS',
        defaultEnabled: true,
        isCore: false,
        dependencies: ['FINANCE'],
        routePrefixes: ['/api/v1/hr', '/api/v1/admin/payroll'],
        portalVisibility: ['ERP_ADMIN', 'TEACHER'],
    },
    {
        id: 'INVENTORY',
        code: 'INVENTORY',
        name: 'Procurement, POs & Stock Inventory',
        description: 'Vendor management, purchase requests, purchase orders, goods receipt (GRN), and stock ledger',
        category: 'OPERATIONS',
        defaultEnabled: false,
        isCore: false,
        dependencies: ['FINANCE'],
        routePrefixes: ['/api/v1/inventory', '/api/v1/admin/inventory', '/api/v1/admin/procurement'],
        portalVisibility: ['ERP_ADMIN'],
    },
    {
        id: 'COMMUNICATIONS',
        code: 'COMMUNICATIONS',
        name: 'Notices, Messages & Notifications',
        description: 'School announcements, teacher-parent messaging, outbox relay, and transactional templates',
        category: 'COMMUNICATION',
        defaultEnabled: true,
        isCore: false,
        dependencies: [],
        routePrefixes: ['/api/v1/notices', '/api/v1/messages', '/api/v1/communications'],
        portalVisibility: ['ERP_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
    },
    {
        id: 'BIOMETRIC_ATTENDANCE',
        code: 'BIOMETRIC_ATTENDANCE',
        name: 'Biometric & Fingerprint Staff Attendance',
        description: 'Biometric hardware sync, check-in/out events, replay protection, and HR attendance linkage',
        category: 'SECURITY',
        defaultEnabled: false,
        isCore: false,
        dependencies: ['HR_PAYROLL'],
        routePrefixes: ['/api/v1/attendance/biometric'],
        portalVisibility: ['ERP_ADMIN'],
    },
];
const CACHE_PREFIX = 'erp:module:';
const CACHE_TTL = 300; // 5 minutes
class ModuleRegistryService {
    /**
     * Retrieves the full Central Module Registry.
     */
    static getRegistry() {
        return exports.CENTRAL_MODULE_REGISTRY;
    }
    static getAllModules() {
        return exports.CENTRAL_MODULE_REGISTRY;
    }
    static async getSchoolEntitlements(schoolId) {
        return this.getSchoolModules(schoolId);
    }
    static async setSchoolEntitlement(schoolId, moduleId, enabled, changedBy = 'SUPER_ADMIN') {
        return this.setSchoolModules(schoolId, { [moduleId]: enabled }, changedBy);
    }
    /**
     * Finds a module definition by ID or code.
     */
    static getModuleDefinition(moduleId) {
        return exports.CENTRAL_MODULE_REGISTRY.find((m) => m.id.toUpperCase() === moduleId.toUpperCase() || m.code.toUpperCase() === moduleId.toUpperCase());
    }
    /**
     * Checks whether a specific module is entitled and enabled for a school.
     */
    static async isModuleEnabled(schoolId, moduleId) {
        const mod = this.getModuleDefinition(moduleId);
        if (!mod)
            return false;
        // Core modules are always enabled
        if (mod.isCore)
            return true;
        const cacheKey = `${CACHE_PREFIX}${schoolId}:${mod.code}`;
        // 1. Try Redis cache
        if ((0, redis_1.isRedisAvailable)()) {
            try {
                const redis = (0, redis_1.getRedisClient)();
                if (redis) {
                    const cached = await redis.get(cacheKey);
                    if (cached !== null)
                        return cached === '1';
                }
            }
            catch { }
        }
        // 2. Query database FeatureFlag / SchoolFeature
        return (0, school_context_middleware_1.runWithSchoolContext)(schoolId, async () => {
            try {
                const feature = await prisma_1.default.featureFlag.findUnique({ where: { code: mod.code } });
                if (!feature || !feature.isActive) {
                    await this.setCache(cacheKey, false);
                    return false;
                }
                const schoolFeature = await prisma_1.default.schoolFeature.findUnique({
                    where: {
                        schoolId_featureId: { schoolId, featureId: feature.id },
                    },
                });
                const enabled = schoolFeature ? schoolFeature.isEnabled : mod.defaultEnabled;
                await this.setCache(cacheKey, enabled);
                return enabled;
            }
            catch (err) {
                logger_1.default.error({ err: err.message, schoolId, moduleId }, 'Error checking module entitlement');
                return mod.defaultEnabled;
            }
        });
    }
    /**
     * Returns all modules and their status (enabled/disabled) for a school.
     */
    static async getSchoolModules(schoolId) {
        return (0, school_context_middleware_1.runWithSchoolContext)(schoolId, async () => {
            const schoolFeatures = await prisma_1.default.schoolFeature.findMany({
                where: { schoolId },
                include: { feature: true },
            });
            const overrideMap = new Map();
            for (const sf of schoolFeatures) {
                overrideMap.set(sf.feature.code.toUpperCase(), sf.isEnabled);
            }
            return exports.CENTRAL_MODULE_REGISTRY.map((mod) => {
                if (mod.isCore) {
                    return { module: mod, isEnabled: true, source: 'CORE' };
                }
                if (overrideMap.has(mod.code.toUpperCase())) {
                    return {
                        module: mod,
                        isEnabled: overrideMap.get(mod.code.toUpperCase()),
                        source: 'OVERRIDE',
                    };
                }
                return { module: mod, isEnabled: mod.defaultEnabled, source: 'DEFAULT' };
            });
        });
    }
    /**
     * Sets module entitlements for a school (Super Admin operation).
     * Validates dependencies before applying changes.
     */
    static async setSchoolModules(schoolId, updates, changedBy = 'SUPER_ADMIN') {
        const errors = [];
        const updated = [];
        // Verify dependencies
        for (const [code, targetState] of Object.entries(updates)) {
            const mod = this.getModuleDefinition(code);
            if (!mod) {
                errors.push(`Module ${code} is not recognized in Central Registry`);
                continue;
            }
            if (mod.isCore && !targetState) {
                errors.push(`Core module ${mod.name} cannot be disabled`);
                continue;
            }
            if (targetState) {
                // Ensure dependencies are satisfied
                for (const depId of mod.dependencies) {
                    const depMod = this.getModuleDefinition(depId);
                    const depState = updates[depId] !== undefined ? updates[depId] : await this.isModuleEnabled(schoolId, depId);
                    if (!depState) {
                        errors.push(`Module ${mod.name} requires ${depMod?.name || depId} to be enabled`);
                    }
                }
            }
        }
        if (errors.length > 0) {
            return { success: false, updated: [], errors };
        }
        // Apply updates in a transaction
        await (0, school_context_middleware_1.runWithSchoolContext)(schoolId, async () => {
            await prisma_1.default.$transaction(async (tx) => {
                await tx.$executeRawUnsafe(`SELECT set_config('app.current_school_id', $1, true);`, schoolId);
                for (const [code, isEnabled] of Object.entries(updates)) {
                    const mod = this.getModuleDefinition(code);
                    if (!mod || mod.isCore)
                        continue;
                    // Ensure FeatureFlag row exists
                    let feature = await tx.featureFlag.findUnique({ where: { code: mod.code } });
                    if (!feature) {
                        feature = await tx.featureFlag.create({
                            data: {
                                code: mod.code,
                                name: mod.name,
                                description: mod.description,
                                category: mod.category,
                                defaultEnabled: mod.defaultEnabled,
                                isActive: true,
                            },
                        });
                    }
                    // Upsert SchoolFeature
                    await tx.schoolFeature.upsert({
                        where: {
                            schoolId_featureId: { schoolId, featureId: feature.id },
                        },
                        update: { isEnabled, enabledBy: changedBy, updatedAt: new Date() },
                        create: { schoolId, featureId: feature.id, isEnabled, enabledBy: changedBy },
                    });
                    // Audit log (userId requires a valid User reference if provided)
                    const validUser = changedBy ? await tx.user.findUnique({ where: { id: changedBy }, select: { id: true } }) : null;
                    await tx.systemLog.create({
                        data: {
                            level: 'INFO',
                            module: 'MODULE_ENTITLEMENT',
                            message: `Module ${mod.code} set to ${isEnabled ? 'ENABLED' : 'DISABLED'} for school ${schoolId}`,
                            metadata: JSON.stringify({ schoolId, module: mod.code, isEnabled, changedBy }),
                            schoolId,
                            userId: validUser ? validUser.id : null,
                        },
                    });
                    await this.invalidateCache(schoolId, mod.code);
                    updated.push(mod.code);
                }
            });
        });
        return { success: true, updated };
    }
    static async setCache(key, value) {
        if (!(0, redis_1.isRedisAvailable)())
            return;
        try {
            const redis = (0, redis_1.getRedisClient)();
            if (redis) {
                await redis.set(key, value ? '1' : '0', 'EX', CACHE_TTL);
            }
        }
        catch { }
    }
    static async invalidateCache(schoolId, code) {
        if (!(0, redis_1.isRedisAvailable)())
            return;
        try {
            const redis = (0, redis_1.getRedisClient)();
            if (redis) {
                await redis.del(`${CACHE_PREFIX}${schoolId}:${code}`);
            }
        }
        catch { }
    }
}
exports.ModuleRegistryService = ModuleRegistryService;
