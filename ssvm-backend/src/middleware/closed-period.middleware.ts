import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// Closed Period Rejection Middleware (GAP 11)
// ═══════════════════════════════════════════
// Rejects any POST/PUT/PATCH/DELETE on financial endpoints
// if the posting date falls within a CLOSED accounting period.
// This is the application-level guard; the DB-level guard is the
// PostgreSQL trigger in the migration.

/**
 * Middleware factory: reject state-changing requests to closed periods.
 * Looks for postingDate or date in the request body.
 */
export function rejectClosedPeriod() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only check state-changing methods
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    const schoolId = (req as any).user?.schoolId;
    if (!schoolId) {
      return next(); // No school context = super admin or unauthenticated
    }

    // Extract the posting date from the request
    const postingDate = req.body?.postingDate || req.body?.date || req.body?.transactionDate;

    if (!postingDate) {
      return next(); // No date in body — not a financial transaction
    }

    const date = new Date(postingDate);
    if (isNaN(date.getTime())) {
      return next(); // Invalid date — let the route handler validate
    }

    try {
      // Find the accounting period for this date
      const period = await prisma.accountingPeriod.findFirst({
        where: {
          schoolId,
          startDate: { lte: date },
          endDate: { gte: date },
        },
        select: { id: true, name: true, status: true },
      });

      if (period && period.status === "CLOSED") {
        logger.warn(
          { schoolId, periodName: period.name, postingDate, path: req.originalUrl },
          "Rejected transaction to closed period"
        );

        res.status(403).json({
          success: false,
          error: "PERIOD_CLOSED",
          message: `Cannot post to closed period: ${period.name}. Contact admin for reversing journal entries.`,
          periodId: period.id,
          periodName: period.name,
        });
        return;
      }
    } catch (err) {
      logger.error({ err, schoolId, postingDate }, "Error checking period status");
      // Fail open — don't block the request if period check fails
    }

    next();
  };
}
