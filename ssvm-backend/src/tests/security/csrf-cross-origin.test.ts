import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app";
import { getEnv } from "../../config/env";

describe("CSRF and Cross-Origin Protection for Auth Endpoints", () => {
  const env = getEnv();
  const trustedOrigin = new URL(env.FRONTEND_URL).origin;

  it("rejects cross-origin refresh requests carrying auth cookies from untrusted origins with 403", async () => {
    const maliciousOrigin = "https://malicious-attacker.evil.com";

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", maliciousOrigin)
      .set("Cookie", ["refresh_token=sample_refresh_token_value"]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("invalid_origin");
  });

  it("rejects cross-origin logout requests carrying auth cookies from untrusted origins with 403", async () => {
    const maliciousOrigin = "https://unauthorized-origin.com";

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Origin", maliciousOrigin)
      .set("Cookie", ["access_token=sample_access_token_value"]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("invalid_origin");
  });

  it("permits refresh requests from the configured trusted frontend origin", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", trustedOrigin)
      .set("Cookie", ["refresh_token=invalid_dummy_token"]);

    // Origin check passes; it fails later with 401 on token verification rather than 403 invalid_origin
    expect(res.status).toBe(401);
    expect(res.body.error).not.toBe("invalid_origin");
  });
});
