/**
 * ssvm-backend/src/routes/admin/shfi.ts
 * API Router for System Health, Failure Investigation & Incident Management Centre (SHFI)
 */

import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth";
import { DiagnosticEventService } from "../../services/diagnostic-event.service";
import { IncidentService } from "../../services/incident.service";
import { HealthMonitorService } from "../../services/health-monitor.service";

const router = Router();

// Require SUPER_ADMIN or ERP_ADMIN for all operational SHFI management
router.use(authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"));

/**
 * POST /api/v1/shfi/events
 * Ingest a canonical diagnostic event (sanitized, validated, correlated)
 */
router.post("/events", async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    const payload = {
      ...req.body,
      // If ERP_ADMIN, enforce tenant context
      schoolId: isSuperAdmin ? req.body.schoolId || null : req.user?.schoolId,
    };

    const event = await DiagnosticEventService.ingest(payload);
    res.status(201).json({ success: true, data: event });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shfi/events
 * Query ingested diagnostic events (tenant-isolated for ERP_ADMIN)
 */
router.get("/events", async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    const schoolId = isSuperAdmin ? (req.query.schoolId as string | undefined) : req.user?.schoolId;

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const moduleName = req.query.module as string | undefined;
    const severity = req.query.severity as any;
    const correlationId = req.query.correlationId as string | undefined;

    const result = DiagnosticEventService.query({
      schoolId,
      module: moduleName,
      severity,
      correlationId,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.events,
      pagination: { total: result.total, limit, offset },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shfi/incidents
 * Query incidents with status, severity, category filters
 */
router.get("/incidents", async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    const schoolId = isSuperAdmin ? (req.query.schoolId as string | undefined) : req.user?.schoolId;

    const status = req.query.status as any;
    const severity = req.query.severity as any;
    const category = req.query.category as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = IncidentService.query({
      schoolId,
      status,
      severity,
      category,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.incidents,
      pagination: { total: result.total, limit, offset },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shfi/incidents/:id
 * Retrieve detailed incident record with evidence, timeline & classification
 */
router.get("/incidents/:id", async (req: AuthRequest, res: Response) => {
  try {
    const incidentId = String(req.params.id);
    const incident = IncidentService.getById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, error: "Incident not found" });
    }

    // Tenant check
    if (req.user?.role === "ERP_ADMIN" && incident.schoolId !== req.user?.schoolId) {
      return res.status(403).json({ success: false, error: "Unauthorized access to incident outside school scope" });
    }

    res.json({ success: true, data: incident });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/shfi/incidents
 * Manually submit / report an incident
 */
router.post("/incidents", async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    const schema = z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).default("MEDIUM"),
      affectedService: z.string().min(1),
      affectedModule: z.string().min(1),
      schoolId: z.string().nullable().optional(),
    });

    const parsed = schema.parse(req.body);
    const schoolId = isSuperAdmin ? parsed.schoolId || null : req.user?.schoolId || null;

    const incident = IncidentService.createManualIncident({
      title: parsed.title,
      summary: parsed.summary,
      severity: parsed.severity,
      schoolId,
      affectedService: parsed.affectedService,
      affectedModule: parsed.affectedModule,
      actor: `${req.user?.role} (${req.user?.id})`,
    });

    res.status(201).json({ success: true, data: incident });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v1/shfi/incidents/:id/status
 * Transition incident status (state machine validated)
 */
router.put("/incidents/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { status, resolutionNotes, closureReason, verificationDetails } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: "target status is required" });
    }

    const updated = IncidentService.transitionStatus(
      String(req.params.id),
      status,
      {
        id: req.user!.id,
        role: req.user!.role,
        schoolId: req.user?.schoolId,
      },
      { resolutionNotes, closureReason, verificationDetails }
    );

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/shfi/incidents/:id/assign
 * Assign incident to staff user or operational role
 */
router.post("/incidents/:id/assign", async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.body;
    const updated = IncidentService.assign(
      String(req.params.id),
      { userId, role },
      {
        id: req.user!.id,
        role: req.user!.role,
        schoolId: req.user?.schoolId,
      }
    );

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/shfi/incidents/:id/escalate
 * Escalate incident (L1 -> L2 -> L3 -> EXECUTIVE)
 */
router.post("/incidents/:id/escalate", async (req: AuthRequest, res: Response) => {
  try {
    const { escalationLevel, reason } = req.body;
    if (!escalationLevel || !reason) {
      return res.status(400).json({ success: false, error: "escalationLevel and reason are required" });
    }

    const updated = IncidentService.escalate(
      String(req.params.id),
      escalationLevel,
      reason,
      {
        id: req.user!.id,
        role: req.user!.role,
        schoolId: req.user?.schoolId,
      }
    );

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shfi/health/overview
 * Real-time system health overview with deep probe results
 */
router.get("/health/overview", async (_req: AuthRequest, res: Response) => {
  try {
    const overview = await HealthMonitorService.getDeepHealth();
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shfi/health/school/:schoolId
 * Aggregated health status score for a specific school tenant
 */
router.get("/health/school/:schoolId", async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = String(req.params.schoolId);
    if (req.user?.role === "ERP_ADMIN" && req.user?.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: "Unauthorized access to other school health" });
    }

    const report = await HealthMonitorService.getSchoolHealth(schoolId);
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shfi/analytics
 * Historical incident analytics (MTTR, distribution by module, confidence scores)
 */
router.get("/analytics", async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    const schoolId = isSuperAdmin ? undefined : req.user?.schoolId;

    const incidents = IncidentService.query({ schoolId, limit: 1000 }).incidents;
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const moduleCounts: Record<string, number> = {};

    let resolvedCount = 0;
    let totalResolutionTimeMs = 0;

    for (const inc of incidents) {
      categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
      severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;
      moduleCounts[inc.affectedModule] = (moduleCounts[inc.affectedModule] || 0) + 1;

      if (inc.resolvedAt) {
        resolvedCount += 1;
        totalResolutionTimeMs += new Date(inc.resolvedAt).getTime() - new Date(inc.createdAt).getTime();
      }
    }

    const meanTimeToResolutionMinutes =
      resolvedCount > 0 ? Math.round(totalResolutionTimeMs / resolvedCount / (1000 * 60)) : 0;

    res.json({
      success: true,
      data: {
        totalIncidents: incidents.length,
        resolvedIncidents: resolvedCount,
        meanTimeToResolutionMinutes,
        distribution: {
          byCategory: categoryCounts,
          bySeverity: severityCounts,
          byModule: moduleCounts,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
