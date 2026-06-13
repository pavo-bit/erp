import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { reportQueue } from "../jobs/queue";
import crypto from "crypto";

const router = Router();

/**
 * GET /api/v1/certificates/templates
 * Fetch all available certificate templates for the school
 */
router.get("/templates", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const templates = await prisma.certificateTemplate.findMany({
      where: { schoolId: schoolId as string }
    });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to fetch certificate templates");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/v1/certificates/issue
 * Issue a new certificate
 */
router.post("/issue", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const { templateId, studentId } = req.body;
    
    if (!templateId || !studentId) {
      return res.status(400).json({ success: false, error: "Missing templateId or studentId" });
    }

    const template = await prisma.certificateTemplate.findUnique({
      where: { id: templateId, schoolId: schoolId as string }
    });

    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId, schoolId: schoolId || undefined }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Generate unique verifiable hash
    const qrHash = crypto.randomBytes(16).toString('hex');

    const issued = await prisma.issuedCertificate.create({
      data: {
        templateId,
        studentId,
        issuedById: req.user!.id,
        qrHash,
        status: "VALID"
      }
    });

    // Enqueue PDF generation job
    if (reportQueue) {
      await reportQueue.add("generateReport", {
        type: "certificate",
        schoolId,
        userId: req.user!.id,
        studentId,
        certificateId: issued.id,
        qrHash
      });
    } else {
      logger.warn("PDF_QUEUE is not available, skipping background generation");
    }

    res.status(201).json({ success: true, data: issued });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to issue certificate");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/v1/certificates/verify/:certNo
 * Public endpoint to verify a certificate's authenticity
 */
router.get("/verify/:certNo", async (req: AuthRequest, res: Response) => {
  try {
    const { certNo } = req.params;

    const cert = await prisma.issuedCertificate.findUnique({
      where: { qrHash: certNo as string },
      include: {
        student: { select: { name: true, admissionNo: true, school: { select: { name: true } } } },
        template: { select: { name: true } }
      }
    });

    if (!cert) {
      return res.status(404).json({ success: false, error: "Certificate not found or invalid" });
    }

    if (cert.status === "REVOKED") {
      return res.status(400).json({ 
        success: false, 
        error: "This certificate has been revoked",
        data: { reason: cert.revocationReason, revokedAt: cert.issuedAt } // in reality add a revokedAt
      });
    }

    res.json({ success: true, data: cert });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to verify certificate");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
