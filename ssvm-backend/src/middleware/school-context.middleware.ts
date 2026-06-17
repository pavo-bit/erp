import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// School Context Middleware (GAP 3)
// ═══════════════════════════════════════════
// Uses Node.js AsyncLocalStorage to propagate the current schoolId
// through the entire request lifecycle — including async callbacks,
// Prisma queries, and BullMQ job handlers.
//
// This is the single source of truth for the current tenant context.
// The Prisma client extension reads from this to SET LOCAL app.current_school_id.

interface SchoolContext {
  schoolId: string | null;
  userId: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  impersonatedBy?: string | null;
}

const schoolContextStorage = new AsyncLocalStorage<SchoolContext>();

/**
 * Express middleware: extract schoolId from authenticated user and store in AsyncLocalStorage.
 * Must run AFTER authentication middleware.
 */
export function schoolContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const user = (req as any).user;

  const context: SchoolContext = {
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
export function getSchoolContext(): SchoolContext | null {
  return schoolContextStorage.getStore() || null;
}

/**
 * Get the current schoolId.
 * Returns null for SUPER_ADMIN (bypass RLS) or when outside request context.
 */
export function getCurrentSchoolId(): string | null {
  const context = getSchoolContext();
  if (!context) return null;
  if (context.isSuperAdmin) return null; // Super admins bypass RLS
  return context.schoolId;
}

/**
 * Run a function within a specific school context.
 * Used by BullMQ workers to set the tenant context for background jobs.
 *
 * @param schoolId - The school ID to set as context
 * @param fn - The function to run within this context
 */
export function runWithSchoolContext<T>(
  schoolId: string | null,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const context: SchoolContext = {
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
export function runAsSuperAdmin<T>(fn: () => T | Promise<T>): T | Promise<T> {
  return runWithSchoolContext(null, fn);
}

export { schoolContextStorage };
