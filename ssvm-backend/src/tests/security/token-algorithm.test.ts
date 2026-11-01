import jwt from "jsonwebtoken";
import {
  generate2FAPendingToken,
  generateAccessToken,
  generateRefreshToken,
  isTokenExpiredError,
  verify2FAPendingToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../lib/tokens";

describe("token algorithm allowlist", () => {
  const legacySecret = "test-only-legacy-hs256-secret";

  it("accepts access, refresh, and pending tokens signed with configured RSA keys", () => {
    const access = generateAccessToken({
      userId: "user-1",
      email: "user@example.test",
      role: "STUDENT",
      name: "Test User",
      schoolId: "school-1",
      sid: "session-1",
    });
    const refresh = generateRefreshToken("user-1");
    const pending = generate2FAPendingToken("user-1");

    expect(verifyAccessToken(access.token)?.userId).toBe("user-1");
    expect(verifyRefreshToken(refresh.token)?.userId).toBe("user-1");
    expect(verify2FAPendingToken(pending)?.userId).toBe("user-1");
  });

  it.each([
    ["access", { userId: "user-1", type: "access" }],
    ["refresh", { userId: "user-1", type: "refresh" }],
    ["pending 2FA", { userId: "user-1", type: "2fa_pending" }],
  ])("rejects an HS256 %s token", (_label, payload) => {
    const token = jwt.sign(payload, legacySecret, { algorithm: "HS256", expiresIn: "5m" });

    expect(verifyAccessToken(token)).toBeNull();
    expect(verifyRefreshToken(token)).toBeNull();
    expect(verify2FAPendingToken(token)).toBeNull();
    expect(isTokenExpiredError(token)).toBe(false);
  });

  it("does not report an expired HS256 token as an expired accepted token", () => {
    const token = jwt.sign(
      { userId: "user-1", type: "access" },
      legacySecret,
      { algorithm: "HS256", expiresIn: -1 },
    );

    expect(verifyAccessToken(token)).toBeNull();
    expect(isTokenExpiredError(token)).toBe(false);
  });
});
