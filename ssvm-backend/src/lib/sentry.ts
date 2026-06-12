import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { getEnv } from "../config/env";
import logger from "./logger";

export function initSentry() {
  const env = getEnv();

  if (!env.SENTRY_DSN) {
    logger.warn("SENTRY_DSN not provided — skipping Sentry initialization");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
    environment: env.NODE_ENV,
  });

  logger.info("Sentry initialized");
}
