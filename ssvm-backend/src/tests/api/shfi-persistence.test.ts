/**
 * ssvm-backend/src/tests/api/shfi-persistence.test.ts
 * Verifies durable persistence and restart recovery of SHFI Incidents and Diagnostic Events.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "../../services/incident.service";
import { DiagnosticEventService } from "../../services/diagnostic-event.service";
import { PlatformIncident, DiagnosticEvent } from "../../types/shfi.types";

describe("SHFI Durable Persistence & Restart Hydration", () => {
  beforeEach(() => {
    IncidentService.clearStore();
    DiagnosticEventService.clearBuffer();
  });

  it("persists a newly created incident and recovers it after simulated process restart", async () => {
    const incident = IncidentService.createManualIncident({
      title: "Simulated Primary DB Timeout",
      summary: "Database connection pool exhausted during peak test run",
      severity: "CRITICAL",
      schoolId: null,
      affectedService: "ssvm-database",
      affectedModule: "INFRASTRUCTURE",
      actor: "SRE_SYSTEM",
    });

    expect(incident.id).toBeDefined();

    // Explicitly await persistence to guarantee storage write
    await IncidentService.persistIncident(incident);

    // Verify incident is in-memory
    expect(IncidentService.getById(incident.id)).not.toBeNull();

    // Simulate process crash / memory wipe
    IncidentService.clearStore();
    expect(IncidentService.getById(incident.id)).toBeNull();

    // Hydrate from persistent store (Redis or PostgreSQL system_logs)
    const hydratedCount = await IncidentService.initialize();
    expect(hydratedCount).toBeGreaterThanOrEqual(1);

    // Assert incident is completely restored
    const restored = IncidentService.getById(incident.id);
    expect(restored).not.toBeNull();
    expect(restored?.id).toBe(incident.id);
    expect(restored?.title).toBe("Simulated Primary DB Timeout");
    expect(restored?.severity).toBe("CRITICAL");
  });

  it("persists status transitions across process restarts", async () => {
    const incident = IncidentService.createManualIncident({
      title: "Simulated Webhook Failure",
      summary: "Razorpay signature verification failure",
      severity: "HIGH",
      schoolId: null,
      affectedService: "payments",
      affectedModule: "FINANCE",
      actor: "SRE_LEAD",
    });

    IncidentService.transitionStatus(
      incident.id,
      "ACKNOWLEDGED",
      { id: "usr_admin_1", role: "SUPER_ADMIN" }
    );

    await IncidentService.persistIncident(incident);

    // Memory wipe
    IncidentService.clearStore();

    // Hydrate
    await IncidentService.initialize();
    const restored = IncidentService.getById(incident.id);
    expect(restored).not.toBeNull();
    expect(restored?.status).toBe("ACKNOWLEDGED");
  });

  it("persists and rehydrates diagnostic events", async () => {
    const event = await DiagnosticEventService.ingest({
      eventType: "STORAGE_DISCOVERY_PROBE",
      module: "STORAGE",
      service: "local-fs",
      severity: "HIGH",
      errorCode: "ERR_DISK_SPACE_WARNING",
      sanitizedDescription: "Disk usage exceeded 85% on mount /data",
      evidence: { mount: "/data", percentUsed: 86 },
    });

    // Ensure persisted
    await DiagnosticEventService.persistEvent(event);

    // Wipe memory buffer
    DiagnosticEventService.clearBuffer();
    expect(DiagnosticEventService.query({}).total).toBe(0);

    // Rehydrate
    const count = await DiagnosticEventService.initialize();
    expect(count).toBeGreaterThanOrEqual(1);

    const queried = DiagnosticEventService.query({ correlationId: event.correlationId });
    expect(queried.total).toBeGreaterThanOrEqual(1);
    expect(queried.events[0].errorCode).toBe("ERR_DISK_SPACE_WARNING");
  });
});

