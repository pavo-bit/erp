/**
 * ssvm-backend/src/routes/admin/admissions-bulk.ts
 *
 * REST API routes for SSVM ERP Bulk Student Admission Registration.
 * Handles template downloads, workbook preview & validation, and transactional
 * commits with mandatory offline approval attestation.
 */

import { Router, Response } from "express";
import multer from "multer";
import crypto from "crypto";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import logger from "../../lib/logger";
import prisma from "../../lib/prisma";
import { AdmissionType, OfflineApprovalAttestation } from "../../services/admissions-bulk/admission-types";
import { AdmissionTemplateRegistry } from "../../services/admissions-bulk/admission-template-registry";
import { AdmissionPaperFormsService } from "../../services/admissions-bulk/admission-paper-forms.service";
import { AdmissionWorkbookParser } from "../../services/admissions-bulk/admission-workbook-parser";
import { AdmissionValidationEngine } from "../../services/admissions-bulk/admission-validation-engine";
import { AdmissionRegistrationService } from "../../services/admissions-bulk/admission-registration-service";

const router = Router();

// Multer memory storage for in-memory safe parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const isExcel =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls");

    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel workbooks (.xlsx, .xls) are accepted for bulk admission registration."));
    }
  },
});

const adminGuard = [authenticate, requireRole("SUPER_ADMIN", "ADMIN", "ERP_ADMIN")];

// ─────────────────────────────────────────────────────────────
// 1. TEMPLATES CATALOG & DOWNLOAD
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/templates
 * Lists the 3 supported admission template options with metadata
 */
router.get("/templates", adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const list = Object.values(AdmissionTemplateRegistry.TEMPLATES);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/templates/:type/download
 * Generates and downloads the versioned Excel template workbook
 */
router.get("/templates/:type/download", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const type = (req.params.type as string).toUpperCase() as AdmissionType;

    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid admission template type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }

    // Preload configured classes in this school for reference sheet
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    });
    const classNames = classes.map((c) => c.name);

    const buffer = await AdmissionTemplateRegistry.generateWorkbookBuffer(
      type,
      classNames.length > 0 ? classNames : undefined
    );
    const meta = AdmissionTemplateRegistry.getMetadata(type);

    res.setHeader("Content-Disposition", `attachment; filename="${meta.fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err: any) {
    logger.error({ err }, "Failed to generate admission template");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/forms/:type/print
 * Renders complete printable A4 HTML Paper Form for offline admissions
 */
router.get("/forms/:type/print", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const type = (req.params.type as string).toUpperCase();
    const session = req.query.session as string | undefined;

    let html = "";
    if (type === "NEW") {
      html = await AdmissionPaperFormsService.renderNewAdmissionForm(schoolId, { academicSession: session });
    } else if (type === "READMISSION") {
      html = await AdmissionPaperFormsService.renderReAdmissionForm(schoolId, { academicSession: session });
    } else if (type === "TRANSFER") {
      html = await AdmissionPaperFormsService.renderTransferAdmissionForm(schoolId, { academicSession: session });
    } else {
      res.status(400).json({ success: false, error: "Invalid form type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err: any) {
    logger.error({ err }, "Failed to render paper admission form");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. WORKBOOK PARSE & PREVIEW VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/admissions/bulk/preview
 * Analyzes uploaded workbook, verifies structure, validates attributes & relations, checks duplicates
 */
router.post("/preview", adminGuard, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, error: "No Excel workbook uploaded." });
      return;
    }

    const batchId = `ADM-BATCH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // 1. Parse multi-sheet workbook
    const parsed = await AdmissionWorkbookParser.parse(req.file.buffer);

    // 2. Validate against tenant masters & duplicate rules
    const previewSummary = await AdmissionValidationEngine.validateWorkbook(
      schoolId,
      parsed,
      batchId
    );

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        ...previewSummary,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admission preview validation failed");
    res.status(400).json({ success: false, error: err.message || "Failed to parse and validate workbook." });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. TRANSACTIONAL REGISTRATION COMMIT
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/admissions/bulk/commit
 * Commits approved student registrations to canonical Student Management models
 */
router.post("/commit", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;

    const {
      batchId,
      admissionType,
      attestation,
      entries,
      clearEmptyFields = false,
      skipInvalidRows = true,
    } = req.body;

    if (!batchId || !admissionType || !entries || !Array.isArray(entries)) {
      res.status(400).json({
        success: false,
        error: "Missing required payload: batchId, admissionType, and entries array are required.",
      });
      return;
    }

    // Verify attestation
    const verifiedAttestation: OfflineApprovalAttestation = {
      ...attestation,
      attestedByUserId: userId,
      attestedAt: new Date().toISOString(),
    };

    if (!verifiedAttestation.attested) {
      res.status(400).json({
        success: false,
        error: "You must explicitly confirm the offline admission approval attestation before committing.",
      });
      return;
    }

    const result = await AdmissionRegistrationService.commitBatch(
      schoolId,
      batchId,
      admissionType as AdmissionType,
      verifiedAttestation,
      entries,
      { clearEmptyFields: Boolean(clearEmptyFields), skipInvalidRows: Boolean(skipInvalidRows) }
    );

    res.json({
      success: true,
      data: result,
      message: `Committed ${result.successCount} student admissions successfully.`,
    });
  } catch (err: any) {
    logger.error({ err }, "Bulk admission commit failed");
    res.status(400).json({ success: false, error: err.message || "Failed to commit admission batch." });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. IMPORT HISTORY & REPORTING
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/history
 * Lists previous bulk admission jobs for the tenant
 */
router.get("/history", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const jobs = await prisma.bulkJob.findMany({
      where: {
        schoolId,
        type: { startsWith: "ADMISSION_BULK_" },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/history/:jobId
 * Gets specific batch job details and diagnostics
 */
router.get("/history/:jobId", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const job = await prisma.bulkJob.findFirst({
      where: { id: req.params.jobId as string, schoolId },
    });

    if (!job) {
      res.status(404).json({ success: false, error: "Admission batch job not found." });
      return;
    }

    let parsedErrors = [];
    if (job.errorFile) {
      try {
        parsedErrors = JSON.parse(job.errorFile);
      } catch {
        parsedErrors = [{ error: job.errorFile }];
      }
    }

    res.json({
      success: true,
      data: {
        ...job,
        errorLog: parsedErrors,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
