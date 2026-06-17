import { z } from "zod";

/**
 * Comprehensive startup environment validation.
 * Extends the base env.ts schema with production-specific rules.
 * 
 * Key difference from env.ts: this file validates SEMANTIC correctness
 * (e.g., Razorpay keys must have the right prefix in production),
 * while env.ts validates structural presence.
 * 
 * Called AFTER secrets are loaded from AWS Secrets Manager.
 */

const productionSecretsSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // JWT RSA Keys
  ACCESS_TOKEN_PRIVATE_KEY: z.string().refine(
    val => val.includes("BEGIN") && val.includes("PRIVATE KEY"),
    "ACCESS_TOKEN_PRIVATE_KEY must be a valid PEM-formatted RSA private key"
  ),
  ACCESS_TOKEN_PUBLIC_KEY: z.string().refine(
    val => val.includes("BEGIN") && val.includes("PUBLIC KEY"),
    "ACCESS_TOKEN_PUBLIC_KEY must be a valid PEM-formatted RSA public key"
  ),
  REFRESH_TOKEN_PRIVATE_KEY: z.string().refine(
    val => val.includes("BEGIN") && val.includes("PRIVATE KEY"),
    "REFRESH_TOKEN_PRIVATE_KEY must be a valid PEM-formatted RSA private key"
  ),
  REFRESH_TOKEN_PUBLIC_KEY: z.string().refine(
    val => val.includes("BEGIN") && val.includes("PUBLIC KEY"),
    "REFRESH_TOKEN_PUBLIC_KEY must be a valid PEM-formatted RSA public key"
  ),

  // Encryption
  FIELD_ENCRYPTION_KEY: z.string()
    .length(64, "FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)")
    .regex(/^[0-9a-fA-F]+$/, "FIELD_ENCRYPTION_KEY must be a valid hex string"),

  // Razorpay — production MUST use live keys
  RAZORPAY_KEY_ID: z.string().refine(
    val => val.startsWith("rzp_live_"),
    "RAZORPAY_KEY_ID must start with 'rzp_live_' in production (test keys detected)"
  ),
  RAZORPAY_KEY_SECRET: z.string().min(10, "RAZORPAY_KEY_SECRET is too short"),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(10, "RAZORPAY_WEBHOOK_SECRET is required in production"),

  // Redis — mandatory in production
  REDIS_URL: z.string().min(1, "REDIS_URL is required in production"),

  // Sentry — mandatory in production
  SENTRY_DSN: z.string().min(1, "SENTRY_DSN is required in production"),

  // AWS
  AWS_REGION: z.string().min(1).default("ap-south-1"),
  AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required in production"),
});

const developmentSecretsSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_PRIVATE_KEY: z.string().min(1),
  ACCESS_TOKEN_PUBLIC_KEY: z.string().min(1),
  REFRESH_TOKEN_PRIVATE_KEY: z.string().min(1),
  REFRESH_TOKEN_PUBLIC_KEY: z.string().min(1),
  FIELD_ENCRYPTION_KEY: z.string().min(1),
});

/**
 * Validate all environment variables at startup.
 * Collects ALL errors and reports them at once, rather than one at a time.
 * 
 * @throws Error with all validation failures if any secrets are missing/invalid
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const schema = isProduction ? productionSecretsSchema : developmentSecretsSchema;

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten();
    const fieldErrors = errors.fieldErrors;

    console.error("\n═══════════════════════════════════════════");
    console.error("❌ ENVIRONMENT VALIDATION FAILED");
    console.error("═══════════════════════════════════════════\n");

    const allErrors: string[] = [];

    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          const errorLine = `  • ${field}: ${msg}`;
          console.error(errorLine);
          allErrors.push(errorLine);
        }
      }
    }

    console.error(`\nTotal issues: ${allErrors.length}`);
    console.error("═══════════════════════════════════════════\n");

    if (isProduction) {
      console.error("FATAL: Cannot start in production with invalid environment. Exiting.");
      process.exit(1);
    } else {
      console.warn("⚠️  Running in development mode with incomplete secrets — some features may not work.");
    }
  } else {
    console.log(`✅ Environment validation passed (${isProduction ? "production" : "development"} mode)`);
  }
}
