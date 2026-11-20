import { Router, Request, Response } from "express";
import http from "http";
import net from "net";
import { AuthRequest, authenticate, requireRole, requireAudience } from "../middleware/auth";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { ModuleRegistryService } from "../services/module-registry.service";
import { SupportSessionService } from "../services/support-session.service";
import { verifyUserMfaToken } from "../lib/authPrisma";
import { register } from "../middleware/metrics";
import { KpiRegistry, KpiResult } from "../kpi/registry";
import { createProxyMiddleware } from "http-proxy-middleware";

const router = Router();

// ═══════════════════════════════════════════
// Platform Grafana Reverse Proxy & Access Gate (Block M4 / Close-Out)
// ═══════════════════════════════════════════

const grafanaTarget =
  process.env.GRAFANA_URL ||
  (process.env.NODE_ENV === "production" ? "http://ssvm-grafana:3000" : "http://127.0.0.1:3004");

const grafanaProxy = createProxyMiddleware({
  target: grafanaTarget,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^(\/api\/v1\/platform)?\/grafana/, "") || "/",
  on: {
    proxyReq: (proxyReq: http.ClientRequest, req: Request) => {
      const authReq = req as AuthRequest;
      // Strip client authorization and cookies before forwarding
      proxyReq.removeHeader("authorization");
      proxyReq.removeHeader("cookie");

      // Inject Grafana auth.proxy headers
      const email = authReq.user?.email || "superadmin@ssvm.internal";
      const name = authReq.user?.name || "Super Admin";
      proxyReq.setHeader("X-WEBAUTH-USER", email);
      proxyReq.setHeader("X-WEBAUTH-NAME", name);
      proxyReq.setHeader("X-WEBAUTH-ROLE", "Admin");
    },
    error: (err: Error, _req: Request, res: Response | http.ServerResponse | net.Socket) => {
      logger.error({ err }, "Grafana reverse proxy connection failed");
      const expressRes = res as Response;
      if (!expressRes.headersSent && typeof expressRes.status === "function") {
        expressRes.status(502).json({
          success: false,
          error: "Grafana monitoring service is currently unavailable",
          code: "GRAFANA_UNAVAILABLE",
        });
      }
    },
  },
});

function requireMfaSession(req: AuthRequest, res: Response, next: () => void): void {
  const isMfaVerified = req.user?.mfaVerified !== false;
  if (!isMfaVerified) {
    res.status(403).json({
      success: false,
      error: "MFA verification required for platform Grafana access",
      code: "MFA_REQUIRED",
    });
    return;
  }
  next();
}

router.all(
  "/grafana{/*path}",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  requireMfaSession,
  grafanaProxy
);

// ═══════════════════════════════════════════
// Platform Health & Usage Endpoints (Block M7)
// Strictly aggregate metrics — NO student rows
// ═══════════════════════════════════════════

/**
 * GET /api/v1/platform/schools/health-usage
 * Returns per-school health, module entitlements, user activity, and usage aggregates.
 */
router.get(
  "/schools/health-usage",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schools = await prisma.school.findMany({
        where: { deletedAt: null },
        include: {
          subscription: {
            include: { planConfig: true },
          },
        },
        orderBy: { name: "asc" },
      });

      const healthList = await Promise.all(
        schools.map(async (school) => {
          // Aggregate queries without selecting any student data
          const [activeUsers, lastLoginUser, schoolModules] = await Promise.all([
            prisma.user.count({
              where: { schoolId: school.id, isActive: true, deletedAt: null },
            }),
            prisma.user.findFirst({
              where: { schoolId: school.id, deletedAt: null, lastLogin: { not: null } },
              orderBy: { lastLogin: "desc" },
              select: { lastLogin: true },
            }),
            ModuleRegistryService.getSchoolModules(school.id).catch(() => []),
          ]);

          const enabledModules = schoolModules
            .filter((m) => m.isEnabled)
            .map((m) => m.module.name);

          const planName = (school as { subscription?: { planConfig?: { name?: string } } }).subscription?.planConfig?.name || "STANDARD";

          return {
            schoolId: school.id,
            schoolName: school.name,
            schoolCode: school.code,
            status: school.status,
            plan: planName,
            modules: enabledModules,
            lastLogin: lastLoginUser?.lastLogin || null,
            activeUsers,
            // Per-school HTTP telemetry is not yet attributable with sufficient
            // confidence. Never represent missing telemetry as a measured zero.
            requestVolume: null,
            errorRate: null,
            telemetryStatus: "UNAVAILABLE",
          };
        })
      );

      res.json({
        success: true,
        data: healthList,
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to fetch platform schools health and usage");
      res.status(500).json({ success: false, error: "Failed to fetch health and usage metrics" });
    }
  }
);

/**
 * GET /api/v1/platform/schools/:schoolId/health-usage
 * Returns specific school health and usage aggregates.
 */
router.get(
  "/schools/:schoolId/health-usage",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = String(req.params.schoolId);

    try {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        include: {
          subscription: {
            include: { planConfig: true },
          },
        },
      });

      if (!school || school.deletedAt) {
        res.status(404).json({ success: false, error: "School not found" });
        return;
      }

      const [activeUsers, lastLoginUser, schoolModules] = await Promise.all([
        prisma.user.count({
          where: { schoolId: school.id, isActive: true, deletedAt: null },
        }),
        prisma.user.findFirst({
          where: { schoolId: school.id, deletedAt: null, lastLogin: { not: null } },
          orderBy: { lastLogin: "desc" },
          select: { lastLogin: true },
        }),
        ModuleRegistryService.getSchoolModules(school.id).catch(() => []),
      ]);

      const enabledModules = schoolModules
        .filter((m) => m.isEnabled)
        .map((m) => m.module.name);

      const planName = (school as { subscription?: { planConfig?: { name?: string } } }).subscription?.planConfig?.name || "STANDARD";

      res.json({
        success: true,
        data: {
          schoolId: school.id,
          schoolName: school.name,
          schoolCode: school.code,
          status: school.status,
          plan: planName,
          modules: enabledModules,
          lastLogin: lastLoginUser?.lastLogin || null,
          activeUsers,
          // Per-school HTTP telemetry is not yet attributable with sufficient
          // confidence. Never represent missing telemetry as a measured zero.
          requestVolume: null,
          errorRate: null,
          telemetryStatus: "UNAVAILABLE",
        },
      });
    } catch (err: unknown) {
      logger.error({ err, schoolId }, "Failed to fetch single school health and usage");
      res.status(500).json({ success: false, error: "Failed to fetch school health metrics" });
    }
  }
);

// ═══════════════════════════════════════════
// Audited Support Session Management (Block M7)
// ═══════════════════════════════════════════

/**
 * POST /api/v1/platform/support-sessions/request
 * Request a short-lived, read-only session with MFA re-authentication.
 */
router.post(
  "/support-sessions/request",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { schoolId, reason, durationMinutes, mfaCode } = req.body;

      if (!schoolId || !reason) {
        res.status(400).json({
          success: false,
          error: "schoolId and reason are required fields",
          code: "VALIDATION_FAILED",
        });
        return;
      }

      // MFA Re-Authentication Check
      const mfaCheck = await verifyUserMfaToken(req.user!.email, mfaCode);
      if (!mfaCheck.success) {
        res.status(mfaCheck.code === "MFA_REQUIRED" ? 400 : 401).json(mfaCheck);
        return;
      }

      // Verify school exists
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
      });

      if (!school || school.deletedAt) {
        res.status(404).json({ success: false, error: "Target school not found" });
        return;
      }

      const { session, token } = await SupportSessionService.createSession({
        schoolId,
        superAdminId: req.user!.id,
        superAdminEmail: req.user!.email,
        reason,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 15,
      });

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          token,
          expiresAt: session.expiresAt,
          durationMinutes: session.durationMinutes,
          schoolId: session.schoolId,
          reason: session.reason,
          status: session.status,
        },
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to initiate support session");
      res.status(500).json({ success: false, error: "Failed to initiate support session" });
    }
  }
);

/**
 * POST /api/v1/platform/support-sessions/:id/revoke
 * Explicitly revoke an active support session.
 */
router.post(
  "/support-sessions/:id/revoke",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sessionId = String(req.params.id);
      const revokedSession = await SupportSessionService.revokeSession(sessionId, req.user!.id);

      if (!revokedSession) {
        res.status(404).json({ success: false, error: "Support session not found" });
        return;
      }

      res.json({
        success: true,
        data: {
          message: "Support session successfully revoked",
          session: {
            id: revokedSession.id,
            schoolId: revokedSession.schoolId,
            status: revokedSession.status,
            revokedAt: revokedSession.revokedAt,
          },
        },
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to revoke support session");
      res.status(500).json({ success: false, error: "Failed to revoke support session" });
    }
  }
);

/**
 * GET /api/v1/platform/support-sessions/school/:schoolId
 * Retrieve the current active support session for a school (if any).
 */
router.get(
  "/support-sessions/school/:schoolId",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = String(req.params.schoolId);
    const session = SupportSessionService.getActiveSessionForSchool(schoolId);
    res.json({
      success: true,
      data: session
        ? {
            id: session.id,
            schoolId: session.schoolId,
            superAdminEmail: session.superAdminEmail,
            reason: session.reason,
            durationMinutes: session.durationMinutes,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            status: session.status,
          }
        : null,
    });
  }
);

/**
 * GET /api/v1/platform/kpi
 * SaaS platform overview and health KPIs (PLATFORM audience only).
 * Aggregate lifecycle metrics, module adoption, DAU, support sessions, and Prometheus health indicators.
 * Zero student rows. Rows from this endpoint feed Grafana views from Block M.
 */
router.get(
  "/kpi",
  authenticate,
  requireRole("SUPER_ADMIN"),
  requireAudience("PLATFORM"),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const now = new Date();
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 1. School Lifecycle Counts
      const [totalSchools, activeSchools, suspendedSchools, trialSchools] = await Promise.all([
        prisma.school.count({ where: { deletedAt: null } }),
        prisma.school.count({ where: { status: "ACTIVE", deletedAt: null } }),
        prisma.school.count({ where: { status: "SUSPENDED", deletedAt: null } }),
        prisma.school.count({ where: { status: "TRIAL", deletedAt: null } }),
      ]);

      // 2. Module Adoption Across Registered Schools
      const allModules = ModuleRegistryService.getAllModules();
      const featureFlags = await prisma.featureFlag.findMany({
        where: { isActive: true },
        select: { id: true, code: true },
      });
      const featureMap = new Map(featureFlags.map((f: { id: string; code: string }) => [f.code, f.id]));

      const moduleAdoption = await Promise.all(
        allModules.map(async (mod) => {
          if (mod.isCore) {
            return {
              code: mod.code,
              name: mod.name,
              category: mod.category,
              isCore: true,
              adoptedSchools: activeSchools,
              adoptionRate: activeSchools > 0 ? 100 : 0,
            };
          }
          const featureId = featureMap.get(mod.code);
          const enabledCount = featureId
            ? await prisma.schoolFeature.count({
                where: { featureId, isEnabled: true },
              })
            : 0;
          const rate = totalSchools > 0 ? Math.round((enabledCount / totalSchools) * 10000) / 100 : 0;
          return {
            code: mod.code,
            name: mod.name,
            category: mod.category,
            isCore: false,
            adoptedSchools: enabledCount,
            adoptionRate: rate,
          };
        })
      );

      // 3. Daily Active Users (DAU) Across Portals
      const [dauTotal, dauAdmins, dauTeachers, dauStaff] = await Promise.all([
        prisma.user.count({
          where: { lastLogin: { gte: past24h }, isActive: true, deletedAt: null },
        }),
        prisma.user.count({
          where: { lastLogin: { gte: past24h }, role: "ERP_ADMIN", isActive: true, deletedAt: null },
        }),
        prisma.user.count({
          where: { lastLogin: { gte: past24h }, role: "TEACHER", isActive: true, deletedAt: null },
        }),
        prisma.user.count({
          where: {
            lastLogin: { gte: past24h },
            role: { in: ["ACCOUNTANT", "ASSET_MANAGER", "LIBRARIAN", "HR", "RECEPTIONIST"] },
            isActive: true,
            deletedAt: null,
          },
        }),
      ]);

      // 4. Support Sessions
      const activeSessionsCount = SupportSessionService.getActiveSessionCount();
      const recentAuditSessions = await prisma.auditLog.count({
        where: {
          action: "SUPPORT_SESSION_INITIATED",
          createdAt: { gte: past24h },
        },
      });

      // 5. Platform Health Numbers from Prometheus-backed metrics or stored aggregates
      const prometheusMetricsSummary: Record<string, number> = {};
      try {
        const metricValues = await register.getMetricsAsJSON();
        for (const metric of metricValues) {
          if (metric.name === "ssvm_http_requests_total") {
            const values = (metric as { values?: Array<{ value?: number }> }).values || [];
            const sum = values.reduce((acc: number, v: { value?: number }) => acc + (v.value || 0), 0);
            prometheusMetricsSummary["http_requests_total"] = sum;
          }
          if (metric.name === "ssvm_http_errors_total") {
            const values = (metric as { values?: Array<{ value?: number }> }).values || [];
            const sum = values.reduce((acc: number, v: { value?: number }) => acc + (v.value || 0), 0);
            prometheusMetricsSummary["http_errors_total"] = sum;
          }
          if (metric.name === "ssvm_auth_failures_total") {
            const values = (metric as { values?: Array<{ value?: number }> }).values || [];
            const sum = values.reduce((acc: number, v: { value?: number }) => acc + (v.value || 0), 0);
            prometheusMetricsSummary["auth_failures_total"] = sum;
          }
          if (metric.name === "ssvm_support_sessions_active") {
            const values = (metric as { values?: Array<{ value?: number }> }).values || [];
            const val = values[0]?.value || 0;
            prometheusMetricsSummary["support_sessions_active"] = val;
          }
        }
      } catch (err: unknown) {
        logger.warn({ err }, "Could not extract prometheus metrics JSON for platform KPI");
      }

      // 6. Registered Platform KPIs Evaluated
      const platformDefs = KpiRegistry.getByScope("PLATFORM");
      const evaluatedPlatformKpis: KpiResult[] = [];
      const computeCtx = {
        prisma,
        targetDate: now,
      };
      for (const def of platformDefs) {
        const result = await KpiRegistry.evaluateKpi(def, computeCtx);
        evaluatedPlatformKpis.push(result);
      }

      res.json({
        success: true,
        audience: "PLATFORM",
        asOf: now.toISOString(),
        data: {
          lifecycle: {
            totalSchools,
            activeSchools,
            suspendedSchools,
            trialSchools,
          },
          moduleAdoption,
          dailyActiveUsers: {
            total: dauTotal,
            breakdown: {
              erpAdmin: dauAdmins,
              teachers: dauTeachers,
              staff: dauStaff,
            },
          },
          supportSessions: {
            currentlyActive: activeSessionsCount,
            initiatedPast24h: recentAuditSessions,
          },
          platformHealth: {
            prometheus: prometheusMetricsSummary,
            database: "CONNECTED",
          },
          kpis: evaluatedPlatformKpis,
        },
      });
    } catch (err: unknown) {
      logger.error({ err }, "Failed to fetch platform KPIs");
      res.status(500).json({ success: false, error: "Failed to fetch platform KPIs" });
    }
  }
);

export default router;
