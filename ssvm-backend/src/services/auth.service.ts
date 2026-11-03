import prisma from '../lib/prisma';

import crypto from "crypto";
import { Request } from "express";
import { hashToken, generateRefreshToken, verifyRefreshToken } from "../lib/tokens";
import { generateDeviceFingerprint, validateDeviceFingerprint } from "../utils/device-fingerprint";
import { logSecurityEvent } from "../lib/audit";
import logger from "../lib/logger";


// ═══════════════════════════════════════════
// Auth Service (GAP 10 — Session Security)
// ═══════════════════════════════════════════
// Refresh token rotation with reuse detection.
// If a previously-used token is presented again:
//   1. The entire token family is revoked (all tokens in the chain)
//   2. A SUSPICIOUS_REUSE security event is logged
//   3. User must re-authenticate
//
// Token family = all tokens derived from the same initial login.

const MAX_SESSIONS_PER_USER: Record<string, number> = {
  SUPER_ADMIN: 5,
  ERP_ADMIN: 5,
  ADMIN: 5,
  TEACHER: 5,
  STUDENT: 3,
  PARENT: 3,
  default: 5,
};

export class AuthService {
  /**
   * Create a new refresh token and store it in the database.
   * Returns the raw token (to set in cookie) and the family ID.
   */
  static async createRefreshToken(
    userId: string,
    req: Request,
    familyId?: string
  ): Promise<{ token: string; familyId: string }> {
    const { token, jti } = generateRefreshToken(userId);
    const tokenHash = hashToken(token);
    const deviceFp = generateDeviceFingerprint(req);
    const family = familyId || crypto.randomUUID();

    // Enforce session limits
    const userRole = ((req as any).user?.role || "default") as string;
    const maxSessions = MAX_SESSIONS_PER_USER[userRole] || MAX_SESSIONS_PER_USER.default;
    await this.enforceSessionLimit(userId, maxSessions);

    await prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        familyId: family,
        deviceFingerprint: deviceFp,
        isRevoked: false,
      },
    });

    return { token, familyId: family };
  }

  /**
   * Rotate a refresh token.
   * 1. Verify the old token
   * 2. Check for reuse (if old token is already revoked → revoke entire family)
   * 3. Issue a new token in the same family
   * 4. Revoke the old token
   */
  static async rotateRefreshToken(
    oldToken: string,
    req: Request
  ): Promise<{ newToken: string; userId: string } | { error: string; statusCode: number }> {
    // Verify JWT structure
    const payload = verifyRefreshToken(oldToken);
    if (!payload) {
      return { error: "Invalid or expired refresh token", statusCode: 401 };
    }

    const tokenHash = hashToken(oldToken);

    // Find the stored token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (!storedToken) {
      return { error: "Refresh token not found", statusCode: 401 };
    }

    // ── REUSE DETECTION ──
    // If the token is already revoked, someone is trying to reuse a rotated token.
    // This indicates the token may have been stolen. Revoke the ENTIRE family.
    if (storedToken.isRevoked || storedToken.revokedAt) {
      logger.fatal(
        { userId: storedToken.userId, familyId: storedToken.familyId, tokenId: storedToken.id },
        "REFRESH TOKEN REUSE DETECTED — revoking entire token family"
      );

      // Revoke ALL tokens in this family
      if (storedToken.familyId) {
        await prisma.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { isRevoked: true, revokedAt: new Date() },
        });
      }

      // Log security event
      await logSecurityEvent({
        userId: storedToken.userId,
        eventType: "REFRESH_TOKEN_REUSE",
        severity: "CRITICAL",
        ipAddress: req.ip || undefined,
        metadata: {
          familyId: storedToken.familyId,
          originalIp: storedToken.ipAddress,
          currentIp: req.ip,
        },
      });

      return { error: "Token reuse detected. Please log in again.", statusCode: 401 };
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      return { error: "Refresh token expired", statusCode: 401 };
    }

    // Validate device fingerprint
    const currentFp = generateDeviceFingerprint(req);
    if (!validateDeviceFingerprint(storedToken.deviceFingerprint, currentFp)) {
      logger.warn(
        { userId: storedToken.userId, storedFp: storedToken.deviceFingerprint?.substring(0, 8), currentFp: currentFp.substring(0, 8) },
        "Device fingerprint mismatch during token refresh"
      );

      // Don't revoke the family — just log a warning and reject this attempt
      // The user may have legitimately changed networks/browsers
      await logSecurityEvent({
        userId: storedToken.userId,
        eventType: "DEVICE_FINGERPRINT_MISMATCH",
        severity: "MEDIUM",
        ipAddress: req.ip || undefined,
        metadata: { familyId: storedToken.familyId },
      });

      return { error: "Device verification failed. Please log in again.", statusCode: 401 };
    }

    // ── ROTATE: Revoke old, issue new in same family ──
    const { token: newToken, familyId } = await this.createRefreshToken(
      storedToken.userId,
      req,
      storedToken.familyId || undefined
    );

    // Mark old token as revoked and record its replacement
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedBy: hashToken(newToken),
      },
    });

    return { newToken, userId: storedToken.userId };
  }

  /**
   * Revoke a single refresh token (logout from one device).
   */
  static async revokeToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await prisma.refreshToken.updateMany({
      where: { token: tokenHash },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  /**
   * Revoke all refresh tokens for a user (logout everywhere).
   */
  static async revokeAllTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  /**
   * Enforce maximum concurrent sessions per user.
   * Revokes the oldest sessions when the limit is exceeded.
   */
  private static async enforceSessionLimit(userId: string, maxSessions: number): Promise<void> {
    const activeSessions = await prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    });

    if (activeSessions.length >= maxSessions) {
      // Revoke the oldest sessions to make room
      const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - maxSessions + 1);
      const idsToRevoke = sessionsToRevoke.map((s) => s.id);

      await prisma.refreshToken.updateMany({
        where: { id: { in: idsToRevoke } },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      logger.info(
        { userId, revoked: idsToRevoke.length, max: maxSessions },
        "Revoked oldest sessions to enforce limit"
      );
    }
  }

  /**
   * Get active sessions for a user (for session management UI).
   */
  static async getActiveSessions(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        deviceFingerprint: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
