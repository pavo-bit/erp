import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import * as argon2 from "argon2";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { verifyAccessToken, isTokenExpiredError, AccessTokenPayload } from "../lib/tokens";
import { jwtVerificationTotal, wrongPortalDenialsTotal } from "./metrics";
import { setAuthenticatedSchoolContext } from "./school-context.middleware";
import { getAuthPrisma } from "../lib/authPrisma";
import { SupportSessionService } from "../services/support-session.service";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    studentId?: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    avatar: string | null;
    phone: string | null;
    schoolId: string | null;
    branchId: string | null;
    aud?: "PLATFORM" | "SCHOOL";
    mfaVerified?: boolean;
    impersonated?: boolean;
    originalUserId?: string;
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
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

export async function verifyPassword(password: string, hashed: string, userMeta?: { id: string; type: "USER" | "STUDENT" }): Promise<boolean> {
  let isValid: boolean;
  let needsRehash: boolean;

  // Detect legacy bcrypt hash
  if (hashed.startsWith("$2a$") || hashed.startsWith("$2b$") || hashed.startsWith("$2y$")) {
    isValid = await bcrypt.compare(password, hashed);
    needsRehash = true;
  } else {
    // Argon2 verification
    isValid = await argon2.verify(hashed, password);
    needsRehash = argon2.needsRehash(hashed);
  }

  // Graceful upgrade on successful login
  if (isValid && needsRehash && userMeta) {
    const newHash = await hashPassword(password);
    try {
      const authDb = getAuthPrisma();
      if (userMeta.type === "USER") {
        await authDb.user.update({ where: { id: userMeta.id }, data: { passwordHash: newHash } });
      } else if (userMeta.type === "STUDENT") {
        await authDb.student.update({ where: { id: userMeta.id }, data: { password: newHash } });
      }
      logger.info({ userId: userMeta.id, type: userMeta.type }, "Upgraded password hash to Argon2id");
    } catch (err) {
      logger.warn({ err, userId: userMeta.id }, "Failed to upgrade password hash");
    }
  }

  return isValid;
}

// ═══════════════════════════════════════════
// Legacy JWT helpers (kept for backward compat)
// ═══════════════════════════════════════════

import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";

export function signToken(payload: TokenPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.ACCESS_TOKEN_PRIVATE_KEY, { algorithm: "RS256", expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): TokenPayload | null {
  const env = getEnv();
  try {
    const payload = jwt.verify(token, env.ACCESS_TOKEN_PUBLIC_KEY, { algorithms: ["RS256"] }) as TokenPayload;
    jwtVerificationTotal.labels({ algorithm: "RS256" }).inc();
    return payload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError && env.ACCESS_TOKEN_SECRET) {
      try {
        const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
        jwtVerificationTotal.labels({ algorithm: "HS256" }).inc();
        return payload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ═══════════════════════════════════════════
// Auth Middleware (Dual-Token Support)
// ═══════════════════════════════════════════

/**
 * Primary authentication middleware (Audience-Separated Cookie Architecture).
 * Reads:
 *   - On PLATFORM routes: "platform_access_token" cookie
 *   - On SCHOOL routes: "school_access_token" cookie
 *   - Authorization: Bearer header (any route, verified against aud claim)
 *
 * If a caller attempts to use only the opposite portal's cookie, rejects with 403 WRONG_PORTAL
 * and increments ssvm_wrong_portal_denials_total.
 * Legacy "auth_token" cookie is permanently deleted.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const isPlatformRoute = req.originalUrl?.includes("/platform") || req.baseUrl?.includes("/platform");
  const expectedAudience: "PLATFORM" | "SCHOOL" = isPlatformRoute ? "PLATFORM" : "SCHOOL";

  // Auth middleware reads only the cookie of the route's audience
  const audienceCookie = isPlatformRoute
    ? req.cookies?.platform_access_token
    : req.cookies?.school_access_token;

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  // Fallback to generic access_token if present (backward compatibility)
  const genericAccessToken = req.cookies?.access_token;

  const token = audienceCookie || bearerToken || genericAccessToken;

  if (!token) {
    // Cross-cookie check: did caller provide ONLY the opposite portal's cookie?
    const crossCookie = isPlatformRoute
      ? req.cookies?.school_access_token
      : req.cookies?.platform_access_token;

    if (crossCookie) {
      wrongPortalDenialsTotal.inc();
      res.status(403).json({
        success: false,
        error: "WRONG_PORTAL",
        code: "WRONG_PORTAL",
        message: `Forbidden — cross-portal cookie mismatch. Route requires ${expectedAudience} credentials.`,
      });
      return;
    }

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
    const { isTokenBlocklisted } = await import("../lib/redis");

    // Use jti if available (new tokens), fallback to full token hash for legacy
    let blocklistKey: string;
    if ("jti" in payload && payload.jti) {
      blocklistKey = payload.jti as string;
    } else {
      const { hashToken } = await import("../lib/tokens");
      blocklistKey = hashToken(token);
    }

    if (await isTokenBlocklisted(blocklistKey)) {
      res.status(401).json({ success: false, error: "Token has been revoked" });
      return;
    }

    const userId = (payload as any).userId || (payload as any).id || (payload as any).sub;
    const authDb = getAuthPrisma();
    
    let user: AuthRequest["user"] | null = null;

    if (payload.role === "STUDENT") {
      const student = await authDb.student.findUnique({
        where: { userId: userId },
        select: {
          id: true, admissionNo: true, name: true,
          isActive: true, schoolId: true
        }
      });
      if (student) {
        user = {
          id: student.id,
          userId: userId,
          studentId: student.id,
          email: student.admissionNo || "",
          name: student.name,
          role: "STUDENT",
          isActive: student.isActive,
          schoolId: student.schoolId,
          avatar: null,
          phone: null,
          branchId: null
        };
      }
    } else {
      user = await authDb.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, role: true,
          isActive: true, avatar: true, phone: true,
          schoolId: true, branchId: true,
        },
      });
    }

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: "Account not found or deactivated" });
      return;
    }

    // Phase 2C: Enforce mustChangePassword
    const userWithPasswordPolicy = await authDb.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true }
    });

    if (payload.schoolId && payload.schoolId !== user.schoolId && user.role !== "SUPER_ADMIN") {
      res.status(403).json({ success: false, error: "Token schoolId mismatch. Invalid token." });
      return;
    }

    if (!payload.schoolId && user.schoolId && user.role !== "SUPER_ADMIN") {
      res.status(401).json({ success: false, error: "Token missing schoolId. Invalid token." });
      return;
    }
    
    if (userWithPasswordPolicy?.mustChangePassword && req.path !== '/api/auth/change-password' && !req.path.includes('/logout')) {
      res.status(403).json({
        success: false,
        error: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your password before continuing.'
      });
      return;
    }

    const audClaim = ("aud" in payload ? payload.aud : undefined) as "PLATFORM" | "SCHOOL" | undefined;
    const mfaVerifiedClaim = "mfaVerified" in payload ? (payload as AccessTokenPayload).mfaVerified : undefined;

    if (payload.role === "SUPPORT_READONLY") {
      const supportPayload = payload as AccessTokenPayload;
      const safeMethods = ["GET", "HEAD", "OPTIONS"];
      const supportSession = supportPayload.sid
        ? SupportSessionService.getSession(supportPayload.sid)
        : null;

      // A support token is a distinct, school-scoped principal. Never rebuild it
      // with the database user's SUPER_ADMIN role. Until shared durable storage is
      // available, absence of the issuing process's live session fails closed.
      if (
        isPlatformRoute ||
        user.role !== "SUPER_ADMIN" ||
        audClaim !== "SCHOOL" ||
        !supportPayload.sid ||
        !supportPayload.jti ||
        !supportPayload.schoolId ||
        !supportSession ||
        supportSession.status !== "ACTIVE" ||
        supportSession.expiresAt.getTime() <= Date.now() ||
        supportSession.superAdminId !== user.id ||
        supportSession.schoolId !== supportPayload.schoolId ||
        supportSession.jti !== supportPayload.jti
      ) {
        res.status(401).json({
          success: false,
          error: "Support session is invalid, expired, revoked, or unavailable",
          code: "SUPPORT_SESSION_INVALID",
        });
        return;
      }

      req.user = {
        ...user,
        role: "SUPPORT_READONLY",
        schoolId: supportSession.schoolId,
        aud: "SCHOOL",
        mfaVerified: mfaVerifiedClaim,
        impersonated: true,
        originalUserId: user.id,
      };

      // Read-only is enforced centrally, even for routes that lack a role guard.
      if (!safeMethods.includes(req.method.toUpperCase())) {
        res.status(403).json({
          success: false,
          error: "Support sessions are read-only",
          code: "SUPPORT_READ_ONLY",
        });
        return;
      }
    } else if ('impersonated' in payload && payload.impersonated) {
      req.user = {
        ...user,
        aud: audClaim,
        mfaVerified: mfaVerifiedClaim,
        impersonated: true,
        originalUserId: payload.originalUserId
      };
    } else {
      req.user = {
        ...user,
        aud: audClaim,
        mfaVerified: mfaVerifiedClaim,
      };
    }

    if (isPlatformRoute && req.user?.aud && req.user.aud !== "PLATFORM") {
      wrongPortalDenialsTotal.inc();
      res.status(403).json({
        success: false,
        error: "WRONG_PORTAL",
        code: "WRONG_PORTAL",
        message: "Forbidden — invalid audience. Expected PLATFORM credentials",
      });
      return;
    }

    setAuthenticatedSchoolContext({
      id: req.user!.id,
      schoolId: req.user!.schoolId,
      role: req.user!.role,
      impersonated: req.user?.impersonated,
      originalUserId: req.user?.originalUserId,
    });
    
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
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }

    // Support principals may satisfy school-role guards only for safe reads.
    // They never receive SUPER_ADMIN role semantics or write access.
    const supportReadOnlyAllowed =
      req.user.role === "SUPPORT_READONLY" &&
      ["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase()) &&
      roles.some((role) => role !== "SUPER_ADMIN" && role !== "SUPPORT_READONLY");

    // Direct role match or SUPER_ADMIN platform override
    if (supportReadOnlyAllowed || req.user.role === "SUPER_ADMIN" || roles.includes(req.user.role)) {
      next();
      return;
    }

    wrongPortalDenialsTotal.inc();
    res.status(403).json({ success: false, error: "Forbidden — insufficient permissions" });
  };
}

export function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

export function requireAudience(requiredAudience: "PLATFORM" | "SCHOOL") {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    const tokenAud = req.user.aud;
    if (tokenAud !== requiredAudience) {
      wrongPortalDenialsTotal.inc();
      res.status(403).json({
        success: false,
        error: "WRONG_PORTAL",
        code: "WRONG_PORTAL",
        message: `Forbidden — invalid audience. Expected ${requiredAudience}`,
      });
      return;
    }
    next();
  };
}

export function requireAdmin() {
  return requireRole("ERP_ADMIN");
}

// Direct role guard: does NOT honor JIT delegation. Use for sensitive
// operations (user management, finance reversal) that must not be unlocked
// by a delegation grant.
export function requireDirectRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    if (roles.includes(req.user.role)) {
      next();
      return;
    }
    wrongPortalDenialsTotal.inc();
    res.status(403).json({ success: false, error: "Forbidden — insufficient permissions" });
  };
}

export function requireTeacherOrAdmin() {
  return requireRole("ERP_ADMIN", "TEACHER");
}

export function requireFinanceAdmin() {
  return requireRole("ERP_ADMIN", "ACCOUNTANT");
}

export function requireContentAdmin() {
  return requireRole("ERP_ADMIN", "WEBSITE_ADMIN");
}

export function requireHRAdmin() {
  return requireRole("ERP_ADMIN", "HR");
}

export function requireAcademicAdmin() {
  return requireRole("ERP_ADMIN");
}

export function requireOperationsAdmin(...roles: string[]) {
  return requireRole("ERP_ADMIN", ...roles);
}

export function requireLibraryAdmin() {
  return requireRole("ERP_ADMIN", "LIBRARIAN");
}

export function requireAdmissionsAdmin() {
  return requireRole("ERP_ADMIN", "RECEPTIONIST");
}

export function requireCommunicationsAdmin() {
  return requireRole("ERP_ADMIN", "RECEPTIONIST", "HR");
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
  const isPlatformRoute = req.originalUrl?.includes("/platform") || req.baseUrl?.includes("/platform");
  const audienceCookie = isPlatformRoute
    ? req.cookies?.platform_access_token
    : req.cookies?.school_access_token;
  const genericAccessToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = audienceCookie || genericAccessToken || bearerToken;

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

// ═══════════════════════════════════════════
// IP Allowlisting
// ═══════════════════════════════════════════

export function requireAllowedIp() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = req.ip || req.headers["x-forwarded-for"]?.toString() || "";
    const allowedIps = (process.env.SUPER_ADMIN_ALLOWED_IPS || "").split(",").map(ip => ip.trim()).filter(Boolean);

    if (allowedIps.length === 0) {
      next(); // Fail open if not configured
      return;
    }

    if (allowedIps.includes(clientIp)) {
      next();
      return;
    }

    const authReq = req as AuthRequest;
    if (authReq.user) {
      const { logSecurityEvent } = await import("../lib/audit");
      await logSecurityEvent({
        userId: authReq.user.id,
        eventType: "UNAUTHORIZED_IP_ACCESS",
        severity: "HIGH",
        ipAddress: clientIp,
        metadata: { path: req.originalUrl }
      });
    }

    res.status(403).json({ success: false, error: "Access denied from this IP address" });
  };
}
