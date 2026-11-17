import { Router, Response, NextFunction } from "express";
import logger from "../lib/logger";
import { AuthRequest, authenticate } from "../middleware/auth";
import { runWithTenantDatabaseTransaction } from "../lib/prisma";

const router = Router();

/**
 * Guard: Enforce strict school-scoped ERP administration.
 * Super Admin platform tokens are strictly forbidden (403).
 * Requires tenant schoolId on the authenticated user.
 */
function requireSchoolAnalyticsAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }

  // Super Admin must never access school-scoped analytics directly
  if (req.user.role === "SUPER_ADMIN") {
    res.status(403).json({
      success: false,
      error: "Super Admin token cannot access school-scoped analytics API",
      code: "FORBIDDEN_PLATFORM_ROLE",
    });
    return;
  }

  const schoolId = req.user.schoolId;
  if (!schoolId) {
    res.status(403).json({
      success: false,
      error: "No school context associated with authenticated user",
      code: "MISSING_SCHOOL_CONTEXT",
    });
    return;
  }

  const allowedRoles = ["ERP_ADMIN", "ACCOUNTANT", "PRINCIPAL", "DIRECTOR"];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: "Forbidden — insufficient permissions for school analytics",
      code: "ROLE_NOT_AUTHORIZED",
    });
    return;
  }

  next();
}

/**
 * GET /api/v1/analytics/school/overview
 * Returns school KPIs: enrolment, attendance rate, fee collected vs due, and defaulters count.
 * Fully enclosed within runWithTenantDatabaseTransaction for PostgreSQL RLS isolation.
 */
router.get("/school/overview", authenticate, requireSchoolAnalyticsAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const schoolId = req.user!.schoolId!;

  try {
    const overview = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      // 1. Enrolment Metrics
      const totalStudents = await tx.student.count({
        where: { schoolId, deletedAt: null },
      });

      const activeStudents = await tx.student.count({
        where: { schoolId, isActive: true, deletedAt: null },
      });

      const inactiveStudents = totalStudents - activeStudents;

      const genderDistribution = {
        male: 0,
        female: 0,
        other: 0,
      };

      const genderGroups = await tx.student.groupBy({
        by: ["gender"],
        where: { schoolId, deletedAt: null },
        _count: { id: true },
      });

      for (const group of genderGroups) {
        const g = (group.gender || "other").toLowerCase();
        if (g === "male" || g === "m") {
          genderDistribution.male += group._count.id;
        } else if (g === "female" || g === "f") {
          genderDistribution.female += group._count.id;
        } else {
          genderDistribution.other += group._count.id;
        }
      }

      // 2. Attendance Rates
      const totalAttendanceRecords = await tx.attendance.count({
        where: { schoolId },
      });

      const presentAttendanceRecords = await tx.attendance.count({
        where: {
          schoolId,
          status: { in: ["PRESENT", "LATE"] },
        },
      });

      const overallAttendanceRate = totalAttendanceRecords > 0
        ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 10000) / 100
        : 0;

      // Today's attendance
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayTotal = await tx.attendance.count({
        where: { schoolId, date: { gte: todayStart, lte: todayEnd } },
      });

      const todayPresent = await tx.attendance.count({
        where: {
          schoolId,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ["PRESENT", "LATE"] },
        },
      });

      const todayAttendanceRate = todayTotal > 0
        ? Math.round((todayPresent / todayTotal) * 10000) / 100
        : overallAttendanceRate;

      // 3. Fee Invoices and Financial Figures
      const invoices = await tx.invoice.findMany({
        where: { schoolId, deletedAt: null },
        select: {
          amount: true,
          amountPaid: true,
          remainingAmount: true,
          status: true,
          dueDate: true,
          studentId: true,
        },
      });

      let totalBilled = 0;
      let totalCollected = 0;
      let totalDue = 0;
      const defaulterStudentIds = new Set<string>();
      const now = new Date();

      for (const inv of invoices) {
        const amt = Number(inv.amount || 0);
        const paid = Number(inv.amountPaid || 0);
        const rem = Number(inv.remainingAmount || 0);

        totalBilled += amt;
        totalCollected += paid;
        totalDue += rem;

        if (rem > 0 && (inv.status === "OVERDUE" || inv.dueDate < now)) {
          defaulterStudentIds.add(inv.studentId);
        }
      }

      return {
        enrolment: {
          total: totalStudents,
          active: activeStudents,
          inactive: inactiveStudents,
          gender: genderDistribution,
        },
        attendance: {
          overallRate: overallAttendanceRate,
          todayRate: todayAttendanceRate,
          totalRecords: totalAttendanceRecords,
          presentRecords: presentAttendanceRecords,
        },
        finances: {
          totalBilled: Math.round(totalBilled * 100) / 100,
          totalCollected: Math.round(totalCollected * 100) / 100,
          totalDue: Math.round(totalDue * 100) / 100,
          collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 10000) / 100 : 0,
        },
        defaulters: {
          count: defaulterStudentIds.size,
        },
      };
    });

    res.json({
      success: true,
      data: overview,
    });
  } catch (err: unknown) {
    logger.error({ err, schoolId }, "Failed to compute school analytics overview");
    res.status(500).json({ success: false, error: "Failed to generate school analytics overview" });
  }
});

/**
 * GET /api/v1/analytics/school/trends
 * Returns monthly progression over the last 6 months for:
 * enrolment, attendance rate, fee collected vs due, and defaulters.
 * Fully enclosed within runWithTenantDatabaseTransaction for PostgreSQL RLS isolation.
 */
router.get("/school/trends", authenticate, requireSchoolAnalyticsAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const schoolId = req.user!.schoolId!;

  try {
    const trends = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const now = new Date();
      const monthlyTrends = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthKey = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}`;

        // Enrolment up to end of this month
        const enrolment = await tx.student.count({
          where: {
            schoolId,
            deletedAt: null,
            createdAt: { lte: endOfMonth },
          },
        });

        // Attendance records within this month
        const monthTotalAttendance = await tx.attendance.count({
          where: {
            schoolId,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        const monthPresentAttendance = await tx.attendance.count({
          where: {
            schoolId,
            date: { gte: startOfMonth, lte: endOfMonth },
            status: { in: ["PRESENT", "LATE"] },
          },
        });

        const attendanceRate = monthTotalAttendance > 0
          ? Math.round((monthPresentAttendance / monthTotalAttendance) * 10000) / 100
          : 0;

        // Invoices created or due in this month
        const invoices = await tx.invoice.findMany({
          where: {
            schoolId,
            deletedAt: null,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          select: {
            amount: true,
            amountPaid: true,
            remainingAmount: true,
            status: true,
            dueDate: true,
            studentId: true,
          },
        });

        let feeBilled = 0;
        let feeCollected = 0;
        let feeDue = 0;
        const defaulterStudentIds = new Set<string>();

        for (const inv of invoices) {
          const amt = Number(inv.amount || 0);
          const paid = Number(inv.amountPaid || 0);
          const rem = Number(inv.remainingAmount || 0);

          feeBilled += amt;
          feeCollected += paid;
          feeDue += rem;

          if (rem > 0 && (inv.status === "OVERDUE" || inv.dueDate <= endOfMonth)) {
            defaulterStudentIds.add(inv.studentId);
          }
        }

        monthlyTrends.push({
          month: monthKey,
          enrolment,
          attendanceRate,
          feeBilled: Math.round(feeBilled * 100) / 100,
          feeCollected: Math.round(feeCollected * 100) / 100,
          feeDue: Math.round(feeDue * 100) / 100,
          defaulters: defaulterStudentIds.size,
        });
      }

      return monthlyTrends;
    });

    res.json({
      success: true,
      data: trends,
    });
  } catch (err: unknown) {
    logger.error({ err, schoolId }, "Failed to compute school analytics trends");
    res.status(500).json({ success: false, error: "Failed to generate school analytics trends" });
  }
});

export default router;
