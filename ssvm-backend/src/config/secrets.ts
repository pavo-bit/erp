import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import logger from "../lib/logger";

/**
 * AWS Secrets Manager Loader
 * 
 * On startup: fetches a single JSON secret named by AWS_SECRETS_MANAGER_SECRET_NAME
 * (default: "ssvm/production") and merges the key-value pairs into process.env
 * BEFORE any other module reads env vars.
 * 
 * Local dev fallback: if AWS_SECRETS_MANAGER_SECRET_NAME is unset, secrets are
 * loaded from .env as today (no-op here, dotenv/config handles it in index.ts).
 * 
 * Cache: 12-hour in-memory TTL. A Redis pub/sub signal on channel
 * "ssvm:secrets:refresh" triggers immediate re-fetch for live rotation.
 */

let cachedSecrets: Record<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Fetch secrets from AWS Secrets Manager and merge into process.env.
 * Must be called BEFORE getEnv() in the application startup sequence.
 */
export async function loadSecretsFromAWS(): Promise<void> {
  const secretName = process.env.AWS_SECRETS_MANAGER_SECRET_NAME;

  if (!secretName) {
    // Local dev fallback: no Secrets Manager configured, rely on .env
    console.log("ℹ️  AWS_SECRETS_MANAGER_SECRET_NAME not set — using .env for secrets");
    return;
  }

  const region = process.env.AWS_REGION || "ap-south-1";

  try {
    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no SecretString value`);
    }

    const secrets: Record<string, string> = JSON.parse(response.SecretString);
    cachedSecrets = secrets;
    cacheTimestamp = Date.now();

    // Merge into process.env — secrets from AWS take precedence over .env
    let mergedCount = 0;
    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === "string" && value.length > 0) {
        process.env[key] = value;
        mergedCount++;
      }
    }

    console.log(`✅ Loaded ${mergedCount} secrets from AWS Secrets Manager (${secretName})`);
  } catch (error) {
    console.error(`❌ Failed to load secrets from AWS Secrets Manager (${secretName}):`);
    console.error(error instanceof Error ? error.message : error);

    // In production, this is fatal — cannot start without secrets
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: Cannot start in production without AWS Secrets Manager access");
      process.exit(1);
    }

    // In dev/test, fall through to .env
    console.warn("⚠️  Falling back to .env secrets for non-production environment");
  }
}

/**
 * Refresh cached secrets from AWS Secrets Manager.
 * Called either by the 12-hour cache TTL or by Redis pub/sub signal.
 */
export async function refreshSecrets(): Promise<void> {
  const secretName = process.env.AWS_SECRETS_MANAGER_SECRET_NAME;
  if (!secretName) return;

  const region = process.env.AWS_REGION || "ap-south-1";

  try {
    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no SecretString value on refresh`);
    }

    const secrets: Record<string, string> = JSON.parse(response.SecretString);
    cachedSecrets = secrets;
    cacheTimestamp = Date.now();

    // Merge updated values
    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === "string" && value.length > 0) {
        process.env[key] = value;
      }
    }

    logger.info("Secrets refreshed from AWS Secrets Manager");
  } catch (error) {
    logger.error({ err: error }, "Failed to refresh secrets from AWS Secrets Manager");
    // Do NOT crash on refresh failure — continue with cached/existing values
  }
}

/**
 * Check if secrets cache is stale and needs refresh.
 */
export function isCacheStale(): boolean {
  if (!cachedSecrets) return true;
  return Date.now() - cacheTimestamp > CACHE_TTL_MS;
}

/**
 * Setup Redis pub/sub listener for immediate secret refresh signals.
 * Call this after Redis is connected.
 */
export async function setupSecretsRefreshListener(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || !process.env.AWS_SECRETS_MANAGER_SECRET_NAME) return;

  try {
    // Dynamic import to avoid breaking if ioredis isn't available
    const { default: Redis } = await import("ioredis");
    const subscriber = new Redis(redisUrl);

    subscriber.subscribe("ssvm:secrets:refresh", (err) => {
      if (err) {
        logger.error({ err }, "Failed to subscribe to ssvm:secrets:refresh channel");
        return;
      }
      logger.info("Subscribed to ssvm:secrets:refresh channel for live secret rotation");
    });

    subscriber.on("message", async (channel, message) => {
      if (channel === "ssvm:secrets:refresh") {
        logger.info({ message }, "Received secret refresh signal");
        await refreshSecrets();
      }
    });
  } catch (error) {
    logger.warn({ err: error }, "Could not setup secrets refresh listener — Redis may not be available");
  }
}

/**
 * Periodic cache refresh (12-hour interval).
 * Call this once during startup.
 */
export function startPeriodicRefresh(): void {
  if (!process.env.AWS_SECRETS_MANAGER_SECRET_NAME) return;

  setInterval(async () => {
    if (isCacheStale()) {
      logger.info("Secrets cache stale — refreshing from AWS Secrets Manager");
      await refreshSecrets();
    }
  }, CACHE_TTL_MS);
}
