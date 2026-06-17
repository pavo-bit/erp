import { z } from "zod";

// ═══════════════════════════════════════════
// Environment Validation (GAP 4 — Enhanced)
// ═══════════════════════════════════════════
// Strict validation of all environment variables.
// Production-specific checks for secrets that MUST NOT be defaults.

const envSchema = z.object({
  PORT: z.string().default("5000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads"),

  // ─── Auth & Tokens ───
  ACCESS_TOKEN_PRIVATE_KEY: z.string().min(1, "ACCESS_TOKEN_PRIVATE_KEY is required"),
  ACCESS_TOKEN_PUBLIC_KEY: z.string().min(1, "ACCESS_TOKEN_PUBLIC_KEY is required"),
  REFRESH_TOKEN_PRIVATE_KEY: z.string().min(1, "REFRESH_TOKEN_PRIVATE_KEY is required"),
  REFRESH_TOKEN_PUBLIC_KEY: z.string().min(1, "REFRESH_TOKEN_PUBLIC_KEY is required"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  
  // Legacy HS256 Fallback Secrets (For Zero-Downtime Rollover)
  ACCESS_TOKEN_SECRET: z.string().optional(),
  REFRESH_TOKEN_SECRET: z.string().optional(),

  // ─── DPDP Compliance (Phase 1) ───
  FIELD_ENCRYPTION_KEY: z.string()
    .length(64, "FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)")
    .regex(/^[0-9a-fA-F]+$/, "FIELD_ENCRYPTION_KEY must be a valid hex string"),

  // ─── Redis (Phase 2+) ───
  REDIS_URL: z.string().optional(),

  // ─── Sentry (Phase 6) ───
  SENTRY_DSN: z.string().optional(),

  // ─── Push Notifications (Phase 4) ───
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().optional(),

  // ─── 2FA (Phase 5) ───
  TWO_FACTOR_ENCRYPTION_KEY: z.string().optional(),

  // ─── AWS S3 (Phase 14B) ───
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // ─── GAP 4: Additional Secrets ───
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // ─── GAP 4: Secrets Manager (optional — used in production) ───
  AWS_SECRETS_MANAGER_ARN: z.string().optional(),
  SECRETS_ROTATION_INTERVAL_HOURS: z.string().default("24"),

  // ─── GAP 12: Backups ───
  BACKUP_RETENTION_DAYS: z.string().default("30"),

  // ─── Twilio SMS ───
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env;

/**
 * Production-specific validation: ensure no placeholder secrets.
 */
function validateProductionSecrets(env: Env): void {
  if (env.NODE_ENV !== "production") return;

  const errors: string[] = [];

  // Check for placeholder values that must not be in production
  const placeholderPatterns = [
    "placeholder", "test", "example", "changeme", "default",
    "rzp_test_", "sk_test_", "dummy",
  ];

  const secretFields: Array<{ key: keyof Env; name: string }> = [
    { key: "RAZORPAY_KEY_ID", name: "Razorpay Key ID" },
    { key: "RAZORPAY_KEY_SECRET", name: "Razorpay Key Secret" },
    { key: "RAZORPAY_WEBHOOK_SECRET", name: "Razorpay Webhook Secret" },
    { key: "FIELD_ENCRYPTION_KEY", name: "Field Encryption Key" },
  ];

  for (const { key, name } of secretFields) {
    const value = env[key] as string | undefined;
    if (!value) continue;

    const lowerValue = value.toLowerCase();
    for (const pattern of placeholderPatterns) {
      if (lowerValue.includes(pattern)) {
        errors.push(`${name} (${key}) contains placeholder value — must use real credentials in production`);
        break;
      }
    }
  }

  // Mandatory in production
  if (!env.REDIS_URL) {
    errors.push("REDIS_URL is required in production for rate limiting, sessions, and caching");
  }
  if (!env.SENTRY_DSN) {
    errors.push("SENTRY_DSN is required in production for error tracking");
  }

  if (errors.length > 0) {
    console.error("❌ Production environment validation failed:");
    errors.forEach((err) => console.error(`   • ${err}`));
    process.exit(1);
  }
}

export function getEnv(): Env {
  if (!_env) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("❌ Invalid environment variables:");
      console.error(parsed.error.flatten().fieldErrors);
      process.exit(1);
    }
    _env = parsed.data;

    // Validate RSA Keys Format
    const keys = ["ACCESS_TOKEN_PRIVATE_KEY", "ACCESS_TOKEN_PUBLIC_KEY", "REFRESH_TOKEN_PRIVATE_KEY", "REFRESH_TOKEN_PUBLIC_KEY"] as const;
    for (const key of keys) {
      // Fix multiline if passed via docker/env inline
      _env[key] = _env[key].replace(/\\n/g, "\n");
      if (!_env[key].includes("BEGIN")) {
        console.error(`❌ Invalid RSA key format for ${key}`);
        process.exit(1);
      }
    }

    // Production-specific checks
    validateProductionSecrets(_env);
  }
  return _env;
}
