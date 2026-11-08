import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "./helpers/testApp";

const app = createTestApp();

describe("Health Check API", () => {
  it("should return 200 OK or 503 Service Unavailable depending on dependent services", async () => {
    const res = await request(app).get("/api/health");
    
    // We expect a valid JSON response with the health schema
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("version");
    expect(res.body).toHaveProperty("database");
    expect(res.body).toHaveProperty("redis");
    expect(res.body).toHaveProperty("queue");
    expect(res.body).toHaveProperty("storage");

    // The status code depends on whether Redis/DB are actually running in the test environment
    expect([200, 503]).toContain(res.status);
  });

  it("should return liveness status via /api/v1/health/liveness", async () => {
    const res = await request(app).get("/api/v1/health/liveness");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "UP");
    expect(res.body).toHaveProperty("uptime");
  });

  it("should return readiness status via /api/v1/health/readiness", async () => {
    const res = await request(app).get("/api/v1/health/readiness");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("ready");
    expect(res.body).toHaveProperty("database");
    expect(res.body).toHaveProperty("redis");
  });

  it("should return deep diagnostic health status via /api/v1/health/deep", async () => {
    const res = await request(app).get("/api/v1/health/deep");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("overallStatus");
    expect(res.body).toHaveProperty("dependencies");
  });

  it("should report database identity and RLS policy verification via /api/v1/health/database-identity", async () => {
    const res = await request(app).get("/api/v1/health/database-identity");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("currentUser");
    expect(res.body).toHaveProperty("databaseName");
    expect(res.body).toHaveProperty("policyCount");
  });
});
