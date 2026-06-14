import { z } from "zod";

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
});

export type Env = z.infer<typeof envSchema>;

let _env: Env;

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
  }
  return _env;
}

