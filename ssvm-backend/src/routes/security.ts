import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { AuthRequest, authenticate, requireRole, requireSuperAdmin } from "../middleware/auth";
import { sendSuccess, sendError } from "../lib/response";

const router = Router();

// GET /api/v1/security/quarantine
router.get("/quarantine", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.role !== "SUPER_ADMIN" ? req.user?.schoolId : undefined;
    
    const quarantinedDocs = await prisma.documentRepository.findMany({
      where: {
        scanStatus: "QUARANTINED",
        ...(schoolId ? { schoolId } : {})
      },
      include: {
        school: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return sendSuccess(res, { documents: quarantinedDocs });
  } catch (error) {
    logger.error(error, "Failed to fetch quarantined documents");
    return sendError(res, 500, "Failed to fetch quarantined documents");
  }
});

// POST /api/v1/security/quarantine/:id/release
router.post("/quarantine/:id/release", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const schoolId = req.user?.role !== "SUPER_ADMIN" ? req.user?.schoolId : undefined;

    const doc = await prisma.documentRepository.findFirst({
      where: {
        id: id as string,
        ...(schoolId ? { schoolId } : {})
      }
    });

    if (!doc) {
      return sendError(res, 404, "Document not found or unauthorized");
    }

    if (doc.scanStatus !== "QUARANTINED") {
      return sendError(res, 400, "Document is not quarantined");
    }

    await prisma.documentRepository.update({
      where: { id: id as string },
      data: {
        scanStatus: "CLEAN", // Mark as clean
        scanResult: `Manually released by admin. Reason: ${reason || "Verified safe"}`
      }
    });

    const { logSecurityEvent } = await import("../lib/audit");
    await logSecurityEvent({
      userId: req.user!.id,
      eventType: "QUARANTINE_RELEASE",
      severity: "MEDIUM",
      metadata: { documentId: id, reason }
    });

    return sendSuccess(res, { message: "Document released from quarantine successfully" });
  } catch (error) {
    logger.error(error, "Failed to release quarantined document");
    return sendError(res, 500, "Failed to release quarantined document");
  }
});

// DELETE /api/v1/security/quarantine/:id
router.delete("/quarantine/:id", authenticate, requireRole("SUPER_ADMIN", "ERP_ADMIN"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.role !== "SUPER_ADMIN" ? req.user?.schoolId : undefined;

    const doc = await prisma.documentRepository.findFirst({
      where: {
        id: id as string,
        ...(schoolId ? { schoolId } : {})
      }
    });

    if (!doc) {
      return sendError(res, 404, "Document not found or unauthorized");
    }

    // Call storage service to delete from S3
    const { storageService } = await import("../services/storage.service");
    await storageService.deleteFile(doc.fileUrl);

    await prisma.documentRepository.delete({
      where: { id: id as string }
    });

    const { logSecurityEvent } = await import("../lib/audit");
    await logSecurityEvent({
      userId: req.user!.id,
      eventType: "QUARANTINE_DELETED",
      severity: "MEDIUM",
      metadata: { documentId: id }
    });

    return sendSuccess(res, { message: "Quarantined document securely deleted" });
  } catch (error) {
    logger.error(error, "Failed to delete quarantined document");
    return sendError(res, 500, "Failed to delete quarantined document");
  }
});

export default router;
