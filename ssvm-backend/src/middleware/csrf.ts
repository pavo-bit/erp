import { doubleCsrf } from "csrf-csrf";
import { getEnv } from "../config/env";
import { Request, Response, NextFunction } from "express";

const env = getEnv();

// Configuration for doubleCsrf
const {
  invalidCsrfTokenError, // This is just an error instance
  generateCsrfToken, // Generates the token to be sent in headers
  doubleCsrfProtection, // Middleware to protect routes
} = doubleCsrf({
  // Never silently fall back to a known or weak key. Startup environment validation
  // already requires this key; use it only as CSRF signing material.
  getSecret: () => env.ACCESS_TOKEN_PRIVATE_KEY,
  cookieName: env.NODE_ENV === "production" ? "__Host-ps.x-csrf-token" : "csrf-token",
  cookieOptions: {
    sameSite: "lax",
    path: "/",
    secure: env.NODE_ENV === "production",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => {
    return req.headers["x-csrf-token"] as string;
  },
  getSessionIdentifier: () => {
    // CSRF runs before route-level authentication, so its stable browser token
    // context must not depend on req.user (which is unavailable at this point).
    return "browser";
  }
});

// Middleware to inject the CSRF token into the X-CSRF-Token header
export function injectCsrfToken(req: Request, res: Response, next: NextFunction) {
  const token = generateCsrfToken(req, res);
  res.setHeader("X-CSRF-Token", token);
  next();
}

// Wrapper for doubleCsrfProtection that includes route exclusions
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const hasAuthCookie = Boolean(req.cookies?.access_token || req.cookies?.auth_token || req.cookies?.refresh_token);
  const origin = req.get("origin");

  // ═══════════════════════════════════════════════════════════════════════════
  // Cross-Origin Defense for Cookie-Authenticated Requests:
  // For all cookie-carrying requests (including /api/v1/auth/refresh and logout),
  // if an Origin header is present, it MUST match the configured trusted origin.
  // This prevents malicious third-party origins from issuing ambient-credential
  // state requests, even on routes excluded from doubleCsrf token validation.
  // ═══════════════════════════════════════════════════════════════════════════
  if (hasAuthCookie && origin) {
    let allowedOrigin: string;
    try {
      allowedOrigin = new URL(env.FRONTEND_URL).origin;
    } catch {
      return res.status(500).json({ success: false, error: "csrf_origin_configuration_error" });
    }
    if (origin !== allowedOrigin) {
      return res.status(403).json({ success: false, error: "invalid_origin", message: "Request origin is not allowed" });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSRF Double-Submit Cookie Validation Exclusions:
  // - Public bootstrap routes (login, student/login, verify-2fa, alumni/register):
  //   Pre-authentication endpoints where no prior session or CSRF token exists.
  // - Webhook endpoints (payments/webhook):
  //   Machine-to-machine integrations secured via HMAC cryptographic signatures.
  // - Token lifecycle routes (refresh, logout):
  //   Protected via HttpOnly SameSite=Lax cookies, strict Origin checks above,
  //   hashed refresh tokens in the database, and single-use token family rotation.
  //   Double-submit CSRF headers are omitted here because refresh requests occur
  //   asynchronously when the client access token or CSRF token may have expired.
  // ═══════════════════════════════════════════════════════════════════════════
  const excludedRoutes = [
    { method: "POST", path: "/api/payments/webhook" },
    { method: "POST", path: "/api/auth/login" },
    { method: "POST", path: "/api/auth/student/login" },
    { method: "POST", path: "/api/auth/refresh" },
    { method: "POST", path: "/api/auth/logout" },
    { method: "POST", path: "/api/auth/verify-2fa" },
    { method: "POST", path: "/api/auth/alumni/register" },
    // Aliases mapped under /api/v1/
    { method: "POST", path: "/api/v1/payments/webhook" },
    { method: "POST", path: "/api/v1/auth/login" },
    { method: "POST", path: "/api/v1/auth/student/login" },
    { method: "POST", path: "/api/v1/auth/refresh" },
    { method: "POST", path: "/api/v1/auth/logout" },
    { method: "POST", path: "/api/v1/auth/verify-2fa" },
    { method: "POST", path: "/api/v1/auth/alumni/register" },
  ];

  // Check if current route is in the exclusions
  const isExcluded = excludedRoutes.some((route) => {
    return req.method === route.method && req.path === route.path;
  });

  if (isExcluded) {
    return next();
  }

  // A bearer token is supplied explicitly by the caller and is not ambient browser
  // credential state. Cookie-authenticated requests remain subject to CSRF checks.
  if (req.headers.authorization?.startsWith("Bearer ") && !hasAuthCookie) {
    return next();
  }

  // Validate CSRF token using doubleCsrfProtection
  doubleCsrfProtection(req, res, (err) => {
    if (err && err === invalidCsrfTokenError) {
      return res.status(403).json({
        success: false,
        error: "invalid_csrf_token",
        message: "CSRF token validation failed",
      });
    }
    // Pass other errors down or continue
    if (err) return next(err);
    next();
  });
}
