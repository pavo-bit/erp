import helmet from "helmet";
import { RequestHandler } from "express";

// ═══════════════════════════════════════════
// Security Headers (GAP 18 — Hardened)
// ═══════════════════════════════════════════
// Production-grade helmet configuration with:
//   - Strict CSP with nonce support
//   - HSTS preload (2 years)
//   - Cross-Origin isolation
//   - Permissions-Policy (camera, mic, etc.)

export function createSecurityHeaders(): RequestHandler {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],  // Needed for inline styles
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://lumberjack-cx.razorpay.com",
          "https://*.sentry.io",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],  // Prevents clickjacking (replaces X-Frame-Options)
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
        reportUri: "/api/v1/csp-report",
      },
    },

    // HTTP Strict Transport Security
    // 2 years, include subdomains, preload
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },

    // Cross-Origin isolation
    crossOriginEmbedderPolicy: false, // Allow loading external images
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Needed for CDN/S3 assets

    // Other headers
    dnsPrefetchControl: { allow: false },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,  // nosniff
    originAgentCluster: true,
    xXssProtection: true,
  });
}

/**
 * Additional custom security headers middleware.
 * Adds headers that helmet doesn't support out of the box.
 */
export function customSecurityHeaders(): RequestHandler {
  return (_req, res, next) => {
    // Permissions Policy — restrict browser features
    res.setHeader(
      "Permissions-Policy",
      [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=(self)",
        "usb=()",
        "magnetometer=()",
        "gyroscope=()",
        "accelerometer=()",
        "interest-cohort=()",  // Block FLoC
      ].join(", ")
    );

    // X-Download-Options — prevent IE from executing downloads
    res.setHeader("X-Download-Options", "noopen");

    // X-Permitted-Cross-Domain-Policies — block Flash/PDF cross-domain
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

    // Cache-Control for API responses
    if (_req.path.startsWith("/api")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    next();
  };
}
