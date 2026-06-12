import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authenticate, requireRoles } from "../middleware/auth";
import { storageService } from "../services/storage.service";
import { sendSuccess, sendError } from "../lib/response";
import logger from "../lib/logger";

const router = Router();

// Configure multer for memory storage (we will buffer to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, PDF, DOC, and CSV are allowed."));
    }
  },
});

/**
 * Upload a document securely to S3/R2.
 * Roles: SUPER_ADMIN, ERP_ADMIN, HR, TEACHER
 */
router.post(
  "/upload",
  authenticate,
  requireRoles(["SUPER_ADMIN", "ERP_ADMIN", "HR", "TEACHER"]),
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return sendError(res, 400, "No file uploaded");
      }

      // Explicit virus scan hook placeholder
      // await virusScanService.scan(req.file.buffer);

      const { category = "docs" } = req.body;

      const fileKey = await storageService.uploadFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        category
      );

      return sendSuccess(res, {
        key: fileKey,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      }, "File uploaded securely");
    } catch (error: any) {
      logger.error(error, "Upload failed");
      return sendError(res, 500, error.message || "Failed to upload file");
    }
  }
);

/**
 * Generate a pre-signed URL for secure file access.
 * Must verify access rights before generating.
 */
router.get("/signed-url", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.query;

    if (!key || typeof key !== "string") {
      return sendError(res, 400, "File key is required");
    }

    // In a real implementation, you would query the DocumentRepository here
    // to check if `req.user` has access to `key` before issuing a signed URL.

    const url = await storageService.generateSignedUrl(key, 3600); // 1 hour expiry
    return sendSuccess(res, { url }, "Signed URL generated successfully");
  } catch (error) {
    logger.error(error, "Failed to generate signed URL");
    return sendError(res, 500, "Failed to generate signed URL");
  }
});

export default router;
