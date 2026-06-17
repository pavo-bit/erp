import jwt from "jsonwebtoken";
import crypto from "crypto";

// ═══════════════════════════════════════════
// JWT Test Helper (GAP 2)
// ═══════════════════════════════════════════
// Generates real RS256 JWTs for security testing.
// Uses test-only RSA keys generated at module load time.

// Generate a test RSA key pair (2048-bit for speed in tests)
const { publicKey: TEST_PUBLIC_KEY, privateKey: TEST_PRIVATE_KEY } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Second key pair for "attacker" tokens (signed by different key)
const { publicKey: ATTACKER_PUBLIC_KEY, privateKey: ATTACKER_PRIVATE_KEY } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

export interface TestTokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  schoolId?: string | null;
  branchId?: string | null;
  jti?: string;
  sid?: string;
  type?: string;
}

/**
 * Generate a valid RS256 access token for testing.
 */
export function generateTestAccessToken(payload: TestTokenPayload, expiresIn: string = "15m"): string {
  return jwt.sign(
    {
      ...payload,
      jti: payload.jti || crypto.randomUUID(),
      sid: payload.sid || crypto.randomUUID(),
      type: "access",
    },
    TEST_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn }
  );
}

/**
 * Generate a valid RS256 refresh token for testing.
 */
export function generateTestRefreshToken(userId: string, expiresIn: string = "7d"): string {
  return jwt.sign(
    { userId, type: "refresh", jti: crypto.randomUUID() },
    TEST_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn }
  );
}

/**
 * Generate a token signed with the ATTACKER key pair.
 * This simulates a forged token that should be rejected by the server.
 */
export function generateAttackerToken(payload: TestTokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
      sid: crypto.randomUUID(),
      type: "access",
    },
    ATTACKER_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "15m" }
  );
}

/**
 * Generate an expired token for testing expiration handling.
 */
export function generateExpiredToken(payload: TestTokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
      sid: crypto.randomUUID(),
      type: "access",
    },
    TEST_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "0s" }
  );
}

/**
 * Generate a token with a tampered schoolId (use wrong school context).
 */
export function generateCrossTenantToken(
  originalPayload: TestTokenPayload,
  targetSchoolId: string
): string {
  return generateTestAccessToken({
    ...originalPayload,
    schoolId: targetSchoolId,
  });
}

/**
 * Generate a token with elevated role (privilege escalation attempt).
 */
export function generateEscalatedToken(
  originalPayload: TestTokenPayload,
  elevatedRole: string = "SUPER_ADMIN"
): string {
  return generateTestAccessToken({
    ...originalPayload,
    role: elevatedRole,
  });
}

/**
 * Decode a token without verification (for inspection in tests).
 */
export function decodeToken(token: string): any {
  return jwt.decode(token, { complete: true });
}

// Export key pairs for test setup (env variable injection)
export const TEST_KEYS = {
  ACCESS_TOKEN_PRIVATE_KEY: TEST_PRIVATE_KEY,
  ACCESS_TOKEN_PUBLIC_KEY: TEST_PUBLIC_KEY,
  REFRESH_TOKEN_PRIVATE_KEY: TEST_PRIVATE_KEY,
  REFRESH_TOKEN_PUBLIC_KEY: TEST_PUBLIC_KEY,
  ATTACKER_PUBLIC_KEY,
  ATTACKER_PRIVATE_KEY,
};
