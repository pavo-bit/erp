import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { verifyAccessToken, isTokenExpiredError, AccessTokenPayload } from "../lib/tokens";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    avatar: string | null;
    phone: string | null;
    schoolId: string | null;
    branchId: string | null;
  };
}

// Re-export TokenPayload for backward compat
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  schoolId?: string;
}

// ═══════════════════════════════════════════
// Password Helpers
// ═══════════════════════════════════════════

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

// ═══════════════════════════════════════════
// Legacy JWT helpers (kept for backward compat)
// ═══════════════════════════════════════════

import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";

export function signToken(payload: TokenPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const env = getEnv();
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// Auth Middleware (Dual-Token Support)
// ═══════════════════════════════════════════

/**
 * Primary authentication middleware.
 * Reads from:
 *   1. "access_token" cookie (new system)
 *   2. "auth_token" cookie (legacy — backward compat)
 *   3. Authorization: Bearer header
 *
 * On expired access token: sets X-Token-Expired header so frontend can auto-refresh.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // Read token from multiple sources (priority order)
  const accessTokenCookie = req.cookies?.access_token;
  const legacyTokenCookie = req.cookies?.auth_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const token = accessTokenCookie || legacyTokenCookie || bearerToken;

  if (!token) {
    res.status(401).json({ success: false, error: "Unauthorized — please log in" });
    return;
  }

  // Try new access token verification first
  let payload: AccessTokenPayload | TokenPayload | null = verifyAccessToken(token);

  // Fallback to legacy JWT verification for backward compat
  if (!payload) {
    payload = verifyToken(token);
  }

  if (!payload) {
    // Check if it's specifically an expiration error (not malformed)
    if (isTokenExpiredError(token)) {
      res.setHeader("X-Token-Expired", "true");
      res.status(401).json({ success: false, error: "Token expired", code: "TOKEN_EXPIRED" });
    } else {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
    return;
  }

  try {
    const userId = "userId" in payload ? payload.userId : (payload as AccessTokenPayload).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, avatar: true, phone: true,
        schoolId: true, branchId: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: "Account not found or deactivated" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error({ err }, "Auth middleware DB error");
    res.status(500).json({ success: false, error: "Auth check failed" });
  }
}

// ═══════════════════════════════════════════
// Role Guards
// ═══════════════════════════════════════════

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Forbidden — insufficient permissions" });
      return;
    }
    next();
  };
}

export function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

export function requireAdmin() {
  return requireRole("SUPER_ADMIN", "ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN");
}

export function requireTeacherOrAdmin() {
  return requireRole("SUPER_ADMIN", "ADMIN", "ERP_ADMIN", "WEBSITE_ADMIN", "TEACHER");
}

// ═══════════════════════════════════════════
// School Scope Guard
// ═══════════════════════════════════════════

export function requireSchoolAccess() {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    if (req.user.role === "SUPER_ADMIN") {
      next();
      return;
    }
    if (!req.user.schoolId) {
      res.status(403).json({ success: false, error: "No school assigned to your account" });
      return;
    }
    const requestedSchoolId = req.params.schoolId || req.query.schoolId || req.body?.schoolId;
    if (requestedSchoolId && requestedSchoolId !== req.user.schoolId) {
      res.status(403).json({ success: false, error: "You can only access your own school's data" });
      return;
    }
    next();
  };
}

// ═══════════════════════════════════════════
// Optional Auth
// ═══════════════════════════════════════════

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const accessTokenCookie = req.cookies?.access_token;
  const legacyTokenCookie = req.cookies?.auth_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = accessTokenCookie || legacyTokenCookie || bearerToken;

  if (!token) {
    next();
    return;
  }

  let payload: AccessTokenPayload | TokenPayload | null = verifyAccessToken(token);
  if (!payload) payload = verifyToken(token);
  if (!payload) {
    next();
    return;
  }

  try {
    const userId = "userId" in payload ? payload.userId : (payload as AccessTokenPayload).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, avatar: true, phone: true,
        schoolId: true, branchId: true,
      },
    });
    if (user && user.isActive) req.user = user;
  } catch (err) {
    logger.warn({ err }, "Optional auth DB error — continuing without user");
  }

  next();
}
