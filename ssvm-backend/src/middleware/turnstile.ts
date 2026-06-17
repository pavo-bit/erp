import { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/env";
import { publicFormSubmissionsTotal } from "./metrics";
import logger from "../lib/logger";

// Extend Request to pass spam flags
export interface PublicFormRequest extends Request {
  spamSuspected?: boolean;
}

/**
 * Middleware to verify Cloudflare Turnstile token
 */
export const verifyTurnstile = async (req: PublicFormRequest, res: Response, next: NextFunction) => {
  const env = getEnv();
  
  // Skip turnstile in test environments
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const { turnstileToken } = req.body;
  const endpoint = req.route ? req.route.path : req.path;

  if (!turnstileToken) {
    publicFormSubmissionsTotal.labels(endpoint, "CAPTCHA_FAILED").inc();
    return res.status(400).json({ success: false, error: "CAPTCHA verification missing" });
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    logger.error("TURNSTILE_SECRET_KEY is missing in environment variables");
    return res.status(500).json({ success: false, error: "Server configuration error" });
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", turnstileToken);
    
    // Cloudflare recommends logging IP, but it's optional
    const ip = req.ip ? req.ip.replace(/^::ffff:/, '') : "";
    if (ip) {
      formData.append("remoteip", ip);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      publicFormSubmissionsTotal.labels(endpoint, "CAPTCHA_FAILED").inc();
      logger.warn({ ip, errors: data["error-codes"] }, "Turnstile validation failed");
      return res.status(400).json({ success: false, error: "CAPTCHA verification failed" });
    }

    next();
  } catch (error) {
    logger.error({ err: error }, "Turnstile network error");
    res.status(500).json({ success: false, error: "CAPTCHA service unreachable" });
  }
};

const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "temp-mail.org",
  "yopmail.com",
  "throwawaymail.com",
  "tempmail.com"
];

/**
 * Middleware for basic spam quality validation (Honeypot + Disposable Emails)
 */
export const spamQualityValidation = (req: PublicFormRequest, res: Response, next: NextFunction) => {
  const { honeypot, email } = req.body;
  const endpoint = req.route ? req.route.path : req.path;

  // 1. Honeypot check
  if (honeypot) {
    // Honeypot field was filled out, likely a bot. 
    // Flag it so the route handler can return 201 without doing work.
    req.spamSuspected = true;
    publicFormSubmissionsTotal.labels(endpoint, "SPAM_SUSPECTED").inc();
    logger.info({ ip: req.ip }, "Spam suspected due to honeypot field");
    return next();
  }

  // 2. Disposable Email Check
  if (email && typeof email === "string") {
    const parts = email.split("@");
    if (parts.length === 2) {
      const domain = parts[1].toLowerCase();
      if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
        publicFormSubmissionsTotal.labels(endpoint, "SPAM_SUSPECTED").inc();
        return res.status(400).json({ success: false, error: "Please provide a valid, non-disposable email address" });
      }
    }
  }

  // If we reach here, it looks legitimate
  publicFormSubmissionsTotal.labels(endpoint, "ACCEPTED").inc();
  next();
};
