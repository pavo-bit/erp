import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";
import {
  runWithTenantDatabaseTransaction,
  runWithTrustedDatabaseTransaction,
} from "../lib/prisma";

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
 * Starts a request-local context before route mounts. Router authentication
 * updates this context after it verifies the database-backed identity.
 */
export function schoolContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: { id: string; schoolId: string | null; role: string; impersonated?: boolean; originalUserId?: string } }).user;

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
 * Replace the provisional request context with the identity loaded by
 * authenticate(). This is called only after token, active-account and
 * token-school checks have succeeded.
 */
export function setAuthenticatedSchoolContext(user: {
  id: string;
  schoolId: string | null;
  role: string;
  impersonated?: boolean;
  originalUserId?: string;
}): void {
  const context = schoolContextStorage.getStore();
  const authenticatedContext: SchoolContext = {
    schoolId: user.schoolId,
    userId: user.id,
    role: user.role,
    isSuperAdmin: user.role === "SUPER_ADMIN",
    impersonatedBy: user.impersonated ? user.originalUserId : null,
  };

  if (context) {
    Object.assign(context, authenticatedContext);
  } else {
    schoolContextStorage.enterWith(authenticatedContext);
  }
}

/**
 * Starts the database transaction for an authenticated HTTP request and holds
 * it open until Express has completed or closed the response. Call only after
 * token and database-backed identity checks have succeeded.
 */
export async function runAuthenticatedTenantRequest(
  req: Request,
  res: Response,
  next: NextFunction,
  user: {
    id: string;
    schoolId: string | null;
    role: string;
    impersonated?: boolean;
    originalUserId?: string;
  },
): Promise<void> {
  setAuthenticatedSchoolContext(user);

  const executeRoute = (): Promise<void> => new Promise((resolve, reject) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      res.off("finish", finish);
      res.off("close", finish);
      resolve();
    };

    res.once("finish", finish);
    res.once("close", finish);
    try {
      next();
    } catch (error) {
      res.off("finish", finish);
      res.off("close", finish);
      reject(error);
    }
  });

  try {
    if (user.role === "SUPER_ADMIN") {
      const requestId = res.getHeader("X-Request-ID")?.toString();
      await runWithTrustedDatabaseTransaction({
        purpose: "super_admin",
        actorUserId: user.id,
        requestId,
        route: `${req.method} ${req.originalUrl}`,
        reason: `Authenticated super-admin request ${req.method} ${req.originalUrl}`,
      }, executeRoute);
    } else {
      if (!user.schoolId) {
        throw new Error("Authenticated tenant requests require a school assignment.");
      }
      await runWithTenantDatabaseTransaction(user.schoolId, executeRoute);
    }
  } catch (error) {
    if (res.headersSent || res.destroyed) {
      res.destroy(error instanceof Error ? error : new Error("Request transaction failed."));
      return;
    }
    next(error);
  }
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
