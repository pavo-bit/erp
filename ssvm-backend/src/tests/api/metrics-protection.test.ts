/**
 * ssvm-backend/src/tests/api/metrics-protection.test.ts
 *
 * Block M2: Verification Suite for /metrics Access Protection
 *
 * Requirements:
 *  - Registered once on /metrics.
 *  - Requires Bearer token from env METRICS_TOKEN or internal docker network.
 *  - Reject unauthorized public access (401 on bad token, 403 on untrusted public requests).
 *  - Allow authorized requests with HTTP 200 and Prometheus text format.
 */

import "../db/env-setup";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp";

describe("Block M2 — /metrics Access Protection Suite", { timeout: 30000 }, () => {
  const app = createTestApp();
  const testToken = "test-secret-metrics-token-xyz-123";
  let originalMetricsToken: string | undefined;

  beforeAll(() => {
    originalMetricsToken = process.env.METRICS_TOKEN;
    process.env.METRICS_TOKEN = testToken;
  });

  afterAll(() => {
    if (originalMetricsToken !== undefined) {
      process.env.METRICS_TOKEN = originalMetricsToken;
    } else {
      delete process.env.METRICS_TOKEN;
    }
  });

  it("denies access with 403 Forbidden when request comes from public external IP without credentials", async () => {
    const res = await request(app)
      .get("/metrics")
      .set("x-forwarded-for", "198.51.100.42");

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      status: 403,
      title: "Forbidden",
      detail: "Public access to /metrics is restricted",
    });
  });

  it("denies access with 401 Unauthorized when an invalid Bearer token is provided", async () => {
    const res = await request(app)
      .get("/metrics")
      .set("Authorization", "Bearer invalid-token-value")
      .set("x-forwarded-for", "198.51.100.42");

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      status: 401,
      title: "Unauthorized",
      detail: "Invalid metrics authorization credentials",
    });
  });

  it("allows access with 200 OK when valid Bearer token matching METRICS_TOKEN is provided", async () => {
    const res = await request(app)
      .get("/metrics")
      .set("Authorization", `Bearer ${testToken}`)
      .set("x-forwarded-for", "198.51.100.42");

    expect(res.status).toBe(200);
    expect(res.text).toContain("# HELP ssvm_");
    expect(res.text).toContain("ssvm_http_request_duration_seconds");
  });

  it("allows access with 200 OK when request originates from local/internal network without external forward", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.text).toContain("# HELP ssvm_");
    expect(res.text).toContain("ssvm_http_errors_total");
  });
});
