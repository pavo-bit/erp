import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getEnv } from "../config/env";
import logger from "./logger";

// ═══════════════════════════════════════════
// Token Payload Types
// ═══════════════════════════════════════════

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  schoolId?: string | null;
  branchId?: string | null;
  jti: string;
  sid: string;
  type: "access";
}

export interface RefreshTokenPayload {
  userId: string;
  type: "refresh";
  jti: string; // unique token ID for revocation tracking
}

export interface PendingTwoFactorPayload {
  userId: string;
  type: "2fa_pending";
}

// ═══════════════════════════════════════════
// Access Token (Short-lived: 15 minutes)
// ═══════════════════════════════════════════

export function generateAccessToken(payload: Omit<AccessTokenPayload, "type" | "jti">): { token: string; jti: string } {
  const env = getEnv();
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { ...payload, jti, type: "access" } as AccessTokenPayload,
    env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "15m" } // Enforced Access Token Policy (15 Minutes)
  );
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const env = getEnv();
    const isRS256 = !!env.JWT_PUBLIC_KEY;
    const secretOrPublicKey = isRS256 ? env.JWT_PUBLIC_KEY! : env.ACCESS_TOKEN_SECRET!;
    const algorithms: jwt.Algorithm[] = isRS256 ? ["RS256"] : ["HS256"];

    const payload = jwt.verify(token, secretOrPublicKey, { algorithms }) as AccessTokenPayload;
    if (payload.type !== "access") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Checks if a token error is specifically an expiration error (not malformed/invalid).
 * Used to set X-Token-Expired header for the frontend to auto-refresh.
 */
export function isTokenExpiredError(token: string): boolean {
  try {
    const env = getEnv();
    const isRS256 = !!env.JWT_PUBLIC_KEY;
    const secretOrPublicKey = isRS256 ? env.JWT_PUBLIC_KEY! : env.ACCESS_TOKEN_SECRET!;
    const algorithms: jwt.Algorithm[] = isRS256 ? ["RS256"] : ["HS256"];

    jwt.verify(token, secretOrPublicKey, { algorithms });
    return false;
  } catch (err) {
    return err instanceof jwt.TokenExpiredError;
  }
}

// ═══════════════════════════════════════════
// Refresh Token (Long-lived: 30 days)
// ═══════════════════════════════════════════

export function generateRefreshToken(userId: string): { token: string; jti: string } {
  const env = getEnv();
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId, type: "refresh", jti } as RefreshTokenPayload,
    env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" } // Enforced Refresh Token Policy (7 Days)
  );
  return { token, jti };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const env = getEnv();
    const isRS256 = !!env.JWT_PUBLIC_KEY;
    const secretOrPublicKey = isRS256 ? env.JWT_PUBLIC_KEY! : env.REFRESH_TOKEN_SECRET!;
    const algorithms: jwt.Algorithm[] = isRS256 ? ["RS256"] : ["HS256"];

    const payload = jwt.verify(token, secretOrPublicKey, { algorithms }) as RefreshTokenPayload;
    if (payload.type !== "refresh") return null;
    return payload;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// 2FA Pending Token (Very short-lived: 5 min)
// ═══════════════════════════════════════════

export function generate2FAPendingToken(userId: string): string {
  const env = getEnv();
  return jwt.sign(
    { userId, type: "2fa_pending" } as PendingTwoFactorPayload,
    env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "5m" }
  );
}

export function verify2FAPendingToken(token: string): PendingTwoFactorPayload | null {
  try {
    const env = getEnv();
    const isRS256 = !!env.JWT_PUBLIC_KEY;
    const secretOrPublicKey = isRS256 ? env.JWT_PUBLIC_KEY! : env.ACCESS_TOKEN_SECRET!;
    const algorithms: jwt.Algorithm[] = isRS256 ? ["RS256"] : ["HS256"];

    const payload = jwt.verify(token, secretOrPublicKey, { algorithms }) as PendingTwoFactorPayload;
    if (payload.type !== "2fa_pending") return null;
    return payload;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// Hashing Utilities
// ═══════════════════════════════════════════

/**
 * SHA-256 hash of a refresh token for secure storage in DB.
 * We never store the raw token — only the hash.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ═══════════════════════════════════════════
// Cookie Configuration
// ═══════════════════════════════════════════

export function getAccessTokenCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
} {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production" && (env.FRONTEND_URL?.startsWith("https") ?? false),
    sameSite: "lax" as const,
    maxAge: parseDuration(env.ACCESS_TOKEN_EXPIRES_IN) * 1000,
    path: "/",
  };
}

export function getRefreshTokenCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
} {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production" && (env.FRONTEND_URL?.startsWith("https") ?? false),
    sameSite: "lax" as const,
    maxAge: parseDuration(env.REFRESH_TOKEN_EXPIRES_IN) * 1000,
    path: "/api/auth", // Refresh token only sent to auth endpoints
  };
}

/**
 * Parse duration string ("15m", "7d", "30d") to seconds.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 min
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 900;
  }
}
