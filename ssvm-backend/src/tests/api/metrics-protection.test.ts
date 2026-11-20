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

  it("denies access with 403 Forbidden when request contains a spoofed x-forwarded-for header (even claiming 127.0.0.1)", async () => {
    const res = await request(app)
      .get("/metrics")
      .set("x-forwarded-for", "127.0.0.1");

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      status: 403,
      title: "Forbidden",
      detail: "Public access to /metrics is restricted",
    });
  });

  it("denies access with 403 Forbidden when request contains a spoofed private IP in x-forwarded-for without credentials", async () => {
    const res1 = await request(app)
      .get("/metrics")
      .set("x-forwarded-for", "10.0.0.1");
    expect(res1.status).toBe(403);

    const res2 = await request(app)
      .get("/metrics")
      .set("x-forwarded-for", "172.16.0.1");
    expect(res2.status).toBe(403);

    const res3 = await request(app)
      .get("/metrics")
      .set("x-forwarded-for", "192.168.1.1");
    expect(res3.status).toBe(403);
  });

  describe("Production Mode Hardening", () => {
    const savedNodeEnv = process.env.NODE_ENV;
    const savedSentryDsn = process.env.SENTRY_DSN;
    const savedRazorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const savedRazorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const savedRazorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    beforeAll(() => {
      // This suite changes NODE_ENV only to exercise the /metrics production branch.
      // Supply the minimum non-production-test values required by the production
      // environment validator so this test does not abort before reaching /metrics.
      process.env.NODE_ENV = "production";
      process.env.SENTRY_DSN = "https://ci.invalid/metrics-protection-test";
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
    });

    afterAll(() => {
      if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = savedNodeEnv;

      if (savedSentryDsn === undefined) delete process.env.SENTRY_DSN;
      else process.env.SENTRY_DSN = savedSentryDsn;

      if (savedRazorpayKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
      else process.env.RAZORPAY_KEY_ID = savedRazorpayKeyId;

      if (savedRazorpayKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = savedRazorpayKeySecret;

      if (savedRazorpayWebhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
      else process.env.RAZORPAY_WEBHOOK_SECRET = savedRazorpayWebhookSecret;
    });

    it("requires bearer token always in production (rejects loopback request without token)", async () => {
      const res = await request(app).get("/metrics");

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        status: 401,
        title: "Unauthorized",
        detail: "Bearer token required for /metrics in production",
      });
    });

    it("allows access in production when valid Bearer token is provided", async () => {
      const res = await request(app)
        .get("/metrics")
        .set("Authorization", `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain("# HELP ssvm_");
    });
  });
});
