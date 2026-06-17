import "dotenv/config";
import "./lib/tracing"; // MUST be first import to ensure APM instruments everything else

import { loadSecretsFromAWS, startPeriodicRefresh, setupSecretsRefreshListener } from "./config/secrets";
import { validateEnvironment } from "./config/validate-env";

/**
 * Main application bootstrap sequence.
 * This ensures that AWS Secrets are fetched and injected into `process.env`
 * BEFORE any other application modules are imported and evaluated.
 */
async function bootstrap() {
  try {
    // 1. Fetch production secrets from AWS Secrets Manager
    await loadSecretsFromAWS();

    // 2. Validate the complete environment (with production-specific rules)
    validateEnvironment();

    // 3. Start the periodic background refresh (12-hour TTL)
    startPeriodicRefresh();

    // 4. Dynamically import the main application
    // This delayed import guarantees that modules like Prisma, Sentry, and Redis
    // use the fully populated process.env
    await import("./app");

    // 5. Setup Redis pub/sub listener for live secret rotation
    // Note: Redis must be initialized by the app first, so we do this after importing app
    await setupSecretsRefreshListener();

  } catch (error) {
    console.error("FATAL: Bootstrap sequence failed. Could not start application.");
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
