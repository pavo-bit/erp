import { Router, Response } from "express";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth";
import { runWithTenantDatabaseTransaction } from "../lib/prisma";
import { ModuleRegistryService } from "../services/module-registry.service";
import { KPI_REGISTRY, KpiRegistry, KpiResult } from "../kpi/registry";
import logger from "../lib/logger";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// SCHOOL KPIS (K3)
// ═══════════════════════════════════════════════════════════════════════════════

const SCHOOL_KPI_IDS = [
  "kpi_school_admissions",
  "kpi_school_active_students",
  "kpi_school_student_attendance_rate",
  "kpi_school_staff_attendance_rate",
  "kpi_school_exam_pass_rate",
  "kpi_school_fee_collection_efficiency",
  "kpi_school_fee_dues",
  "kpi_school_fee_defaulters",
  "kpi_school_refund_rate",
  "kpi_school_monthly_payroll_cost",
  "kpi_school_hostel_occupancy",
  "kpi_school_library_circulation",
  "kpi_school_inventory_low_stock",
  "kpi_school_notification_delivery_rate",
];

/**
 * GET /api/v1/kpi/school
 * Compute school-scoped operational, academic, and financial KPIs inside a tenant transaction (RLS).
 * Guarded for ERP_ADMIN, SUPER_ADMIN, and school leadership roles.
 */
router.get(
  "/school",
  authenticate,
  requireRole("ERP_ADMIN", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: "Not authenticated" });
        return;
      }

      // Resolve school context (Super Admin in support session can specify query.schoolId)
      const schoolId = user.schoolId || (user.role === "SUPER_ADMIN" ? (req.query.schoolId as string) : undefined);
      if (!schoolId) {
        res.status(400).json({ success: false, error: "Tenant school context is required" });
        return;
      }

      // 1. Fetch Entitlements for this school to govern optional module KPIs
      const entitlements = await ModuleRegistryService.getSchoolModules(schoolId);
      const activeModules = entitlements.filter((m) => m.isEnabled).map((m) => m.module.code);

      // 2. Compute within Tenant Database Transaction (PostgreSQL RLS fail-closed enforcement)
      const kpiResults: KpiResult[] = await runWithTenantDatabaseTransaction(
        schoolId,
        async (tx) => {
          const now = new Date();
          const currentYear = now.getFullYear();
          const periodStart = new Date(currentYear, 0, 1);
          const periodEnd = new Date(currentYear, 11, 31, 23, 59, 59);

          const computeCtx = {
            prisma: tx,
            schoolId,
            userId: user.id,
            role: user.role,
            targetDate: now,
            periodStart,
            periodEnd,
            activeModules,
          };

          const results: KpiResult[] = [];
          for (const kpiId of SCHOOL_KPI_IDS) {
            const def = KpiRegistry.getById(kpiId);
            if (def) {
              const res = await KpiRegistry.evaluateKpi(def, computeCtx);
              results.push(res);
            }
          }
          return results;
        }
      );

      res.json({
        success: true,
        schoolId,
        asOf: new Date().toISOString(),
        data: kpiResults,
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to compute school KPIs");
      res.status(500).json({ success: false, error: "Failed to compute school KPIs" });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE-SCOPED KPIS (K4: Teacher, Student, Parent)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/kpi/teacher
 * Scoped strictly to authenticated teacher's assigned classes and subjects.
 */
router.get(
  "/teacher",
  authenticate,
  requireRole("TEACHER"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user || !user.schoolId) {
        res.status(401).json({ success: false, error: "Teacher school context missing" });
        return;
      }

      const teacherKpiIds = [
        "kpi_teacher_classes_count",
        "kpi_teacher_class_attendance_rate",
      ];

      const kpiResults: KpiResult[] = await runWithTenantDatabaseTransaction(
        user.schoolId,
        async (tx) => {
          const now = new Date();
          const computeCtx = {
            prisma: tx,
            schoolId: user.schoolId!,
            userId: user.id,
            role: user.role,
            targetDate: now,
          };

          const results: KpiResult[] = [];
          for (const id of teacherKpiIds) {
            const def = KpiRegistry.getById(id);
            if (def) {
              const r = await KpiRegistry.evaluateKpi(def, computeCtx);
              results.push(r);
            }
          }
          return results;
        }
      );

      res.json({
        success: true,
        role: "TEACHER",
        userId: user.id,
        asOf: new Date().toISOString(),
        data: kpiResults,
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to compute teacher KPIs");
      res.status(500).json({ success: false, error: "Failed to compute teacher KPIs" });
    }
  }
);

/**
 * GET /api/v1/kpi/student
 * Scoped strictly to authenticated student's personal record.
 */
router.get(
  "/student",
  authenticate,
  requireRole("STUDENT"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user || !user.schoolId) {
        res.status(401).json({ success: false, error: "Student school context missing" });
        return;
      }

      const entitlements = await ModuleRegistryService.getSchoolModules(user.schoolId);
      const activeModules = entitlements.filter((m) => m.isEnabled).map((m) => m.module.code);

      const studentKpiIds = [
        "kpi_student_own_attendance_rate",
        "kpi_student_own_fee_due",
        "kpi_student_own_average_marks",
        "kpi_student_own_books_borrowed",
      ];

      const kpiResults: KpiResult[] = await runWithTenantDatabaseTransaction(
        user.schoolId,
        async (tx) => {
          const now = new Date();
          const computeCtx = {
            prisma: tx,
            schoolId: user.schoolId!,
            userId: user.id,
            role: user.role,
            targetDate: now,
            activeModules,
          };

          const results: KpiResult[] = [];
          for (const id of studentKpiIds) {
            const def = KpiRegistry.getById(id);
            if (def) {
              const r = await KpiRegistry.evaluateKpi(def, computeCtx);
              results.push(r);
            }
          }
          return results;
        }
      );

      res.json({
        success: true,
        role: "STUDENT",
        userId: user.id,
        asOf: new Date().toISOString(),
        data: kpiResults,
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to compute student KPIs");
      res.status(500).json({ success: false, error: "Failed to compute student KPIs" });
    }
  }
);

/**
 * GET /api/v1/kpi/parent
 * Scoped strictly to authenticated guardian's enrolled wards.
 */
router.get(
  "/parent",
  authenticate,
  requireRole("PARENT"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user || !user.schoolId) {
        res.status(401).json({ success: false, error: "Parent school context missing" });
        return;
      }

      const parentKpiIds = [
        "kpi_parent_children_count",
        "kpi_parent_total_fee_due",
        "kpi_parent_average_children_attendance",
      ];

      const kpiResults: KpiResult[] = await runWithTenantDatabaseTransaction(
        user.schoolId,
        async (tx) => {
          const now = new Date();
          const computeCtx = {
            prisma: tx,
            schoolId: user.schoolId!,
            userId: user.id,
            role: user.role,
            targetDate: now,
          };

          const results: KpiResult[] = [];
          for (const id of parentKpiIds) {
            const def = KpiRegistry.getById(id);
            if (def) {
              const r = await KpiRegistry.evaluateKpi(def, computeCtx);
              results.push(r);
            }
          }
          return results;
        }
      );

      res.json({
        success: true,
        role: "PARENT",
        userId: user.id,
        asOf: new Date().toISOString(),
        data: kpiResults,
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to compute parent KPIs");
      res.status(500).json({ success: false, error: "Failed to compute parent KPIs" });
    }
  }
);

export default router;
