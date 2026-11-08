"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolContextStorage = void 0;
exports.schoolContextMiddleware = schoolContextMiddleware;
exports.getSchoolContext = getSchoolContext;
exports.getCurrentSchoolId = getCurrentSchoolId;
exports.setAuthenticatedSchoolContext = setAuthenticatedSchoolContext;
exports.runWithSchoolContext = runWithSchoolContext;
exports.runAsSuperAdmin = runAsSuperAdmin;
const async_hooks_1 = require("async_hooks");
const schoolContextStorage = new async_hooks_1.AsyncLocalStorage();
exports.schoolContextStorage = schoolContextStorage;
/**
 * Starts a request-local context before route mounts. Router authentication
 * updates this context after it verifies the database-backed identity.
 */
function schoolContextMiddleware(req, _res, next) {
    const user = req.user;
    const context = {
        schoolId: user?.schoolId || null,
        userId: user?.id || null,
        role: user?.role || null,
        isSuperAdmin: user?.role === "SUPER_ADMIN",
        impersonatedBy: user?.impersonated ? user?.originalUserId : null,
    };
    schoolContextStorage.run(context, () => {
        next();
    });
}
/**
 * Get the current school context from AsyncLocalStorage.
 * Returns null if called outside a request context (e.g., during startup).
 */
function getSchoolContext() {
    return schoolContextStorage.getStore() || null;
}
/**
 * Get the current schoolId.
 * Returns null for SUPER_ADMIN (bypass RLS) or when outside request context.
 */
function getCurrentSchoolId() {
    const context = getSchoolContext();
    if (!context)
        return null;
    return context.schoolId;
}
/**
 * Replace the provisional request context with the identity loaded by
 * authenticate(). This is called only after token, active-account and
 * token-school checks have succeeded.
 */
function setAuthenticatedSchoolContext(user) {
    const context = schoolContextStorage.getStore();
    const authenticatedContext = {
        schoolId: user.schoolId,
        userId: user.id,
        role: user.role,
        isSuperAdmin: user.role === "SUPER_ADMIN",
        impersonatedBy: user.impersonated ? user.originalUserId : null,
    };
    if (context) {
        Object.assign(context, authenticatedContext);
    }
    else {
        schoolContextStorage.enterWith(authenticatedContext);
    }
}
/**
 * Run a function within a specific school context.
 * Used by BullMQ workers to set the tenant context for background jobs.
 *
 * @param schoolId - The school ID to set as context
 * @param fn - The function to run within this context
 */
function runWithSchoolContext(schoolId, fn) {
    const context = {
        schoolId,
        userId: "SYSTEM",
        role: schoolId ? "SYSTEM" : "SUPER_ADMIN",
        isSuperAdmin: !schoolId,
    };
    return schoolContextStorage.run(context, fn);
}
/**
 * Run a function as SUPER_ADMIN (bypasses RLS).
 * Used for cross-tenant operations like reporting, migrations, backups.
 */
function runAsSuperAdmin(fn) {
    return runWithSchoolContext(null, fn);
}
