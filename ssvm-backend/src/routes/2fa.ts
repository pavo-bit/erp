import { Router, Request, Response } from "express";
const { authenticator } = require("otplib");
import * as QRCode from "qrcode";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate } from "../middleware/auth";
import { z } from "zod";
import { validate } from "../middleware/validate";
import crypto from "crypto";

const router = Router();

// Generate a random 8-character string for backup codes
const generateBackupCode = () => crypto.randomBytes(4).toString("hex");

const verifySchema = z.object({
  token: z.string().length(6),
});

// Setup 2FA (Generate Secret and QR Code)
router.post("/setup", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    
    if (user?.twoFactorEnabled) {
      res.status(400).json({ success: false, error: "2FA is already enabled" }); return;
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user!.email, "SSVM College Square", secret);
    
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Save the secret temporarily, but do not enable it yet
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorSecret: secret },
    });

    res.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        message: "Scan the QR code with your authenticator app and verify to complete setup."
      }
    });
  } catch (e) {
    logger.error({ err: e }, "Setup 2FA error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Verify and Enable 2FA
router.post("/verify-setup", authenticate, validate(verifySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ success: false, error: "2FA setup not initiated" }); return;
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });

    if (!isValid) {
      res.status(400).json({ success: false, error: "Invalid authenticator token" }); return;
    }

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, generateBackupCode);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      },
    });

    res.json({
      success: true,
      data: {
        backupCodes,
        message: "Two-Factor Authentication has been enabled successfully. Save your backup codes!"
      }
    });
  } catch (e) {
    logger.error({ err: e }, "Verify 2FA setup error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Disable 2FA
router.post("/disable", authenticate, validate(verifySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ success: false, error: "2FA is not enabled" }); return;
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });

    if (!isValid) {
      res.status(400).json({ success: false, error: "Invalid authenticator token" }); return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    res.json({ success: true, message: "Two-Factor Authentication disabled" });
  } catch (e) {
    logger.error({ err: e }, "Disable 2FA error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Validate 2FA (Second step of login)
const validateLoginSchema = z.object({
  pendingToken: z.string(),
  token: z.string().length(6), // Authenticator code or backup code
});

import { verify2FAPendingToken } from "../lib/tokens";
import { issueTokenPair } from "./auth";

router.post("/validate", validate(validateLoginSchema), async (req: Request, res: Response) => {
  try {
    const { pendingToken, token } = req.body;

    const payload = verify2FAPendingToken(pendingToken);
    if (!payload) {
      res.status(401).json({ success: false, error: "Invalid or expired pending token" }); return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ success: false, error: "2FA is not enabled for this user" }); return;
    }

    let isValid = false;

    // Check TOTP token
    isValid = authenticator.verify({ token, secret: user.twoFactorSecret });

    // If TOTP failed, check if it's a valid backup code
    if (!isValid && user.twoFactorBackupCodes) {
      let backupCodes: string[] = [];
      try {
        backupCodes = JSON.parse(user.twoFactorBackupCodes);
      } catch (e) {}

      if (backupCodes.includes(token)) {
        isValid = true;
        // Remove used backup code
        backupCodes = backupCodes.filter(c => c !== token);
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
        });
        logger.info({ userId: user.id }, "User logged in using 2FA backup code");
      }
    }

    if (!isValid) {
      res.status(401).json({ success: false, error: "Invalid authenticator token or backup code" }); return;
    }

    // Issue access + refresh token pair
    await issueTokenPair(res, user, req);

    const { password: _, twoFactorSecret, twoFactorBackupCodes, ...userWithoutPw } = user;
    logger.info({ userId: user.id, role: user.role }, "User logged in with 2FA");
    res.json({ success: true, data: { user: userWithoutPw } });
  } catch (e) {
    logger.error({ err: e }, "Validate 2FA error");
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
