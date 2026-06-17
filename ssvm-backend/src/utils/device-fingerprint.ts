import crypto from "crypto";
import { Request } from "express";

// ═══════════════════════════════════════════
// Device Fingerprint (GAP 10)
// ═══════════════════════════════════════════
// Generates a deterministic fingerprint from request metadata.
// Used to bind refresh tokens to specific devices.
// If the fingerprint changes on a refresh, the token family is revoked.

/**
 * Generate a device fingerprint from request headers.
 * Uses: User-Agent + Accept-Language + first 2 octets of IP.
 *
 * This is NOT browser fingerprinting (no canvas, WebGL, etc.).
 * It's a server-side approximation for token binding.
 */
export function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers["user-agent"] || "unknown";
  const acceptLanguage = req.headers["accept-language"] || "unknown";

  // Use first two octets of IP for rough location binding
  // This allows the user to switch between similar IPs (same ISP)
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "0.0.0.0";
  const ipParts = ip.replace(/^::ffff:/, "").split(".");
  const ipPrefix = ipParts.length >= 2 ? `${ipParts[0]}.${ipParts[1]}` : ip;

  const raw = `${userAgent}|${acceptLanguage}|${ipPrefix}`;

  return crypto.createHash("sha256").update(raw).digest("hex").substring(0, 32);
}

/**
 * Validate that a device fingerprint matches the stored one.
 * Returns true if they match or if no stored fingerprint exists.
 */
export function validateDeviceFingerprint(
  storedFingerprint: string | null | undefined,
  currentFingerprint: string
): boolean {
  if (!storedFingerprint) return true; // No stored fingerprint = legacy token, allow
  return storedFingerprint === currentFingerprint;
}
