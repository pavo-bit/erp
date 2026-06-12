import crypto from "crypto";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

// ═══════════════════════════════════════════
// OTP Service — Brute-Force Protected
// ═══════════════════════════════════════════

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const OTP_EXPIRY_MINUTES = 10;

export interface OtpResult {
  success: boolean;
  error?: string;
  retryAfterMinutes?: number;
}

/**
 * Generate a new OTP for a phone number.
 * Invalidates any existing unverified OTPs for this phone.
 */
export async function generateOtp(phone: string): Promise<string> {
  // Invalidate old unverified OTPs
  await prisma.oTP.deleteMany({
    where: { phone, verified: false },
  });

  // Generate cryptographically random 6-digit code
  const code = String(crypto.randomInt(100000, 999999));

  await prisma.oTP.create({
    data: {
      phone,
      code,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      attemptCount: 0,
    },
  });

  logger.info({ phone: phone.slice(-4) }, "OTP generated");
  return code;
}

/**
 * Verify an OTP with brute-force protection.
 * - Locks after MAX_ATTEMPTS failed attempts for LOCKOUT_MINUTES.
 * - Returns structured result with error messages.
 */
export async function verifyOtp(phone: string, code: string): Promise<OtpResult> {
  // Find the most recent unverified OTP for this phone
  const otp = await prisma.oTP.findFirst({
    where: { phone, verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { success: false, error: "No OTP found. Please request a new one." };
  }

  // Check lockout
  if (otp.lockedUntil && otp.lockedUntil > new Date()) {
    const remainingMs = otp.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return {
      success: false,
      error: `Too many attempts. Try again in ${remainingMin} minute${remainingMin > 1 ? "s" : ""}.`,
      retryAfterMinutes: remainingMin,
    };
  }

  // Check if code matches
  if (otp.code !== code) {
    const newAttemptCount = otp.attemptCount + 1;
    const updateData: Record<string, unknown> = {
      attemptCount: newAttemptCount,
      lastAttemptAt: new Date(),
    };

    // Lock after MAX_ATTEMPTS
    if (newAttemptCount >= MAX_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      logger.warn({ phone: phone.slice(-4), attempts: newAttemptCount }, "OTP locked due to too many attempts");
    }

    await prisma.oTP.update({
      where: { id: otp.id },
      data: updateData,
    });

    const remaining = MAX_ATTEMPTS - newAttemptCount;
    if (remaining <= 0) {
      return {
        success: false,
        error: `Too many attempts. Locked for ${LOCKOUT_MINUTES} minutes.`,
        retryAfterMinutes: LOCKOUT_MINUTES,
      };
    }

    return {
      success: false,
      error: `Invalid OTP. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
    };
  }

  // Check expiry
  if (otp.expiresAt < new Date()) {
    return { success: false, error: "OTP expired. Please request a new one." };
  }

  // Success — mark as verified
  await prisma.oTP.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  logger.info({ phone: phone.slice(-4) }, "OTP verified successfully");
  return { success: true };
}
