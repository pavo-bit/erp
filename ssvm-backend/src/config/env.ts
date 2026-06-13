import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("5000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads"),

  // ─── Auth & Tokens ───
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ACCESS_TOKEN_SECRET: z.string().min(32).optional(), // Falls back to JWT_SECRET
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(), // Falls back to JWT_SECRET + "_refresh"
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),

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

    // Derive fallback secrets
    if (!_env.ACCESS_TOKEN_SECRET) {
      _env.ACCESS_TOKEN_SECRET = _env.JWT_SECRET;
    }
    if (!_env.REFRESH_TOKEN_SECRET) {
      _env.REFRESH_TOKEN_SECRET = _env.JWT_SECRET + "_refresh_secret_v1";
    }
  }
  return _env;
}

