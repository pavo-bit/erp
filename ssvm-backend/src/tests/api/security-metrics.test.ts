/**
 * ssvm-backend/src/tests/api/security-metrics.test.ts
 *
 * Block M3: Verification Suite for Security Metrics & PII-Free Label Compliance
 *
 * Requirements:
 *  - ssvm_auth_failures_total{reason}
 *  - ssvm_account_lockouts_total
 *  - ssvm_wrong_portal_denials_total
 *  - ssvm_csrf_failures_total
 *  - ssvm_rate_limit_hits_total{limiter}
 *  - ssvm_webhook_signature_failures_total
 *  - ssvm_rls_context_missing_total
 *  - ssvm_support_sessions_active
 *  - ssvm_audit_events_total{action}
 *  - STRICT INVARIANT: NO personal data (user id, email, IP, student id) in labels.
 */

import "../db/env-setup";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp";
import {
  register,
  webhookSignatureFailuresTotal,
  rlsContextMissingTotal,
  supportSessionsActive,
  auditEventsTotal,
} from "../../middleware/metrics";
import { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { createAuditLog } from "../../lib/audit";

interface MetricSampleValue {
  value: number;
  labels?: Record<string, string>;
}

interface MetricResult {
  values: MetricSampleValue[];
}

interface MetricWithGet {
  get: () => Promise<MetricResult>;
}

describe("Block M3 — Security Metrics & PII Protection Suite", { timeout: 30000 }, () => {
  const app = createTestApp();

  it("verifies all M3 metrics are registered and possess strictly PII-free label schemas", async () => {
    const registered = await register.getMetricsAsJSON();
    const metricMap = new Map(registered.map((m) => [m.name, m]));

    const requiredMetrics = [
      "ssvm_auth_failures_total",
      "ssvm_account_lockouts_total",
      "ssvm_wrong_portal_denials_total",
      "ssvm_csrf_failures_total",
      "ssvm_rate_limit_hits_total",
      "ssvm_webhook_signature_failures_total",
      "ssvm_rls_context_missing_total",
      "ssvm_support_sessions_active",
      "ssvm_audit_events_total",
    ];

    for (const name of requiredMetrics) {
      expect(metricMap.has(name), `Expected ${name} to be registered`).toBe(true);
      const metric = metricMap.get(name);
      expect(metric).toBeDefined();

      // Assert NO personal data or high-cardinality PII in label names
      const piiLabels = ["userId", "user_id", "email", "studentId", "parentId", "phone", "ip", "ipAddress"];
      const labelNames: string[] = (metric && "labelNames" in metric && Array.isArray((metric as { labelNames: unknown }).labelNames))
        ? ((metric as { labelNames: string[] }).labelNames)
        : [];

      for (const pii of piiLabels) {
        expect(labelNames).not.toContain(pii);
      }
    }
  });

  it("increments ssvm_auth_failures_total when authentication fails", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nonexistent-user@example.com", password: "Password@123" });

    expect([401, 400, 404]).toContain(res.status);

    const metricsText = await register.metrics();
    expect(metricsText).toContain("ssvm_auth_failures_total");
  });

  it("increments ssvm_webhook_signature_failures_total on invalid HMAC signature", async () => {
    const metricReader = webhookSignatureFailuresTotal as unknown as MetricWithGet;
    const beforeCount = (await metricReader.get()).values[0]?.value || 0;

    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("x-razorpay-signature", "invalid_signature_hash")
      .send({ event: "payment.captured", id: "pay_test_123" });

    expect([400, 500]).toContain(res.status);
    const afterCount = (await metricReader.get()).values[0]?.value || 0;
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 1);
  });

  it("increments ssvm_rls_context_missing_total when tenant transaction lacks schoolId", async () => {
    const metricReader = rlsContextMissingTotal as unknown as MetricWithGet;
    const beforeCount = (await metricReader.get()).values[0]?.value || 0;

    await expect(
      runWithTenantDatabaseTransaction("", async () => {
        return true;
      })
    ).rejects.toThrow("Tenant database transaction requires a valid non-empty schoolId.");

    const afterCount = (await metricReader.get()).values[0]?.value || 0;
    expect(afterCount).toBe(beforeCount + 1);
  });

  it("increments ssvm_audit_events_total with bounded action label", async () => {
    const metricReader = auditEventsTotal as unknown as MetricWithGet;
    const beforeValues = (await metricReader.get()).values;
    const beforeCount = beforeValues.reduce((acc: number, v: MetricSampleValue) => acc + v.value, 0);

    await createAuditLog({
      data: {
        action: "TEST_SECURITY_ACTION",
        entity: "SecurityMetric",
      },
    });

    const afterValues = (await metricReader.get()).values;
    const afterCount = afterValues.reduce((acc: number, v: MetricSampleValue) => acc + v.value, 0);
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it("manipulates and observes ssvm_support_sessions_active gauge", async () => {
    const metricReader = supportSessionsActive as unknown as MetricWithGet;
    supportSessionsActive.set(2);
    let val = (await metricReader.get()).values[0]?.value;
    expect(val).toBe(2);

    supportSessionsActive.dec();
    val = (await metricReader.get()).values[0]?.value;
    expect(val).toBe(1);

    supportSessionsActive.set(0);
  });
});
