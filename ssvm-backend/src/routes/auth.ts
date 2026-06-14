import { Router, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, hashPassword, verifyPassword, signToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validators/schemas";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generate2FAPendingToken,
  verify2FAPendingToken,
  hashToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "../lib/tokens";
import { getEnv } from "../config/env";
import crypto from "crypto";
import { injectCsrfToken } from "../middleware/csrf";
import { logAuthEvent } from "../lib/authEventLogger";

const router = Router();

// ═══════════════════════════════════════════
// Helper: Issue token pair and set cookies
// ═══════════════════════════════════════════

export async function issueTokenPair(
  res: Response,
  user: { id: string; email: string; role: string; name: string; schoolId?: string | null; branchId?: string | null },
  req: { ip?: string; headers: Record<string, unknown> },
  options?: { family?: string; replacedBy?: string }
): Promise<void> {
  // We will generate the access token later after session is resolved

  // Generate refresh token (7d)
  const { token: refreshToken, jti } = generateRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);

  // Parse expiry for DB storage
  const env = getEnv();
  const expiryMatch = env.REFRESH_TOKEN_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  let expiryMs = 30 * 24 * 60 * 60 * 1000; // default 30d
  if (expiryMatch) {
    const val = parseInt(expiryMatch[1], 10);
    const unit = expiryMatch[2];
    if (unit === "s") expiryMs = val * 1000;
    else if (unit === "m") expiryMs = val * 60 * 1000;
    else if (unit === "h") expiryMs = val * 3600 * 1000;
    else if (unit === "d") expiryMs = val * 86400 * 1000;
  }

  const ipAddress = typeof req.ip === "string" ? req.ip : undefined;
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 500) : undefined;
  const deviceFingerprint = typeof req.headers["x-device-fingerprint"] === "string" 
      ? req.headers["x-device-fingerprint"] 
      : crypto.createHash('sha256').update(`${ipAddress || ''}-${userAgent || ''}`).digest('hex');
  const family = options?.family || crypto.randomUUID();

  // Store refresh token hash in DB
  await prisma.refreshToken.create({
    data: {
      token: tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + expiryMs),
      ipAddress,
      userAgent,
    },
  });

  // Track session and Concurrency Limits
  const absoluteExpiryMs = 90 * 24 * 60 * 60 * 1000; // 90 days
  let sessionId = crypto.randomUUID() as string;

  const existingSession = await prisma.userSession.findFirst({
    where: { userId: user.id, deviceFingerprint }
  });
  
  if (existingSession) {
    sessionId = existingSession.sessionId;
    await prisma.userSession.update({
      where: { id: existingSession.id },
      data: { lastSeen: new Date(), ipAddress, isActive: true, refreshFamily: family, expiresAt: new Date(Date.now() + absoluteExpiryMs) }
    });
  } else {
    await prisma.userSession.create({
      data: { userId: user.id, sessionId, refreshFamily: family, deviceFingerprint, ipAddress, lastSeen: new Date(), isActive: true, expiresAt: new Date(Date.now() + absoluteExpiryMs) }
    });
  }

  // Enforce Session Concurrency Limits
  let maxSessions = 3; // Default
  if (user.role === "STUDENT") maxSessions = 3;
  else if (user.role === "PARENT" || user.role === "GUARDIAN") maxSessions = 5;
  else if (user.role === "TEACHER") maxSessions = 5;
  else if (["ADMIN", "ERP_ADMIN", "SUPER_ADMIN", "WEBSITE_ADMIN"].includes(user.role)) maxSessions = 10;

  const activeSessions = await prisma.userSession.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { lastSeen: 'asc' }
  });

  if (activeSessions.length > maxSessions) {
    const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - maxSessions);
    await prisma.userSession.updateMany({
      where: { id: { in: sessionsToRevoke.map(s => s.id) } },
      data: { isActive: false }
    });
  }

  // Generate access token (15m)
  const { token: accessToken, jti: accessJti } = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    schoolId: user.schoolId,
    branchId: user.branchId,
    sid: sessionId,
  });


  // Set cookies
  res.cookie("access_token", accessToken, getAccessTokenCookieOptions());
  res.cookie("refresh_token", refreshToken, getRefreshTokenCookieOptions());

  // Also set legacy cookie for backward compat with existing frontend
  const legacyToken = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
  res.cookie("auth_token", legacyToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production" && (env.FRONTEND_URL?.startsWith("https") ?? false),
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

// ═══════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════

router.post("/login", validate(loginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { guardian: { include: { students: true } }, alumni: true },
    });

    if (!user) { 
      await logAuthEvent(prisma, { eventType: "LOGIN_FAILURE", req, success: false, failReason: "user_not_found", metadata: { email } });
      res.status(401).json({ success: false, error: "Invalid credentials" }); 
      return; 
    }
    if (!user.isActive) { 
      await logAuthEvent(prisma, { eventType: "LOGIN_FAILURE", userId: user.id, schoolId: user.schoolId || undefined, req, success: false, failReason: "account_disabled", metadata: { email } });
      res.status(403).json({ success: false, error: "Account deactivated" }); 
      return; 
    }

    const valid = await verifyPassword(password, (user as any).passwordHash);
    if (!valid) {
      logger.warn({ email }, "Failed login attempt");
      await logAuthEvent(prisma, { eventType: "LOGIN_FAILURE", userId: user.id, schoolId: user.schoolId || undefined, req, success: false, failReason: "invalid_credentials", metadata: { email } });
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const { passwordHash: _, ...userWithoutPw } = user as any;

    if (user.twoFactorEnabled) {
      // Issue a short-lived pending token just for 2FA validation
      const pendingToken = generate2FAPendingToken(user.id);
      res.json({ 
        success: true, 
        data: { requires2FA: true, pendingToken, message: "Two-Factor Authentication required" } 
      });
      return;
    }

    // Issue access + refresh token pair
    await issueTokenPair(res, user, req);

    await logAuthEvent(prisma, { eventType: "LOGIN_SUCCESS", userId: user.id, schoolId: user.schoolId || undefined, req, success: true });
    logger.info({ userId: user.id, role: user.role }, "User logged in");
    res.json({ success: true, data: { user: userWithoutPw } });
  } catch (e) {
    logger.error({ err: e }, "Login error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// POST /api/auth/student/login
// ═══════════════════════════════════════════

router.post("/student/login", async (req: AuthRequest, res: Response) => {
  try {
    const { admissionNo, password } = req.body;

    if (!admissionNo || !password) {
      res.status(400).json({ success: false, error: "Admission number and password required" });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { admissionNo },
      include: { school: true },
    });

    if (!student) { 
      await logAuthEvent(prisma, { eventType: "LOGIN_FAILURE", req, success: false, failReason: "user_not_found", metadata: { admissionNo } });
      res.status(401).json({ success: false, error: "Invalid admission number" }); 
      return; 
    }
    if (!student.isActive) { 
      await logAuthEvent(prisma, { eventType: "LOGIN_FAILURE", userId: student.id, schoolId: student.schoolId, req, success: false, failReason: "account_disabled", metadata: { admissionNo } });
      res.status(403).json({ success: false, error: "Student account deactivated" }); 
      return; 
    }
    if (!student.password) { 
      await logAuthEvent(prisma, { eventType: "LOGIN_FAILURE", userId: student.id, schoolId: student.schoolId, req, success: false, failReason: "invalid_credentials", metadata: { admissionNo } });
      res.status(401).json({ success: false, error: "Password not set for this student" }); 
      return; 
    }

    const valid = await verifyPassword(password, student.password);
    if (!valid) {
      logger.warn({ admissionNo }, "Failed student login attempt");
      await logAuthEvent(prisma, { eventType: "LOGIN_FAILURE", userId: student.id, schoolId: student.schoolId, req, success: false, failReason: "invalid_credentials", metadata: { admissionNo } });
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    // Issue tokens using standard process
    await issueTokenPair(res, {
      id: student.id,
      email: student.admissionNo || "",
      role: "STUDENT",
      name: student.name,
      schoolId: student.schoolId,
    }, req);

    const { password: _, ...studentWithoutPw } = student;
    logger.info({ studentId: student.id }, "Student logged in via Payment Portal");
    await logAuthEvent(prisma, { eventType: "LOGIN_SUCCESS", userId: student.id, schoolId: student.schoolId, req, success: true });
    res.json({ success: true, data: { user: { ...studentWithoutPw, role: "STUDENT" } } });
  } catch (e) {
    logger.error({ err: e }, "Student login error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// POST /api/auth/refresh — Token Rotation
// ═══════════════════════════════════════════

router.post("/refresh", async (req: AuthRequest, res: Response) => {
  try {
    const refreshTokenCookie = req.cookies?.refresh_token;

    if (!refreshTokenCookie) {
      res.status(401).json({ success: false, error: "No refresh token provided" });
      return;
    }

    // Verify JWT structure
    const payload = verifyRefreshToken(refreshTokenCookie);
    if (!payload) {
      await logAuthEvent(prisma, { eventType: "TOKEN_REFRESH_FAILURE", req, success: false, failReason: "invalid_jwt" });
      res.status(401).json({ success: false, error: "Invalid refresh token" });
      return;
    }

    // Look up the hashed token in DB
    const tokenHash = hashToken(refreshTokenCookie);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true, schoolId: true, branchId: true } } },
    });

    if (!storedToken) {
      await logAuthEvent(prisma, { eventType: "TOKEN_REFRESH_FAILURE", req, success: false, failReason: "token_not_found_in_db" });
      res.status(401).json({ success: false, error: "Invalid refresh token" });
      return;
    }

    // Reuse Attack Detection
    if (storedToken.revokedAt) {
      logger.warn({ userId: payload.userId }, "Refresh token reuse detected — revoking all user tokens");
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      // Also log SystemLog (not securityAuditLog)
      const { logSecurityEvent } = await import("../lib/audit");
      await logSecurityEvent({
        userId: storedToken.userId,
        eventType: "REFRESH_TOKEN_REUSE",
        severity: "CRITICAL",
        ipAddress: typeof req.ip === "string" ? req.ip : undefined,
        metadata: { tokenHash }
      });
      // Invalidate the sessions for this family/user
      await prisma.userSession.updateMany({
        where: { userId: storedToken.userId },
        data: { isActive: false }
      });
      await logAuthEvent(prisma, { eventType: "SUSPICIOUS_REUSE", userId: storedToken.userId, req, success: false, failReason: "family_reuse_detected" });

      res.status(401).json({ success: false, error: "Invalid refresh token — please log in again" });
      return;
    }

    // Check if expired
    if (storedToken.expiresAt < new Date()) {
      await logAuthEvent(prisma, { eventType: "TOKEN_REFRESH_FAILURE", userId: storedToken.userId, req, success: false, failReason: "token_expired" });
      res.status(401).json({ success: false, error: "Refresh token expired — please log in again" });
      return;
    }

    // Check user is still active
    if (!storedToken.user || !(storedToken.user as any).isActive) {
      await logAuthEvent(prisma, { eventType: "TOKEN_REFRESH_FAILURE", userId: storedToken.userId, req, success: false, failReason: "account_disabled" });
      res.status(401).json({ success: false, error: "Account deactivated" });
      return;
    }

    // ─── Token Rotation ───
    // 1. Revoke old refresh token
    const newFamilyTag = `rotated_${crypto.randomUUID()}`;
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // 2. Issue new token pair
    await issueTokenPair(res, storedToken.user as any, req);

    logger.info({ userId: storedToken.userId }, "Token refreshed");
    await logAuthEvent(prisma, { eventType: "TOKEN_REFRESH", userId: storedToken.userId, req, success: true });
    res.json({ success: true, data: { message: "Token refreshed" } });
  } catch (e) {
    logger.error({ err: e }, "Token refresh error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// POST /api/auth/logout — Server-Side Revocation
// ═══════════════════════════════════════════

router.post("/logout", async (req: AuthRequest, res: Response) => {
  try {
    const refreshTokenCookie = req.cookies?.refresh_token;
    const accessTokenCookie = req.cookies?.access_token;
    const legacyTokenCookie = req.cookies?.auth_token;

    // Revoke the refresh token in DB
    if (refreshTokenCookie) {
      const tokenHash = hashToken(refreshTokenCookie);
      await prisma.refreshToken.updateMany({
        where: { token: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    // Blocklist current access tokens and retrieve Session ID
    const { blocklistAccessToken } = await import("../lib/redis");
    let sid: string | null = null;

    if (accessTokenCookie) {
      const { verifyAccessToken } = await import("../lib/tokens");
      const payload = verifyAccessToken(accessTokenCookie);
      if (payload && "jti" in payload) {
        await blocklistAccessToken(payload.jti as string);
        if ("sid" in payload) sid = payload.sid as string;
      } else {
        await blocklistAccessToken(hashToken(accessTokenCookie));
      }
    }

    if (legacyTokenCookie) await blocklistAccessToken(hashToken(legacyTokenCookie));

    // Deactivate UserSession
    if (sid) {
      await prisma.userSession.updateMany({
        where: { sessionId: sid },
        data: { isActive: false }
      });
    }

    // Clear ALL auth cookies
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/auth" });
    res.clearCookie("auth_token", { path: "/" }); // legacy

    if (accessTokenCookie) {
      // Decode user context from token if possible for the log
      const { verifyAccessToken } = await import("../lib/tokens");
      const payload = verifyAccessToken(accessTokenCookie);
      if (payload && typeof payload === 'object' && 'userId' in payload) {
        await logAuthEvent(prisma, { eventType: "LOGOUT", userId: payload.userId as string, req, success: true });
      } else {
        await logAuthEvent(prisma, { eventType: "LOGOUT", req, success: true });
      }
    } else {
      await logAuthEvent(prisma, { eventType: "LOGOUT", req, success: true });
    }

    res.json({ success: true, data: { message: "Logged out successfully" } });
  } catch (e) {
    logger.error({ err: e }, "Logout error");
    // Still clear cookies even on DB error
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/auth" });
    res.clearCookie("auth_token", { path: "/" });
    res.json({ success: true, data: { message: "Logged out" } });
  }
});

// ═══════════════════════════════════════════
// POST /api/auth/logout/all — Revoke All Sessions
// ═══════════════════════════════════════════

router.post("/logout/all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.userSession.updateMany({
      where: { userId: req.user!.id, isActive: true },
      data: { isActive: false }
    });

    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/auth" });
    res.clearCookie("auth_token", { path: "/" });

    logger.info({ userId: req.user!.id, revokedCount: result.count }, "All sessions revoked");
    res.json({ success: true, data: { message: `${result.count} session(s) revoked` } });
  } catch (e) {
    logger.error({ err: e }, "Logout all error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// GET /api/auth/sessions — List Active Sessions
// ═══════════════════════════════════════════

router.get("/sessions", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: req.user!.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: sessions });
  } catch (e) {
    logger.error({ err: e }, "List sessions error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// DELETE /api/auth/sessions/:id — Revoke Specific Session
// ═══════════════════════════════════════════

router.delete("/sessions/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { id: req.params.id as string, userId: req.user!.id },
      data: { revokedAt: new Date() },
    });

    res.json({ success: true, data: { message: "Session revoked" } });
  } catch (e) {
    logger.error({ err: e }, "Revoke session error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// POST /api/auth/revoke-session — ERP Admin Forced Logout
// ═══════════════════════════════════════════

router.post("/revoke-session", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: "User ID is required" });
      return;
    }

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    logger.info({ adminId: req.user!.id, targetUserId: userId }, "Admin force-revoked user sessions");
    res.json({ success: true, data: { message: "All sessions revoked for user" } });
  } catch (e) {
    logger.error({ err: e }, "Force revoke session error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// POST /api/auth/alumni/register (public)
// ═══════════════════════════════════════════

router.post("/alumni/register", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, phone, batch, currentRole, company } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: "Email, password, and name are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) { res.status(409).json({ success: false, error: "Email already registered" }); return; }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        passwordHash: hashed,
        name,
        role: "ALUMNI",
        phone: phone || null,
        alumni: {
          create: {
            batch: batch || "",
            currentRole: currentRole || null,
            company: company || null,
          }
        }
      },
      include: { alumni: true }
    });

    // Issue token pair
    await issueTokenPair(res, user, req);

    const { passwordHash: _, ...userWithoutPw } = user as any;
    logger.info({ userId: user.id, role: user.role }, "New Alumni registered");
    res.status(201).json({ success: true, data: { user: userWithoutPw } });
  } catch (e) {
    logger.error({ err: e }, "Alumni register error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// POST /api/auth/register (admin only)
// ═══════════════════════════════════════════

router.post("/register", authenticate, requireRole("ADMIN"), validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role, phone, ...profileData } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ success: false, error: "Email already registered" }); return; }

    const hashed = await hashPassword(password);

    // For STUDENT role, create Student directly
    if (role === "STUDENT") {
      const finalAdmissionNo = profileData.admissionNo || `ADM${Math.floor(100000 + Math.random() * 900000)}`;
      const plainPassword = profileData.password || password || `SSVM@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedStudentPw = await hashPassword(plainPassword);

      const student = await prisma.student.create({
        data: {
          schoolId: req.user!.schoolId!,
          name,
          rollNo: profileData.rollNo || "",
          admissionNo: finalAdmissionNo,
          password: hashedStudentPw,
          sectionId: profileData.sectionId || null
        }
      });
      logger.info({ studentId: student.id, createdBy: req.user!.id }, "Student registered directly");
      res.status(201).json({ success: true, data: student });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email, passwordHash: hashed, name, role, phone: phone || null,
        schoolId: req.user!.schoolId || undefined,
        ...(role === "PARENT" && req.user!.schoolId ? { guardian: { create: { schoolId: req.user!.schoolId!, primaryName: profileData.primaryName || name, primaryPhone: profileData.primaryPhone || phone || "0000000000" } } } : {}),
        ...(role === "ALUMNI" ? { alumni: { create: { batch: profileData.batch || "", currentRole: profileData.currentRole || null, company: profileData.company || null, achievement: profileData.achievement || null } } } : {}),
      },
      include: { alumni: true },
    });
    const { passwordHash: _, ...safe } = user as any;
    logger.info({ userId: user.id, role: user.role, createdBy: req.user!.id }, "User registered");
    res.status(201).json({ success: true, data: safe });
  } catch (e) {
    logger.error({ err: e }, "Register error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════

router.get("/me", authenticate, injectCsrfToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, name: true, role: true, phone: true,
        avatar: true, isActive: true, lastLogin: true, createdAt: true,
        guardian: { include: { students: true } },
        alumni: true,
      },
    });
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    res.json({ success: true, data: user });
  } catch (e) {
    logger.error({ err: e }, "Me error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ═══════════════════════════════════════════
// GET /api/auth/events — Audit Log
// ═══════════════════════════════════════════

router.get("/events", authenticate, requireRole("SUPER_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, schoolId, eventType, from, to, page = "1", limit = "50" } = req.query;

    const where: any = {};
    if (userId) where.userId = String(userId);
    if (schoolId) where.schoolId = String(schoolId);
    if (eventType) where.eventType = String(eventType);
    
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [events, total] = await Promise.all([
      prisma.auth_events.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.auth_events.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (e) {
    logger.error({ err: e }, "Fetch auth events error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
