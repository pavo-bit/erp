import crypto from "crypto";
import { runWithTenantDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";
import { generateSupportToken } from "../lib/tokens";
import { createAuditLog } from "../lib/audit";
import { supportSessionsActive } from "../middleware/metrics";
import { blocklistAccessToken } from "../lib/redis";

export interface SupportSessionRecord {
  id: string;
  schoolId: string;
  superAdminId: string;
  superAdminEmail: string;
  reason: string;
  durationMinutes: number;
  createdAt: Date;
  expiresAt: Date;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  revokedAt?: Date | null;
  token?: string;
  jti?: string;
}

class SupportSessionManager {
  private sessions = new Map<string, SupportSessionRecord>();

  /**
   * Create and initiate a short-lived, audited read-only support session.
   */
  async createSession(params: {
    schoolId: string;
    superAdminId: string;
    superAdminEmail: string;
    reason: string;
    durationMinutes?: number;
  }): Promise<{ session: SupportSessionRecord; token: string }> {
    const duration = Math.min(Math.max(params.durationMinutes || 15, 5), 120);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);
    const sessionId = `supp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const { token, jti } = generateSupportToken(
      {
        userId: params.superAdminId,
        email: params.superAdminEmail,
        name: "Platform Support",
        role: "SUPPORT_READONLY",
        schoolId: params.schoolId,
        sid: sessionId,
      },
      duration
    );

    const session: SupportSessionRecord = {
      id: sessionId,
      schoolId: params.schoolId,
      superAdminId: params.superAdminId,
      superAdminEmail: params.superAdminEmail,
      reason: params.reason,
      durationMinutes: duration,
      createdAt: now,
      expiresAt,
      status: "ACTIVE",
      token,
      jti,
    };

    this.sessions.set(sessionId, session);
    supportSessionsActive.inc();

    // 1. Notify school through transactional system notification inside tenant transaction
    try {
      await runWithTenantDatabaseTransaction(params.schoolId, async (tx) => {
        await tx.notification.create({
          data: {
            schoolId: params.schoolId,
            type: "IN_APP",
            subject: "Platform Support Session Initiated",
            message: `A read-only platform support session was initiated by ${params.superAdminEmail}. Reason: "${params.reason}". Access expires at ${expiresAt.toISOString()}.`,
            status: "SENT",
          },
        });
      });
    } catch (err: unknown) {
      logger.warn({ err }, "Could not record in-app notification for support session initiation");
    }

    // 2. Record immutable audit log
    await createAuditLog({
      data: {
        schoolId: params.schoolId,
        userId: params.superAdminId,
        action: "SUPPORT_SESSION_INITIATED",
        entity: "SupportSession",
        entityId: sessionId,
        reason: params.reason,
        details: JSON.stringify({
          durationMinutes: duration,
          expiresAt: expiresAt.toISOString(),
          superAdminEmail: params.superAdminEmail,
        }),
      },
    });

    logger.info({ sessionId, schoolId: params.schoolId, duration }, "Support session initiated");

    return { session, token };
  }

  /**
   * Explicitly revoke an active support session before expiration.
   */
  async revokeSession(sessionId: string, revokingUserId: string): Promise<SupportSessionRecord | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (session.status === "ACTIVE") {
      session.status = "REVOKED";
      session.revokedAt = new Date();
      supportSessionsActive.dec();

      // Revoke token if jti is tracked
      if (session.jti) {
        const remainingSeconds = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
        try {
          await blocklistAccessToken(session.jti, remainingSeconds);
        } catch (err: unknown) {
          logger.warn({ err }, "Failed to blocklist support token");
        }
      }

      // Record audit log
      await createAuditLog({
        data: {
          schoolId: session.schoolId,
          userId: revokingUserId,
          action: "SUPPORT_SESSION_REVOKED",
          entity: "SupportSession",
          entityId: sessionId,
          reason: "Manual platform revocation",
        },
      });

      logger.info({ sessionId, schoolId: session.schoolId }, "Support session revoked");
    }

    return session;
  }

  /**
   * Retrieve active support session for a school, auto-reconciling expired sessions.
   */
  getActiveSessionForSchool(schoolId: string): SupportSessionRecord | null {
    const now = new Date();

    for (const session of this.sessions.values()) {
      if (session.schoolId === schoolId) {
        if (session.status === "ACTIVE") {
          if (now >= session.expiresAt) {
            session.status = "EXPIRED";
            supportSessionsActive.dec();
            continue;
          }
          return session;
        }
      }
    }

    return null;
  }

  /**
   * Retrieve a specific support session by ID.
   */
  getSession(sessionId: string): SupportSessionRecord | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.status === "ACTIVE" && new Date() >= session.expiresAt) {
      session.status = "EXPIRED";
      supportSessionsActive.dec();
    }

    return session;
  }

  /**
   * Testing helper to reset active sessions.
   */
  clear(): void {
    this.sessions.clear();
    supportSessionsActive.set(0);
  }
}

export const SupportSessionService = new SupportSessionManager();
