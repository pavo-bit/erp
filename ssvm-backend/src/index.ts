import "dotenv/config";
import "./lib/tracing";

import type { Server } from "node:http";

import { loadSecretsFromAWS, startPeriodicRefresh, setupSecretsRefreshListener } from "./config/secrets";
import { validateEnvironment } from "./config/validate-env";
import logger from "./lib/logger";

/**
 * Main process bootstrap. Importing app.ts is safe for tests and tooling;
 * process-wide services and sockets are started only here.
 */
async function bootstrap(): Promise<void> {
  await loadSecretsFromAWS();
  validateEnvironment();
  startPeriodicRefresh();

  const [
    { createApp },
    { getEnv },
    { initSentry },
    { disconnectRedis },
    { startWorkers },
    { startTokenCleanupScheduler, stopTokenCleanupScheduler },
    { closeQueues },
    { BackupService },
  ] = await Promise.all([
    import("./app"),
    import("./config/env"),
    import("./lib/sentry"),
    import("./lib/redis"),
    import("./jobs/worker"),
    import("./jobs/cleanupTokens"),
    import("./jobs/queue"),
    import("./services/backup.service"),
  ]);

  const env = getEnv();
  initSentry();
  const app = await createApp();

  const server: Server = app.listen(Number.parseInt(env.PORT, 10), "0.0.0.0", () => {
    logger.info(`🚀 SSVM ERP Backend running on http://localhost:${env.PORT}`);
    logger.info(`📡 API v1: http://localhost:${env.PORT}/api/v1`);
    logger.info(`📡 API (compat): http://localhost:${env.PORT}/api`);
    logger.info(`🏥 Health: http://localhost:${env.PORT}/api/health`);
    logger.info(`🔒 Security: helmet ✓ | rate-limit ✓ | cors ✓ | refresh-tokens ✓`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);

    startTokenCleanupScheduler();
    startWorkers();

    const dailyBackupInterval = setInterval(() => {
      logger.info("[Scheduler] Triggering daily database backup");
      BackupService.createDatabaseBackup(true).catch((err: unknown) => {
        logger.error({ err }, "[Scheduler] Daily backup failed");
      });
    }, 24 * 60 * 60 * 1000);

    const gracefulShutdown = (signal: string): void => {
      logger.info(`${signal} received — shutting down gracefully`);
      clearInterval(dailyBackupInterval);
      stopTokenCleanupScheduler();
      void (async () => {
        await closeQueues();
        await disconnectRedis();
        server.close((error) => {
          if (error) {
            logger.error({ error }, "Server close failed");
            process.exitCode = 1;
          } else {
            logger.info("Server closed");
          }
        });
      })().catch((error: unknown) => {
        logger.error({ error }, "Graceful shutdown failed");
        process.exitCode = 1;
        server.close();
      });
    };

    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
  });

  server.on("error", (error) => {
    logger.error({ error }, "HTTP server failed");
    process.exitCode = 1;
  });

  await setupSecretsRefreshListener();
}

bootstrap().catch((error: unknown) => {
  console.error("FATAL: Backend bootstrap failed.");
  console.error(error);
  process.exitCode = 1;
});
