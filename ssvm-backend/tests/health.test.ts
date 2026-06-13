import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

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
});
