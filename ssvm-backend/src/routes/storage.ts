import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authenticate, requireRole } from "../middleware/auth";
import { storageService } from "../services/storage.service";
import { sendSuccess, sendError } from "../lib/response";
import logger from "../lib/logger";
import prisma from "../lib/prisma";

const router = Router();

import { multerUpload, secureUploadMiddleware } from "../middleware/upload";

/**
 * Upload a document securely to S3/R2.
 * Roles: SUPER_ADMIN, ERP_ADMIN, HR, TEACHER
 */
router.post(
  "/upload",
  authenticate,
  requireRole("SUPER_ADMIN", "ERP_ADMIN", "HR", "TEACHER"),
  multerUpload.single("file"),
  secureUploadMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return sendError(res, 400, "No file uploaded");
      }

      const { category = "docs" } = req.body;

      const fileKey = await storageService.uploadFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        category
      );

      let docId = undefined;
      const { Queue } = await import("bullmq");
      const scanQueue = new Queue("SCAN_QUEUE", { connection: { url: process.env.REDIS_URL || "redis://localhost:6379" } });

      const authReq = req as any; // Need user and schoolId
      if (authReq.user && authReq.user.schoolId) {
        const doc = await prisma.documentRepository.create({
          data: {
            schoolId: authReq.user.schoolId,
            category,
            name: req.file.originalname,
            fileUrl: fileKey, // Storing key as URL for now, accessed via signed-url
            fileType: req.file.mimetype,
            sizeBytes: req.file.size,
            uploadedById: authReq.user.id,
            scanStatus: "PENDING"
          }
        });
        docId = doc.id;
        
        await scanQueue.add("scan", {
          documentId: doc.id,
          fileUrl: fileKey
        });
      }

      return sendSuccess(res, {
        documentId: docId,
        key: fileKey,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        message: "File uploaded securely and queued for scanning"
      });
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

    // Check if req.user has access, and if the file is QUARANTINED
    const authReq = req as any;
    if (authReq.user && authReq.user.schoolId) {
      const doc = await prisma.documentRepository.findFirst({
        where: { fileUrl: key as string }
      });
      if (doc) {
        if (doc.schoolId !== authReq.user.schoolId && authReq.user.role !== "SUPER_ADMIN") {
          return sendError(res, 403, "Access denied to this document");
        }
        if (doc.scanStatus === "QUARANTINED") {
          return sendError(res, 403, "Access denied: Document is quarantined due to security threats");
        }
      }
    }

    const url = await storageService.generateSignedUrl(key as string, 3600); // 1 hour expiry
    return sendSuccess(res, { url, message: "Signed URL generated successfully" });
  } catch (error) {
    logger.error(error, "Failed to generate signed URL");
    return sendError(res, 500, "Failed to generate signed URL");
  }
});

export default router;
