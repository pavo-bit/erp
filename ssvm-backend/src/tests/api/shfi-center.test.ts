/**
 * ssvm-backend/src/tests/api/shfi-center.test.ts
 * Comprehensive Acceptance Test Suite for System Health, Failure Investigation & Incident Management Centre (SHFI)
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, createTestUser } from "../helpers/testApp";
import { Role } from "@prisma/client";
import { DiagnosticEventService } from "../../services/diagnostic-event.service";
import { IncidentService } from "../../services/incident.service";

describe("SHFI Centre - System Health, Failure Investigation & Incident Management (Phase 7)", () => {
  let app: any;
  let superAdminToken: string;
  let schoolAId: string;
  let schoolBId: string;
  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let parentToken: string;

  beforeEach(async () => {
    app = createTestApp();
    DiagnosticEventService.clearBuffer();
    IncidentService.clearStore();

    schoolAId = `school_shfi_a_${Date.now()}`;
    schoolBId = `school_shfi_b_${Date.now()}`;

    const superAdmin = await createTestUser(Role.SUPER_ADMIN);
    superAdminToken = superAdmin.token;

    const schoolAAdmin = await createTestUser(Role.ERP_ADMIN, schoolAId);
    schoolAAdminToken = schoolAAdmin.token;

    const schoolBAdmin = await createTestUser(Role.ERP_ADMIN, schoolBId);
    schoolBAdminToken = schoolBAdmin.token;

    const parent = await createTestUser(Role.PARENT, schoolAId);
    parentToken = parent.token;
  });

  describe("1. Canonical Diagnostic Event Ingestion & Sanitization", () => {
    it("ingests a valid diagnostic event with auto-generated metadata", async () => {
      const res = await request(app)
        .post("/api/v1/shfi/events")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          eventType: "DATABASE_CONNECTION_SPIKE",
          module: "INFRASTRUCTURE",
          service: "postgres-pool",
          severity: "HIGH",
          errorCode: "ERR_DB_POOL_EXHAUSTION",
          sanitizedDescription: "Active connection pool utilization exceeded 90%",
          evidence: { activeConnections: 95, maxConnections: 100 },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toMatch(/^evt_/);
      expect(res.body.data.schemaVersion).toBe("1.0.0");
      expect(res.body.data.severity).toBe("HIGH");
      expect(res.body.data.correlationId).toBeDefined();
    });

    it("rejects invalid diagnostic events lacking mandatory fields", async () => {
      const res = await request(app)
        .post("/api/v1/shfi/events")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          module: "FINANCE",
          // missing eventType, errorCode, sanitizedDescription
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("deeply sanitizes sensitive data: redacting passwords, tokens, and credit card PANs", async () => {
      const res = await request(app)
        .post("/api/v1/shfi/events")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          eventType: "PAYMENT_AUTH_FAILURE",
          module: "PAYMENTS",
          service: "razorpay-adapter",
          severity: "MEDIUM",
          errorCode: "ERR_GATEWAY_AUTH",
          sanitizedDescription: "Authentication failed during webhook checkout",
          evidence: {
            authHeader: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummysecret",
            userPassword: "PlaintextSuperSecretPassword123!",
            cardNumber: "4111222233334444",
            cardCvv: "123",
            normalField: "Order #9921",
          },
        });

      expect(res.status).toBe(201);
      const evidence = res.body.data.evidence;
      expect(evidence.normalField).toBe("Order #9921");
      expect(evidence.userPassword).toBe("[REDACTED_SENSITIVE_DATA]");
      expect(evidence.cardNumber).toBe("[REDACTED_SENSITIVE_DATA]");
      expect(evidence.cardCvv).toBe("[REDACTED_SENSITIVE_DATA]");
      expect(evidence.authHeader).toBe("[REDACTED_BEARER_TOKEN]");
    });
  });

  describe("2. Deterministic Classification & Correlation", () => {
    it("classifies database deadlock as CONFIRMED DATABASE category and separates symptom from root cause", async () => {
      const event = await DiagnosticEventService.ingest({
        eventType: "LEDGER_LOCK_TIMEOUT",
        module: "FINANCE",
        service: "ledger-service",
        severity: "CRITICAL",
        errorCode: "P2034",
        sanitizedDescription: "Transaction failed due to concurrent update deadlock on LedgerAccount",
        evidence: { query: "UPDATE LedgerAccount SET balance = ...", deadlock: true },
      });

      const incidents = IncidentService.query({ limit: 1 }).incidents;
      expect(incidents.length).toBe(1);
      const inc = incidents[0];
      expect(inc.category).toBe("DATABASE");
      expect(inc.confidence).toBe("CONFIRMED");
      expect(inc.rootCause).toContain("deadlock");
      expect(inc.initialSymptom).toContain("deadlock on LedgerAccount");
      expect(inc.recommendedActions.length).toBeGreaterThan(0);
    });

    it("deduplicates recurring events within the deduplication window", async () => {
      const correlationId = `corr_dedup_${Date.now()}`;

      // Ingest first event
      await DiagnosticEventService.ingest({
        eventType: "JOB_STALLED",
        module: "BACKGROUND_JOBS",
        service: "reconciliation-worker",
        severity: "HIGH",
        errorCode: "ERR_QUEUE_STALL",
        sanitizedDescription: "Reconciliation worker stalled on chunk #4",
        correlationId,
      });

      // Ingest recurring event with same correlation ID
      await DiagnosticEventService.ingest({
        eventType: "JOB_STALLED",
        module: "BACKGROUND_JOBS",
        service: "reconciliation-worker",
        severity: "HIGH",
        errorCode: "ERR_QUEUE_STALL",
        sanitizedDescription: "Reconciliation worker stalled on chunk #4 retry 2",
        correlationId,
      });

      const list = IncidentService.query({ limit: 10 }).incidents;
      expect(list.length).toBe(1);
      expect(list[0].eventCount).toBe(2);
      expect(list[0].timeline.some((t) => t.event.includes("Correlated recurring"))).toBe(true);
    });

    it("assigns UNKNOWN confidence when diagnostic evidence is insufficient", async () => {
      await DiagnosticEventService.ingest({
        eventType: "STRANGE_BEHAVIOR",
        module: "CUSTOM_EXTENSION",
        service: "plugin-xyz",
        severity: "MEDIUM",
        errorCode: "ERR_UNKNOWN_STATE",
        sanitizedDescription: "Unexpected state encountered",
        evidence: { foo: "bar" },
      });

      const inc = IncidentService.query({ limit: 1 }).incidents[0];
      expect(inc.category).toBe("UNKNOWN");
      expect(inc.confidence).toBe("UNKNOWN");
      expect(inc.rootCause).toBeNull();
    });
  });

  describe("3. Incident State Machine & Role-Based Lifecycle", () => {
    let testIncidentId: string;

    beforeEach(async () => {
      const event = await DiagnosticEventService.ingest({
        eventType: "LEDGER_IMBALANCE",
        module: "FINANCE",
        service: "ledger-service",
        severity: "CRITICAL",
        errorCode: "ERR_LEDGER_BALANCE_MISMATCH",
        schoolId: schoolAId,
        sanitizedDescription: "Debit/Credit line totals did not balance for batch #821",
        evidence: { debits: "1000.00", credits: "900.00" },
      });
      const inc = IncidentService.query({ schoolId: schoolAId }).incidents[0];
      testIncidentId = inc.id;
    });

    it("allows ERP_ADMIN to acknowledge, assign, and resolve school-scoped incident", async () => {
      // 1. Acknowledge
      const ackRes = await request(app)
        .put(`/api/v1/shfi/incidents/${testIncidentId}/status`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({ status: "ACKNOWLEDGED" });

      expect(ackRes.status).toBe(200);
      expect(ackRes.body.data.status).toBe("ACKNOWLEDGED");

      // 2. Assign to Staff Role
      const assignRes = await request(app)
        .post(`/api/v1/shfi/incidents/${testIncidentId}/assign`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({ role: "ACCOUNTANT" });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.assignedToRole).toBe("ACCOUNTANT");

      // 3. Resolve
      const resolveRes = await request(app)
        .put(`/api/v1/shfi/incidents/${testIncidentId}/status`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({
          status: "RESOLVED",
          resolutionNotes: "Adjusted missing fee entry line; debit/credit totals reconciled",
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe("RESOLVED");
      expect(resolveRes.body.data.resolvedAt).toBeDefined();

      // 4. Verify & Close
      const verifyRes = await request(app)
        .put(`/api/v1/shfi/incidents/${testIncidentId}/status`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({ status: "VERIFIED" });
      expect(verifyRes.status).toBe(200);

      const closeRes = await request(app)
        .put(`/api/v1/shfi/incidents/${testIncidentId}/status`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({ status: "CLOSED", closureReason: "Trial balance verified clean" });
      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe("CLOSED");
    });

    it("prevents ERP_ADMIN from accessing or mutating incidents belonging to another school (Cross-Tenant Guard)", async () => {
      // School B admin tries to view School A incident
      const viewRes = await request(app)
        .get(`/api/v1/shfi/incidents/${testIncidentId}`)
        .set("Authorization", `Bearer ${schoolBAdminToken}`);

      expect(viewRes.status).toBe(403);

      // School B admin tries to modify status
      const mutateRes = await request(app)
        .put(`/api/v1/shfi/incidents/${testIncidentId}/status`)
        .set("Authorization", `Bearer ${schoolBAdminToken}`)
        .send({ status: "ACKNOWLEDGED" });

      expect(mutateRes.status).toBe(400);
      expect(mutateRes.body.error).toContain("Unauthorized");
    });

    it("allows escalation of incident from L1 to L2 and maintains immutable audit history", async () => {
      const escRes = await request(app)
        .post(`/api/v1/shfi/incidents/${testIncidentId}/escalate`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`)
        .send({ escalationLevel: "L2", reason: "Requires platform engineering intervention for DB lock" });

      expect(escRes.status).toBe(200);
      expect(escRes.body.data.escalationLevel).toBe("L2");
      expect(escRes.body.data.status).toBe("ESCALATED");

      // Verify audit history trail has recorded action
      const getRes = await request(app)
        .get(`/api/v1/shfi/incidents/${testIncidentId}`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`);

      const audit = getRes.body.data.auditHistory;
      expect(audit.some((a: any) => a.action === "ESCALATION_L2")).toBe(true);
    });
  });

  describe("4. Role-Specific Support & Parent Issue Submission", () => {
    it("allows a parent to submit a payment service inquiry and view customer-friendly status", async () => {
      // 1. Submit issue
      const submitRes = await request(app)
        .post("/api/v1/support/issues")
        .set("Authorization", `Bearer ${parentToken}`)
        .send({
          category: "PAYMENT",
          subject: "UPI Fee payment deducted but invoice shows unpaid",
          description: "Paid 15,000 INR via PhonePe; bank reference 882199. Invoice remains pending.",
          relatedReference: "INV-2026-0012",
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.data.status).toBe("SUBMITTED");
      expect(submitRes.body.data.customerMessage).toBeDefined();

      // 2. View my issues
      const myIssuesRes = await request(app)
        .get("/api/v1/support/issues/my")
        .set("Authorization", `Bearer ${parentToken}`);

      expect(myIssuesRes.status).toBe(200);
      expect(myIssuesRes.body.data.length).toBeGreaterThan(0);
      expect(myIssuesRes.body.data[0].subject).toContain("UPI Fee payment deducted");
      // Must not leak internal stack traces or internal secrets
      expect(myIssuesRes.body.data[0].stack).toBeUndefined();
    });
  });

  describe("5. Deep Observability & Health Monitoring Probes", () => {
    it("returns deep health overview with active database, redis, queue and storage probe results", async () => {
      const res = await request(app)
        .get("/api/v1/shfi/health/overview")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.overallStatus).toBeDefined();
      expect(data.dependencies.database.name).toBe("PostgreSQL Database");
      expect(data.dependencies.storage.details.permissions).toBe("READ_WRITE_VERIFIED");
      expect(data.metrics.openIncidents).toBeGreaterThanOrEqual(0);
      expect(data.metrics.memoryUsageMB).toBeGreaterThan(0);
    });

    it("provides Kubernetes-compliant liveness and readiness probes", async () => {
      const liveRes = await request(app).get("/api/v1/health/liveness");
      expect(liveRes.status).toBe(200);
      expect(liveRes.body.status).toBe("UP");

      const readyRes = await request(app).get("/api/v1/health/readiness");
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.database).toBe(true);
    });

    it("returns aggregated health score for a specific school tenant", async () => {
      const res = await request(app)
        .get(`/api/v1/shfi/health/school/${schoolAId}`)
        .set("Authorization", `Bearer ${schoolAAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.schoolId).toBe(schoolAId);
      expect(res.body.data.healthScore).toBeGreaterThanOrEqual(0);
      expect(res.body.data.status).toBeDefined();
    });
  });
});

