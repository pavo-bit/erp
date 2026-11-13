/**
 * ssvm-backend/src/services/incident.service.ts
 * Incident Lifecycle State Machine & Correlation Engine for SHFI
 */

import crypto from "crypto";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import { runWithSchoolContext, runAsSuperAdmin } from "../middleware/school-context.middleware";
import {
  PlatformIncident,
  DiagnosticEvent,
  IncidentStatus,
  EscalationLevel,
  DiagnosticEventSeverity,
} from "../types/shfi.types";
import { IncidentClassificationService } from "./incident-classification.service";

export class IncidentService {
  // In-memory persistent store for incidents (bounded to 1,000 active incidents)
  private static incidentMap = new Map<string, PlatformIncident>();

  // Deduplication window in milliseconds (15 minutes)
  private static readonly DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000;

  private static readonly REDIS_INCIDENTS_KEY = "shfi:incidents";

  /**
   * Persist incident state durably to Redis and PostgreSQL system_logs.
   * Multi-instance safe and restart-durable.
   */
  public static async persistIncident(incident: PlatformIncident): Promise<void> {
    const serialized = JSON.stringify(incident);

    // 1. Redis durable cache
    try {
      if (isRedisAvailable()) {
        const redis = getRedisClient();
        if (redis) {
          await redis.hset(this.REDIS_INCIDENTS_KEY, incident.id, serialized);
        }
      }
    } catch (err: any) {
      logger.warn({ err: err.message, incidentId: incident.id }, "Failed to persist incident to Redis");
    }

    // 2. PostgreSQL durable system_logs backing via SECURITY DEFINER function
    try {
      await prisma.$executeRawUnsafe(
        `SELECT log_pre_tenant_system_log(
           $1, $2, $3, $4,
           CASE WHEN $5::text IS NOT NULL AND EXISTS (SELECT 1 FROM schools WHERE id = $5) THEN $5 ELSE NULL END,
           $6
         )`,
        incident.severity,
        "SHFI_INCIDENT",
        incident.id,
        serialized,
        incident.schoolId || null,
        null
      );
    } catch (err: any) {
      logger.warn({ err: err.message, incidentId: incident.id }, "Failed to persist incident to PostgreSQL");
    }
  }

  /**
   * Hydrate incidents from Redis or PostgreSQL on application startup.
   */
  public static async initialize(): Promise<number> {
    let hydratedCount = 0;

    // 1. Attempt hydration from Redis hash
    try {
      if (isRedisAvailable()) {
        const redis = getRedisClient();
        if (redis) {
          const rawEntries = await redis.hgetall(this.REDIS_INCIDENTS_KEY);
          if (rawEntries && Object.keys(rawEntries).length > 0) {
            for (const [id, rawJson] of Object.entries(rawEntries)) {
              try {
                const parsed = JSON.parse(rawJson) as PlatformIncident;
                this.incidentMap.set(id, parsed);
                hydratedCount++;
              } catch (parseErr) {
                logger.warn({ id, parseErr }, "Corrupted incident JSON in Redis");
              }
            }
            logger.info({ hydratedCount }, "SHFI Incidents hydrated from Redis cache");
            return hydratedCount;
          }
        }
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, "Failed to hydrate incidents from Redis — falling back to database");
    }

    // 2. Fallback hydration from PostgreSQL system_logs
    try {
      const rows = await (prisma as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.trusted_purpose', 'ADMIN_AUDIT', true);`);
        return tx.$queryRawUnsafe(
          `SELECT metadata FROM system_logs WHERE module = 'SHFI_INCIDENT' ORDER BY "createdAt" DESC LIMIT 1000`
        );
      });

      for (const row of (rows as any[])) {
        if (!row.metadata) continue;
        try {
          const parsed = JSON.parse(row.metadata) as PlatformIncident;
          if (!this.incidentMap.has(parsed.id)) {
            this.incidentMap.set(parsed.id, parsed);
            hydratedCount++;
          }
        } catch (e) {
          // Ignore malformed log entry
        }
      }
      logger.info({ hydratedCount }, "SHFI Incidents hydrated from PostgreSQL system_logs");
    } catch (err: any) {
      logger.warn({ err: err.message }, "Failed to hydrate incidents from PostgreSQL");
    }

    return hydratedCount;
  }

  /**
   * Process an incoming diagnostic event:
   * Deduplicates against active incidents or spawns a new correlated incident.
   */
  public static async processDiagnosticEvent(event: DiagnosticEvent): Promise<PlatformIncident> {
    const classification = IncidentClassificationService.classify(event);
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Check for existing active incident with matching correlationId or (schoolId, affectedService, category)
    const existing = Array.from(this.incidentMap.values()).find((inc) => {
      if (inc.status === "CLOSED") return false;

      // Exact correlationId match
      if (inc.correlationId === event.correlationId) return true;

      // Deduplication heuristic: same school + service + category within deduplication window
      const isSameScope = inc.schoolId === event.schoolId && inc.affectedService === event.service;
      const isSameCategory = inc.category === classification.category;
      const isWithinWindow =
        now.getTime() - new Date(inc.updatedAt).getTime() < this.DEDUPLICATION_WINDOW_MS;

      return isSameScope && isSameCategory && isWithinWindow;
    });

    if (existing) {
      // Deduplicate: append event, bump eventCount and escalate severity if higher
      existing.eventCount += 1;
      existing.events.push(event);
      existing.evidence.push(event.evidence);
      existing.updatedAt = nowIso;

      if (this.isHigherSeverity(event.severity, existing.severity)) {
        existing.severity = event.severity;
        existing.timeline.push({
          timestamp: nowIso,
          event: `Severity escalated to ${event.severity} due to incoming event ${event.id}`,
        });
      }

      existing.timeline.push({
        timestamp: nowIso,
        event: `Correlated recurring diagnostic event ${event.id} (ErrorCode: ${event.errorCode})`,
        details: { errorCode: event.errorCode, attempt: event.processingAttempt },
      });

      logger.info(
        { incidentId: existing.id, eventCount: existing.eventCount, eventId: event.id },
        "Deduplicated diagnostic event onto existing incident"
      );
      void this.persistIncident(existing);
      return existing;
    }

    // 2. Spawn new incident
    const incidentId = `inc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const newIncident: PlatformIncident = {
      id: incidentId,
      title: `${classification.category}: Failure in ${event.service}`,
      summary: event.sanitizedDescription,
      severity: event.severity,
      category: classification.category,
      confidence: classification.confidence,
      status: "DETECTED",
      schoolId: event.schoolId,
      affectedService: event.service,
      affectedModule: event.module,
      rootCause: classification.rootCause,
      initialSymptom: classification.initialSymptom,
      correlationId: event.correlationId,
      eventCount: 1,
      events: [event],
      evidence: [event.evidence],
      timeline: [
        {
          timestamp: nowIso,
          event: `Incident DETECTED from event ${event.id} (${event.errorCode})`,
          details: { initialSymptom: classification.initialSymptom, confidence: classification.confidence },
        },
      ],
      assignedToUserId: null,
      assignedToRole: null,
      escalationLevel: "L1",
      recommendedActions: classification.recommendedActions,
      resolutionNotes: null,
      resolvedAt: null,
      verifiedAt: null,
      closedAt: null,
      closureReason: null,
      auditHistory: [
        {
          timestamp: nowIso,
          actor: "SYSTEM",
          action: "INCIDENT_CREATED",
          metadata: { category: classification.category, severity: event.severity },
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.incidentMap.set(incidentId, newIncident);
    logger.warn(
      { incidentId, category: newIncident.category, severity: newIncident.severity, schoolId: newIncident.schoolId },
      "New SHFI incident opened"
    );

    void this.persistIncident(newIncident);
    return newIncident;
  }

  /**
   * Manually create an incident from staff or administrator reports.
   */
  public static createManualIncident(params: {
    title: string;
    summary: string;
    severity: DiagnosticEventSeverity;
    schoolId: string | null;
    affectedService: string;
    affectedModule: string;
    actor: string;
  }): PlatformIncident {
    const nowIso = new Date().toISOString();
    const incidentId = `inc_manual_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const correlationId = `corr_man_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const incident: PlatformIncident = {
      id: incidentId,
      title: params.title,
      summary: params.summary,
      severity: params.severity,
      category: "UNKNOWN",
      confidence: "UNKNOWN",
      status: "TRIAGED",
      schoolId: params.schoolId,
      affectedService: params.affectedService,
      affectedModule: params.affectedModule,
      rootCause: null,
      initialSymptom: params.summary,
      correlationId,
      eventCount: 0,
      events: [],
      evidence: [],
      timeline: [
        {
          timestamp: nowIso,
          event: `Incident manually submitted by ${params.actor}`,
        },
      ],
      assignedToUserId: null,
      assignedToRole: null,
      escalationLevel: "L1",
      recommendedActions: ["Investigate reported symptoms and capture diagnostic traces"],
      resolutionNotes: null,
      resolvedAt: null,
      verifiedAt: null,
      closedAt: null,
      closureReason: null,
      auditHistory: [
        {
          timestamp: nowIso,
          actor: params.actor,
          action: "MANUAL_INCIDENT_CREATED",
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.incidentMap.set(incidentId, incident);
    void this.persistIncident(incident);
    return incident;
  }

  /**
   * State Machine Transition validation and execution.
   */
  public static transitionStatus(
    incidentId: string,
    targetStatus: IncidentStatus,
    actor: { id: string; role: string; schoolId?: string | null },
    metadata?: { resolutionNotes?: string; closureReason?: string; verificationDetails?: any }
  ): PlatformIncident {
    const incident = this.incidentMap.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    // Role-based tenant boundary check
    if (actor.role === "ERP_ADMIN") {
      if (incident.schoolId !== actor.schoolId) {
        throw new Error("Unauthorized: ERP_ADMIN can only transition incidents within their assigned school");
      }
    }

    const validTransitions: Record<IncidentStatus, IncidentStatus[]> = {
      DETECTED: ["TRIAGED", "ACKNOWLEDGED", "ASSIGNED", "CLOSED"],
      TRIAGED: ["ACKNOWLEDGED", "ASSIGNED", "INVESTIGATING", "CLOSED"],
      ACKNOWLEDGED: ["ASSIGNED", "INVESTIGATING", "ACTION_REQUIRED", "ESCALATED", "RESOLVED"],
      ASSIGNED: ["INVESTIGATING", "ACTION_REQUIRED", "ESCALATED", "RESOLVED"],
      INVESTIGATING: ["ACTION_REQUIRED", "ESCALATED", "RESOLVED", "ASSIGNED"],
      ACTION_REQUIRED: ["INVESTIGATING", "ESCALATED", "RESOLVED"],
      ESCALATED: ["INVESTIGATING", "ACTION_REQUIRED", "RESOLVED"],
      RESOLVED: ["VERIFIED", "REOPENED", "CLOSED"],
      VERIFIED: ["CLOSED", "REOPENED"],
      CLOSED: ["REOPENED"],
      REOPENED: ["TRIAGED", "INVESTIGATING", "ASSIGNED"],
    };

    const allowed = validTransitions[incident.status];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new Error(`Invalid incident status transition from ${incident.status} to ${targetStatus}`);
    }

    const nowIso = new Date().toISOString();
    incident.status = targetStatus;
    incident.updatedAt = nowIso;

    if (targetStatus === "RESOLVED") {
      incident.resolvedAt = nowIso;
      incident.resolutionNotes = metadata?.resolutionNotes || "Resolution applied and verified by engineer";
    } else if (targetStatus === "VERIFIED") {
      incident.verifiedAt = nowIso;
    } else if (targetStatus === "CLOSED") {
      incident.closedAt = nowIso;
      incident.closureReason = metadata?.closureReason || "Resolution confirmed; incident closed";
    } else if (targetStatus === "REOPENED") {
      incident.closedAt = null;
      incident.resolvedAt = null;
      incident.closureReason = null;
    }

    incident.timeline.push({
      timestamp: nowIso,
      event: `Status transitioned to ${targetStatus}`,
      actor: `${actor.role} (${actor.id})`,
      details: metadata,
    });

    incident.auditHistory.push({
      timestamp: nowIso,
      actor: `${actor.role} (${actor.id})`,
      action: `STATUS_CHANGE_${targetStatus}`,
      metadata,
    });

    void this.persistIncident(incident);
    return incident;
  }

  /**
   * Assign an incident to a specific staff user or operational role.
   */
  public static assign(
    incidentId: string,
    assignedTo: { userId?: string | null; role?: string | null },
    actor: { id: string; role: string; schoolId?: string | null }
  ): PlatformIncident {
    const incident = this.incidentMap.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    if (actor.role === "ERP_ADMIN" && incident.schoolId !== actor.schoolId) {
      throw new Error("Unauthorized: ERP_ADMIN can only assign school-scoped incidents");
    }

    const nowIso = new Date().toISOString();
    incident.assignedToUserId = assignedTo.userId || null;
    incident.assignedToRole = assignedTo.role || null;
    if (["DETECTED", "TRIAGED", "ACKNOWLEDGED"].includes(incident.status)) {
      incident.status = "ASSIGNED";
    }
    incident.updatedAt = nowIso;

    incident.timeline.push({
      timestamp: nowIso,
      event: `Assigned to user: ${assignedTo.userId || "none"}, role: ${assignedTo.role || "none"}`,
      actor: `${actor.role} (${actor.id})`,
    });

    incident.auditHistory.push({
      timestamp: nowIso,
      actor: `${actor.role} (${actor.id})`,
      action: "INCIDENT_ASSIGNED",
      metadata: assignedTo,
    });

    void this.persistIncident(incident);
    return incident;
  }

  /**
   * Escalate an incident to a higher response tier (L1 -> L2 -> L3 -> EXECUTIVE).
   */
  public static escalate(
    incidentId: string,
    targetLevel: EscalationLevel,
    reason: string,
    actor: { id: string; role: string; schoolId?: string | null }
  ): PlatformIncident {
    const incident = this.incidentMap.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const nowIso = new Date().toISOString();
    incident.escalationLevel = targetLevel;
    incident.status = "ESCALATED";
    incident.updatedAt = nowIso;

    incident.timeline.push({
      timestamp: nowIso,
      event: `Incident escalated to ${targetLevel}: ${reason}`,
      actor: `${actor.role} (${actor.id})`,
    });

    incident.auditHistory.push({
      timestamp: nowIso,
      actor: `${actor.role} (${actor.id})`,
      action: `ESCALATION_${targetLevel}`,
      metadata: { reason },
    });

    void this.persistIncident(incident);
    return incident;
  }

  /**
   * Query incidents with filtering, role enforcement, and pagination.
   */
  public static query(filter: {
    schoolId?: string | null;
    status?: IncidentStatus;
    severity?: DiagnosticEventSeverity;
    category?: string;
    limit?: number;
    offset?: number;
  }): { incidents: PlatformIncident[]; total: number } {
    let list = Array.from(this.incidentMap.values());

    if (filter.schoolId !== undefined) {
      list = list.filter((i) => i.schoolId === filter.schoolId);
    }
    if (filter.status) {
      list = list.filter((i) => i.status === filter.status);
    }
    if (filter.severity) {
      list = list.filter((i) => i.severity === filter.severity);
    }
    if (filter.category) {
      list = list.filter((i) => i.category === filter.category);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = list.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    return {
      incidents: list.slice(offset, offset + limit),
      total,
    };
  }

  public static getById(id: string): PlatformIncident | null {
    return this.incidentMap.get(id) || null;
  }

  public static clearStore(): void {
    this.incidentMap.clear();
  }

  private static isHigherSeverity(incoming: DiagnosticEventSeverity, current: DiagnosticEventSeverity): boolean {
    const weights: Record<DiagnosticEventSeverity, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };
    return weights[incoming] > weights[current];
  }
}
