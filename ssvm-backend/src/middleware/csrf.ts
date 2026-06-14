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
  getSecret: () => env.ACCESS_TOKEN_PRIVATE_KEY || "fallback_secret", // Needs a strong secret, the private key works perfectly
  cookieName: "__Host-ps.x-csrf-token", // Using __Host prefix for enhanced security if HTTPS
  cookieOptions: {
    sameSite: "lax",
    path: "/",
    secure: env.NODE_ENV === "production" && (env.FRONTEND_URL?.startsWith("https") ?? false),
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => {
    return req.headers["x-csrf-token"] as string;
  },
  getSessionIdentifier: (req) => {
    // If you don't have a specific session ID, fallback to returning something predictable 
    // per user/request or just "default" if you aren't doing strict session tracking
    return "default";
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
  // Excluded routes where CSRF validation is disabled:
  const excludedRoutes = [
    { method: "POST", path: "/api/payments/webhook" },
    { method: "POST", path: "/api/auth/login" },
    { method: "POST", path: "/api/auth/student/login" },
    { method: "POST", path: "/api/auth/alumni/register" },
    // Aliases mapped under /api/v1/
    { method: "POST", path: "/api/v1/payments/webhook" },
    { method: "POST", path: "/api/v1/auth/login" },
    { method: "POST", path: "/api/v1/auth/student/login" },
    { method: "POST", path: "/api/v1/auth/alumni/register" },
  ];

  // Check if current route is in the exclusions
  const isExcluded = excludedRoutes.some((route) => {
    return req.method === route.method && req.path === route.path;
  });

  if (isExcluded) {
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
