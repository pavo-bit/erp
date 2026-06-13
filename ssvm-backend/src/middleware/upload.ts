import { Request, Response, NextFunction } from "express";
import multer from "multer";
// import { fileTypeFromBuffer } from "file-type";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { sendError } from "../lib/response";

// Configure multer for memory storage (max 10MB)
export const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Initial MIME type check (easy to spoof, so we validate bytes later)
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed."));
    }
  },
});

export interface IVirusScanner {
  scan(buffer: Buffer): Promise<boolean>;
}

// VirusScanner Stub
export const virusScanner: IVirusScanner = {
  async scan(buffer: Buffer): Promise<boolean> {
    // Stub: Currently returns true. 
    // Prepare for ClamAV / AWS Malware Protection integration here.
    return true; 
  }
};

/**
 * Middleware to enforce strict Magic Byte validation and Virus Scanning.
 */
export async function secureUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return next(); // Let the route handle "No file" error if it's required
  }

  try {
    const buffer = req.file.buffer;

    // 1. Magic Byte Validation
    const { fileTypeFromBuffer } = await import("file-type");
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      throw new Error("Could not determine file type from magic bytes.");
    }

    const allowedFileTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedFileTypes.includes(fileType.mime)) {
      throw new Error(`Magic byte mismatch: uploaded as ${req.file.mimetype} but actual is ${fileType.mime}`);
    }

    // 2. Size Validation by type (Images 5MB, PDF 10MB)
    if (fileType.mime.startsWith("image/") && req.file.size > 5 * 1024 * 1024) {
      throw new Error("Images must be under 5MB");
    }

    // 3. Virus Scan
    const isSafe = await virusScanner.scan(buffer);
    if (!isSafe) {
      throw new Error("Malware detected by virus scanner");
    }

    // Override the req.file.mimetype with the actual magic byte type to be safe
    req.file.mimetype = fileType.mime;

    next();
  } catch (error: any) {
    logger.error({ err: error, fileName: req.file.originalname }, "Upload Security Validation Failed");

    // Extract user info if available from authenticate middleware
    const userId = (req as any).user?.id || undefined;
    const schoolId = (req as any).user?.schoolId || undefined;

    // Log HIGH severity Security Event
    const { logSecurityEvent } = await import("../lib/audit");
    await logSecurityEvent({
        userId,
        eventType: "FAILED_UPLOAD",
        severity: "HIGH",
        ipAddress: typeof req.ip === "string" ? req.ip : undefined,
        metadata: {
          reason: error.message,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
    });

    return sendError(res, 400, "File validation failed: " + error.message);
  }
}
