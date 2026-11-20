import crypto from "crypto";
import { runWithTenantDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";
import { generateSupportToken } from "../lib/tokens";
import { createAuditLog } from "../lib/audit";
import { supportSessionsActive } from "../middleware/metrics";
import { blocklistAccessToken, getRedisClient, isRedisAvailable } from "../lib/redis";

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
  jti: string;
}

const SESSION_KEY_PREFIX = "ssvm:support:session:";
const SCHOOL_INDEX_PREFIX = "ssvm:support:sessions:school:";
const GLOBAL_INDEX_KEY = "ssvm:support:sessions:all";
const INDEX_TTL_SECONDS = 3 * 60 * 60;

class SupportSessionManager {
  private requireRedis() {
    const redis = getRedisClient();
    if (!isRedisAvailable() || !redis) {
      throw new Error("Support session storage is unavailable");
    }
    return redis;
  }

  private sessionKey(sessionId: string): string {
    return SESSION_KEY_PREFIX + sessionId;
  }

  private schoolIndexKey(schoolId: string): string {
    return SCHOOL_INDEX_PREFIX + schoolId;
  }

  private async persistRecord(session: SupportSessionRecord): Promise<void> {
    const redis = this.requireRedis();
    const ttl = Math.max(60, Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000) + 60);
    const schoolIndex = this.schoolIndexKey(session.schoolId);
    const multi = redis.multi();

    multi.set(this.sessionKey(session.id), JSON.stringify(session), "EX", ttl);
    if (session.status === "ACTIVE") {
      multi.zadd(schoolIndex, session.expiresAt.getTime(), session.id);
      multi.zadd(GLOBAL_INDEX_KEY, session.expiresAt.getTime(), session.id);
      multi.expire(schoolIndex, INDEX_TTL_SECONDS);
      multi.expire(GLOBAL_INDEX_KEY, INDEX_TTL_SECONDS);
    } else {
      multi.zrem(schoolIndex, session.id);
      multi.zrem(GLOBAL_INDEX_KEY, session.id);
    }

    const result = await multi.exec();
    if (!result || result.some(([error]) => error !== null)) {
      throw new Error("Failed to persist support session");
    }
  }

  private parseSession(raw: string | null): SupportSessionRecord | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SupportSessionRecord;
      if (
        !parsed ||
        typeof parsed.id !== "string" ||
        typeof parsed.schoolId !== "string" ||
        typeof parsed.superAdminId !== "string" ||
        typeof parsed.jti !== "string" ||
        !["ACTIVE", "REVOKED", "EXPIRED"].includes(parsed.status)
      ) {
        return null;
      }
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        expiresAt: new Date(parsed.expiresAt),
        revokedAt: parsed.revokedAt ? new Date(parsed.revokedAt) : null,
      };
    } catch (err) {
      logger.error({ err }, "Failed to parse persisted support session");
      return null;
    }
  }

  async createSession(params: {
    schoolId: string;
    superAdminId: string;
    superAdminEmail: string;
    reason: string;
    durationMinutes?: number;
  }): Promise<{ session: SupportSessionRecord; token: string }> {
    this.requireRedis();
    const duration = Math.min(Math.max(params.durationMinutes || 15, 5), 120);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);
    const sessionId = `supp_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

    const { token, jti } = generateSupportToken(
      {
        userId: params.superAdminId,
        email: params.superAdminEmail,
        name: "Platform Support",
        role: "SUPPORT_READONLY",
        schoolId: params.schoolId,
        aud: "SCHOOL",
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
      jti,
    };

    // Redis is the shared source of truth. Never issue a support token if the
    // session cannot be persisted for every backend replica to validate.
    await this.persistRecord(session);
    const activeCount = await this.getActiveSessionCount();
    supportSessionsActive.set(activeCount);

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

  async getSession(sessionId: string, now: Date = new Date()): Promise<SupportSessionRecord | null> {
    try {
      const redis = this.requireRedis();
      const session = this.parseSession(await redis.get(this.sessionKey(sessionId)));
      if (!session) return null;

      if (session.status === "ACTIVE" && now.getTime() >= session.expiresAt.getTime()) {
        session.status = "EXPIRED";
        await this.persistRecord(session);
        supportSessionsActive.set(await this.getActiveSessionCount());
      }
      return session;
    } catch (err) {
      // Security decision: storage failure is indistinguishable from an
      // unavailable session, so support access is denied by callers.
      logger.error({ err, sessionId }, "Support session lookup failed closed");
      return null;
    }
  }

  async revokeSession(sessionId: string, revokingUserId: string): Promise<SupportSessionRecord | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    if (session.status === "ACTIVE") {
      session.status = "REVOKED";
      session.revokedAt = new Date();
      await this.persistRecord(session);

      const remainingSeconds = Math.max(1, Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000));
      await blocklistAccessToken(session.jti, remainingSeconds);
      supportSessionsActive.set(await this.getActiveSessionCount());

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

  async getActiveSessionForSchool(schoolId: string): Promise<SupportSessionRecord | null> {
    try {
      const redis = this.requireRedis();
      const ids = await redis.zrangebyscore(this.schoolIndexKey(schoolId), Date.now(), "+inf");
      const sessions = await Promise.all(ids.map((id) => this.getSession(id)));
      return sessions
        .filter((session): session is SupportSessionRecord => session?.status === "ACTIVE")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
    } catch (err) {
      logger.error({ err, schoolId }, "School support-session index lookup failed closed");
      return null;
    }
  }

  async getActiveSessionCount(): Promise<number> {
    try {
      const redis = this.requireRedis();
      const ids = await redis.zrangebyscore(GLOBAL_INDEX_KEY, Date.now(), "+inf");
      const sessions = await Promise.all(ids.map((id) => this.getSession(id)));
      const count = sessions.filter((session) => session?.status === "ACTIVE").length;
      supportSessionsActive.set(count);
      return count;
    } catch (err) {
      logger.error({ err }, "Support-session count lookup failed");
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("SupportSessionService.clear is only available in test environments");
    }
    const redis = this.requireRedis();
    const patterns = [SESSION_KEY_PREFIX + "*", SCHOOL_INDEX_PREFIX + "*", GLOBAL_INDEX_KEY];
    for (const pattern of patterns) {
      if (pattern === GLOBAL_INDEX_KEY) {
        await redis.del(pattern);
        continue;
      }
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) await redis.del(...keys);
      } while (cursor !== "0");
    }
    supportSessionsActive.set(0);
  }
}

export const SupportSessionService = new SupportSessionManager();
