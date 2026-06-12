import prisma from "../lib/prisma";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// Expired Token Cleanup Job
// ═══════════════════════════════════════════

/**
 * Deletes expired and revoked refresh tokens from the database.
 * Runs on server startup and every 24 hours.
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null }, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    if (result.count > 0) {
      logger.info({ deleted: result.count }, "Cleaned up expired/revoked refresh tokens");
    }
  } catch (err) {
    logger.error({ err }, "Failed to cleanup expired tokens");
  }
}

/**
 * Deletes expired and used OTPs older than 1 hour.
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    const result = await prisma.oTP.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() }, createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
          { verified: true, createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
        ],
      },
    });

    if (result.count > 0) {
      logger.info({ deleted: result.count }, "Cleaned up expired/verified OTPs");
    }
  } catch (err) {
    logger.error({ err }, "Failed to cleanup expired OTPs");
  }
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup scheduler. Runs immediately then every 24 hours.
 */
export function startTokenCleanupScheduler(): void {
  // Run immediately on startup
  cleanupExpiredTokens();
  cleanupExpiredOTPs();

  // Then every 24 hours
  cleanupInterval = setInterval(() => {
    cleanupExpiredTokens();
    cleanupExpiredOTPs();
  }, 24 * 60 * 60 * 1000);

  logger.info("Token cleanup scheduler started (runs every 24h)");
}

/**
 * Stop the cleanup scheduler (for graceful shutdown).
 */
export function stopTokenCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info("Token cleanup scheduler stopped");
  }
}
