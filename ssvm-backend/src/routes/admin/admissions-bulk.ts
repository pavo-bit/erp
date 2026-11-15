/**
 * ssvm-backend/src/routes/admin/admissions-bulk.ts
 *
 * REST API routes for SSVM ERP Student Admission Management.
 * Handles template downloads, paper form printing/PDFs with authoritative
 * fee snapshot resolution, concurrency-safe form issuance, server-side
 * paginated student register, and bulk registration commits.
 */

import { Router, Response, NextFunction } from "express";
import multer from "multer";
import crypto from "crypto";
import { AuthRequest, authenticate, requireRole } from "../../middleware/auth";
import logger from "../../lib/logger";
import prisma, { runWithTenantDatabaseTransaction } from "../../lib/prisma";
import { AdmissionType, OfflineApprovalAttestation } from "../../services/admissions-bulk/admission-types";
import { AdmissionTemplateRegistry } from "../../services/admissions-bulk/admission-template-registry";
import { AdmissionPaperFormsService } from "../../services/admissions-bulk/admission-paper-forms.service";
import { AdmissionWorkbookParser } from "../../services/admissions-bulk/admission-workbook-parser";
import { AdmissionValidationEngine } from "../../services/admissions-bulk/admission-validation-engine";
import { AdmissionRegistrationService } from "../../services/admissions-bulk/admission-registration-service";
import { AdmissionFeeConfigService } from "../../services/admissions-bulk/admission-fee-config.service";
import { AdmissionPdfService } from "../../services/admissions-bulk/admission-pdf.service";

const router = Router();

// ─────────────────────────────────────────────────────────────
// PERMISSION & RBAC ARCHITECTURE
// ─────────────────────────────────────────────────────────────

export type AdmissionPermission =
  | "ADMISSION_VIEW"
  | "ADMISSION_CREATE"
  | "ADMISSION_IMPORT"
  | "ADMISSION_EDIT"
  | "ADMISSION_VERIFY"
  | "ADMISSION_APPROVE"
  | "STUDENT_REGISTER"
  | "ADMISSION_FEE_MANAGE";

const ROLE_PERMISSIONS: Record<string, AdmissionPermission[]> = {
  SUPER_ADMIN: [
    "ADMISSION_VIEW",
    "ADMISSION_CREATE",
    "ADMISSION_IMPORT",
    "ADMISSION_EDIT",
    "ADMISSION_VERIFY",
    "ADMISSION_APPROVE",
    "STUDENT_REGISTER",
    "ADMISSION_FEE_MANAGE",
  ],
  ERP_ADMIN: [
    "ADMISSION_VIEW",
    "ADMISSION_CREATE",
    "ADMISSION_IMPORT",
    "ADMISSION_EDIT",
    "ADMISSION_VERIFY",
    "ADMISSION_APPROVE",
    "STUDENT_REGISTER",
    "ADMISSION_FEE_MANAGE",
  ],
  ADMIN: [
    "ADMISSION_VIEW",
    "ADMISSION_CREATE",
    "ADMISSION_IMPORT",
    "ADMISSION_EDIT",
    "ADMISSION_VERIFY",
    "ADMISSION_APPROVE",
    "STUDENT_REGISTER",
    "ADMISSION_FEE_MANAGE",
  ],
  RECEPTIONIST: [
    "ADMISSION_VIEW",
    "ADMISSION_CREATE",
  ],
  ACCOUNTANT: [
    "ADMISSION_VIEW",
  ],
  TEACHER: [],
  STUDENT: [],
  PARENT: [],
};

export function requireAdmissionPermission(perm: AdmissionPermission) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    const role = req.user.role || "";
    const allowedPerms = ROLE_PERMISSIONS[role] || [];
    if (allowedPerms.includes(perm) || role === "SUPER_ADMIN") {
      next();
      return;
    }
    res.status(403).json({
      success: false,
      error: `Forbidden — missing required permission '${perm}' for role '${role}'`,
    });
  };
}

// Multer memory storage for in-memory safe parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const isAllowed =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      /\.(xlsx|xls|csv|zip)$/i.test(file.originalname);

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel (.xlsx, .xls), CSV (.csv), or Multi-File CSV ZIP (.zip) packages are accepted."));
    }
  },
});

// ─────────────────────────────────────────────────────────────
// 1. TEMPLATES CATALOG & DOWNLOAD
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/templates
 * Lists the 3 official admission templates with metadata and versioning
 */
router.get("/templates", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (_req: AuthRequest, res: Response) => {
  try {
    const templates = AdmissionTemplateRegistry.listTemplates();
    res.json({
      success: true,
      data: templates,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to list admission templates");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/templates/:type
 * Downloads the blank, formatted template for a specific admission workflow.
 * Supports query param ?format=xlsx (default), ?format=csv, or ?format=zip
 */
router.get("/templates/:type", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const rawType = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
    const type = (rawType || "").toUpperCase() as AdmissionType;
    const format = ((req.query.format as string) || "xlsx").toLowerCase();

    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid template type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }

    if (format === "csv") {
      const csvContent = AdmissionTemplateRegistry.generateCsvBuffer(type);
      res.setHeader("Content-Disposition", `attachment; filename="SSVM_${type}_Admission_Template.csv"`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.send(csvContent);
      return;
    }

    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    });
    const classNames = classes.map((c) => c.name);

    if (format === "zip") {
      const buffer = await AdmissionTemplateRegistry.generateCsvPackageZipBuffer(
        type,
        classNames.length > 0 ? classNames : undefined
      );
      res.setHeader("Content-Disposition", `attachment; filename="SSVM_${type}_Admission_CSV_Package.zip"`);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
      return;
    }

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
 * GET /api/v1/admin/admissions/bulk/templates/:type/csv
 * Dedicated endpoint to download single-file CSV template
 */
router.get("/templates/:type/csv", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const rawType = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
    const type = (rawType || "").toUpperCase() as AdmissionType;
    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid template type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }
    const csvContent = AdmissionTemplateRegistry.generateCsvBuffer(type);
    res.setHeader("Content-Disposition", `attachment; filename="SSVM_${type}_Admission_Template.csv"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(csvContent);
  } catch (err: any) {
    logger.error({ err }, "Failed to generate CSV admission template");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/templates/:type/zip
 * Dedicated endpoint to download multi-file CSV ZIP package template
 */
router.get("/templates/:type/zip", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const rawType = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
    const type = (rawType || "").toUpperCase() as AdmissionType;
    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid template type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    });
    const classNames = classes.map((c) => c.name);
    const buffer = await AdmissionTemplateRegistry.generateCsvPackageZipBuffer(
      type,
      classNames.length > 0 ? classNames : undefined
    );
    res.setHeader("Content-Disposition", `attachment; filename="SSVM_${type}_Admission_CSV_Package.zip"`);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err: any) {
    logger.error({ err }, "Failed to generate CSV package ZIP admission template");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/forms/:type/print
 * Renders complete printable A4 HTML Paper Form.
 * Authoritatively resolves fee from snapshot or tenant config — caller cannot override fee!
 */
router.get("/forms/:type/print", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const type = (req.params.type as string).toUpperCase() as "NEW" | "READMISSION" | "TRANSFER";
    const session = req.query.session as string | undefined;
    const formNumber = (req.query.formNumber as string)?.trim() || undefined;

    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid form type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }

    const html = await AdmissionPaperFormsService.renderForm(schoolId, type, {
      academicSession: session,
      formNumber,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err: any) {
    logger.error({ err }, "Failed to render paper admission form");
    const status = err.message?.includes("not found") ? 404 : err.message?.includes("mismatch") ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/forms/:type/pdf
 * Generates and downloads genuine standards-compliant binary PDF (%PDF-1.4).
 * Authoritatively resolves fee from snapshot or tenant config — caller cannot override fee!
 */
router.get("/forms/:type/pdf", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const type = (req.params.type as string).toUpperCase() as "NEW" | "READMISSION" | "TRANSFER";
    const session = req.query.session as string | undefined;
    const formNumber = (req.query.formNumber as string)?.trim() || undefined;

    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid form type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }

    const pdfBuffer = await AdmissionPdfService.generateFormPdf(schoolId, type, {
      academicSession: session,
      formNumber,
    });

    const filename = `SSVM_Admission_Form_${type}_${session || "2026-2027"}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    logger.error({ err }, "Failed to generate admission form PDF");
    const status = err.message?.includes("not found") ? 404 : err.message?.includes("mismatch") ? 400 : 500;
    res.status(status).json({ success: false, error: err.message || "Failed to generate PDF." });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. WORKBOOK PARSE & PREVIEW VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/admissions/bulk/preview
 * Analyzes uploaded workbook, verifies structure, validates attributes & relations, checks duplicates
 */
router.post("/preview", [authenticate, requireAdmissionPermission("ADMISSION_IMPORT")], upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, error: "No Excel workbook uploaded." });
      return;
    }

    const fileHash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    const parsed = await AdmissionWorkbookParser.parseWorkbook(req.file.buffer, req.file.originalname);
    const validationSummary = await AdmissionValidationEngine.validateWorkbook(schoolId, parsed, parsed.batchId || "");

    res.json({
      success: true,
      data: {
        batchId: parsed.batchId,
        admissionType: parsed.admissionType,
        templateVersion: parsed.templateVersion,
        totalRows: parsed.totalRows,
        fileHash,
        validRows: validationSummary.validRows,
        invalidRows: validationSummary.invalidRows,
        warningRows: validationSummary.warningRows,
        duplicateReviewRows: validationSummary.duplicateReviewRows,
        readyToRegisterCount: validationSummary.readyToRegisterCount,
        entries: validationSummary.entries.map((e) => ({
          importKey: e.importKey,
          rowNumber: e.sourceRowNumber,
          applicantName: e.student.name,
          applyingForClass: e.placement?.className || "",
          admissionType: parsed.admissionType,
          status: e.status,
          errors: e.errors,
          warnings: e.warnings,
          existingStudentId: e.resolvedStudentId,
          permanentAdmissionNumber: e.student.existingAdmissionNo,
          duplicateMatches: 0,
        })),
        summaryErrors: validationSummary.summaryErrors,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Bulk admission preview parsing failed");
    res.status(400).json({ success: false, error: err.message || "Failed to parse workbook." });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. TRANSACTIONAL REGISTRATION COMMIT
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/admissions/bulk/commit
 * Commits approved admission records inside tenant-isolated database transactions
 */
router.post("/commit", [authenticate, requireAdmissionPermission("STUDENT_REGISTER")], upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;

    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, error: "Workbook file is required to commit registration." });
      return;
    }

    let attestation: OfflineApprovalAttestation;
    try {
      attestation = typeof req.body.attestation === "string" ? JSON.parse(req.body.attestation) : req.body.attestation;
    } catch {
      res.status(400).json({ success: false, error: "Invalid offline approval attestation payload." });
      return;
    }

    if (!attestation || (!attestation.attested && !(attestation as any).isApprovedOffline)) {
      res.status(400).json({
        success: false,
        error: "Physical offline approval attestation is mandatory for student admission registration.",
      });
      return;
    }

    const parsed = await AdmissionWorkbookParser.parseWorkbook(req.file.buffer, req.file.originalname);
    const validated = await AdmissionValidationEngine.validateWorkbook(schoolId, parsed, parsed.batchId || "");

    const validEntries = validated.entries.filter((e) => e.status === "VALID");
    if (validEntries.length === 0) {
      res.status(400).json({
        success: false,
        error: "No valid rows available to register in this workbook.",
        validationSummary: validated,
      });
      return;
    }

    const result = await AdmissionRegistrationService.commitBatch(
      schoolId,
      parsed.batchId || "",
      parsed.admissionType || "NEW",
      attestation,
      validEntries
    );

    res.json({
      success: true,
      data: {
        batchId: parsed.batchId,
        totalCommitted: result.successCount,
        totalFailed: result.failedCount,
        registeredStudents: result.results.filter((r) => r.status === "REGISTERED"),
        failedRegistrations: result.results.filter((r) => r.status === "FAILED"),
      },
      message: `Successfully registered ${result.successCount} students under offline register ${attestation.approvalRegisterNumber || ""}.`,
    });
  } catch (err: any) {
    logger.error({ err }, "Bulk admission commit failed");
    res.status(500).json({ success: false, error: err.message || "Failed to commit admission registrations." });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. IMPORT BATCH HISTORY & AUDIT
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/history
 * Retrieves historical bulk registration batches for the authenticated institution
 */
router.get("/history", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
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
router.get("/history/:jobId", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
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

// ─────────────────────────────────────────────────────────────
// 5. APPLICATION FEE CONFIGURATION & IMMUTABLE ISSUANCE
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/fee
 * Retrieves current institutional application fee and fee modification audit history
 */
router.get("/fee", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const currentFee = await AdmissionFeeConfigService.getApplicationFee(schoolId);
    const history = await AdmissionFeeConfigService.getFeeAuditHistory(schoolId);

    res.json({
      success: true,
      data: {
        currentFee,
        applicationFee: currentFee,
        currency: "INR",
        defaultFee: AdmissionFeeConfigService.DEFAULT_FEE,
        history,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to get admission application fee");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v1/admin/admissions/bulk/fee
 * Updates application fee with explicit permission check, audit logging, and advisory lock
 */
router.put("/fee", [authenticate, requireAdmissionPermission("ADMISSION_FEE_MANAGE")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const rawAmount = req.body.amount ?? req.body.applicationFee;
    const amount = typeof rawAmount === "string" ? parseInt(rawAmount, 10) : rawAmount;
    const { reason } = req.body;

    if (amount === undefined || typeof amount !== "number" || amount < 0 || !Number.isInteger(amount)) {
      res.status(400).json({
        success: false,
        error: "Valid non-negative integer amount required for application fee.",
      });
      return;
    }

    const result = await AdmissionFeeConfigService.updateApplicationFee(
      schoolId,
      userId,
      amount,
      reason
    );

    res.json({
      success: true,
      data: {
        ...result,
        applicationFee: result.newFee,
      },
      message: `Application fee successfully updated to ₹${result.newFee}.`,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to update admission fee");
    res.status(400).json({ success: false, error: err.message || "Failed to update application fee." });
  }
});

/**
 * POST /api/v1/admin/admissions/bulk/forms/issue
 * Issues an official paper form and captures immutable fee snapshot under advisory lock
 */
router.post("/forms/issue", [authenticate, requireAdmissionPermission("ADMISSION_CREATE")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const { formType = "NEW", applicantName, academicSession } = req.body;

    const snapshot = await AdmissionFeeConfigService.issueForm(
      schoolId,
      userId,
      formType,
      applicantName,
      academicSession
    );

    res.status(201).json({
      success: true,
      data: {
        ...snapshot,
        applicationFee: snapshot.feeAmount,
      },
      message: `Issued official admission form ${snapshot.formNumber} with fee snapshot ₹${snapshot.feeAmount}.`,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to issue admission form");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. CANONICAL STUDENT ADMISSION REGISTER
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/register
 * Server-side search, filtering, and pagination for canonical Student Admission Register
 */
router.get("/register", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const skip = (page - 1) * limit;

    const {
      search,
      classId,
      className,
      sectionId,
      sessionId,
      gender,
      admissionType,
      status,
      sortBy = "admissionNo",
      sortOrder = "desc",
    } = req.query as Record<string, string | undefined>;

    const where: any = {
      schoolId,
      deletedAt: null,
    };

    if (gender && gender !== "ALL") {
      where.gender = gender;
    }

    // 1. Admission Type Filter (Backend Semantics via timelines)
    if (admissionType && admissionType !== "ALL") {
      if (admissionType === "READMISSION") {
        where.timelines = { some: { type: "READMISSION" } };
      } else if (admissionType === "TRANSFER") {
        where.timelines = { some: { type: "TRANSFER_ADMISSION" } };
      } else if (admissionType === "NEW") {
        where.timelines = { none: { type: { in: ["READMISSION", "TRANSFER_ADMISSION"] } } };
      }
    }

    // 2. Status Filter (Real backend semantics)
    if (status && status !== "ALL") {
      if (status === "ACTIVE") {
        where.isActive = true;
      } else if (status === "INACTIVE") {
        where.isActive = false;
      } else if (status === "ALUMNI") {
        where.OR = [
          { user: { alumni: { isNot: null } } },
          { timelines: { some: { type: "ALUMNI" } } },
        ];
      } else if (status === "TRANSFERRED") {
        where.OR = [
          { timelines: { some: { type: { in: ["TRANSFERRED", "TC_ISSUED"] } } } },
          { issuedCertificates: { some: { template: { name: { contains: "Transfer", mode: "insensitive" } } } } },
        ];
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { admissionNo: { contains: q, mode: "insensitive" } },
        { rollNo: { contains: q, mode: "insensitive" } },
        { guardian: { primaryName: { contains: q, mode: "insensitive" } } },
        { guardian: { primaryPhone: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (classId) {
      where.sectionRef = { classId };
    } else if (className && className !== "ALL") {
      where.sectionRef = { class: { name: className } };
    }

    if (sectionId && sectionId !== "ALL") {
      where.sectionId = sectionId;
    }

    if (sessionId && sessionId !== "ALL") {
      where.sectionRef = {
        ...(where.sectionRef || {}),
        class: {
          ...(where.sectionRef?.class || {}),
          sessionId,
        },
      };
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy === "name" ? "name" : "admissionNo"]: sortOrder === "asc" ? "asc" : "desc",
        },
        include: {
          sectionRef: {
            include: {
              class: {
                include: {
                  session: true,
                },
              },
            },
          },
          guardian: {
            select: {
              id: true,
              primaryName: true,
              primaryPhone: true,
              primaryEmail: true,
              primaryRelation: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
              alumni: { select: { id: true, batch: true } },
            },
          },
          timelines: {
            orderBy: { date: "desc" },
            take: 3,
          },
        },
      }),
    ]);

    // Format output with canonical fields and backward-compatible aliases
    const formatted = students.map((s) => {
      const hasReadmissionTimeline = s.timelines.some((t) => t.type === "READMISSION");
      const hasTransferTimeline = s.timelines.some((t) => t.type === "TRANSFER_ADMISSION");
      const isAlumni = (s.user as any)?.alumni !== null || s.timelines.some((t) => t.type === "ALUMNI");
      const isTransferred = s.timelines.some((t) => ["TRANSFERRED", "TC_ISSUED"].includes(t.type));

      const computedAdmissionType = hasReadmissionTimeline
        ? "READMISSION"
        : hasTransferTimeline
        ? "TRANSFER"
        : "NEW";

      const computedStatus = isAlumni
        ? "ALUMNI"
        : isTransferred
        ? "TRANSFERRED"
        : s.isActive
        ? "ACTIVE"
        : "INACTIVE";

      const nameParts = (s.name || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      return {
        id: s.id,
        name: s.name,
        firstName,
        lastName,
        admissionNo: s.admissionNo || "PENDING",
        rollNo: s.rollNo,
        gender: s.gender,
        dob: s.dob ? s.dob.toISOString().split("T")[0] : null,
        bloodGroup: s.bloodGroup,
        className: s.sectionRef?.class.name || "Unallocated",
        sectionName: s.sectionRef?.name || "-",
        sessionName: s.sectionRef?.class.session?.name || "Current",
        classId: s.sectionRef?.class.id || null,
        sectionId: s.sectionId,
        guardianName: s.guardian?.primaryName || "N/A",
        guardianPhone: s.guardian?.primaryPhone || "N/A",
        guardianRelation: s.guardian?.primaryRelation || "GUARDIAN",
        userEmail: s.user?.email || null,
        admissionType: computedAdmissionType,
        status: computedStatus,
        registeredAt: s.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        students: formatted,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch student admission register");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. DEDICATED RE-ADMISSION RECORDS ENDPOINT
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/readmissions
 * Dedicated server-side endpoint for all historical and active Re-admission records
 */
router.get("/readmissions", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();

    const where: any = {
      schoolId,
      deletedAt: null,
      timelines: {
        some: { type: "READMISSION" },
      },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { admissionNo: { contains: search, mode: "insensitive" } },
        { rollNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { admissionNo: "desc" },
        include: {
          sectionRef: {
            include: {
              class: {
                include: { session: true },
              },
            },
          },
          timelines: {
            where: { type: "READMISSION" },
            orderBy: { date: "desc" },
          },
        },
      }),
    ]);

    const formatted = students.map((s) => {
      const readmissionEvent = s.timelines[0];
      return {
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo || "PENDING",
        currentClass: s.sectionRef?.class.name || "Unallocated",
        currentSection: s.sectionRef?.name || "-",
        currentSession: s.sectionRef?.class.session?.name || "Current Session",
        reAdmittedAt: readmissionEvent?.date || s.createdAt,
        remarks: readmissionEvent?.description || "Re-enrolled student preserving permanent admission number",
        identityPreserved: true,
      };
    });

    res.json({
      success: true,
      data: {
        students: formatted,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch re-admission records");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. ADMISSION OVERVIEW & REAL INSTITUTIONAL METRICS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/overview
 * High-level admission metrics and actual institutional summary statistics
 */
router.get("/overview", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;

    const [school, totalStudents, totalAdmissions, currentFee, recentStudents] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, code: true },
      }),
      prisma.student.count({ where: { schoolId, deletedAt: null } }),
      prisma.admission.count({ where: { schoolId } }),
      AdmissionFeeConfigService.getApplicationFee(schoolId),
      prisma.student.findMany({
        where: { schoolId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          sectionRef: { include: { class: true } },
          guardian: true,
        },
      }),
    ]);

    const formsIssuedCount = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      return tx.auditLog.count({
        where: { schoolId, action: "ADMISSION_FORM_ISSUED" },
      });
    });

    const bulkBatchesCount = await prisma.bulkJob.count({
      where: { schoolId, type: { startsWith: "ADMISSION_BULK_" } },
    });

    res.json({
      success: true,
      data: {
        schoolName: school?.name || "SSVM Higher Secondary School",
        schoolCode: school?.code || "SSVM-ODISHA",
        totalStudents,
        totalStudentsRegistered: totalStudents,
        totalAdmissions,
        activeAdmissions: totalAdmissions,
        currentFee,
        applicationFee: currentFee,
        formsIssuedCount,
        totalFormsIssued: formsIssuedCount,
        bulkBatchesCount,
        recentStudents: recentStudents.map((s) => ({
          id: s.id,
          name: s.name,
          admissionNo: s.admissionNo || "N/A",
          className: s.sectionRef?.class.name || "N/A",
          sectionName: s.sectionRef?.name || "-",
          guardianName: s.guardian?.primaryName || "N/A",
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch admission overview");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. SCHOOL SHIFT CONFIGURATION
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/shifts
 * Retrieves school shift configurations (Morning / Day batch)
 */
router.get("/shifts", [authenticate, requireAdmissionPermission("ADMISSION_VIEW")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    let shifts = await prisma.schoolShift.findMany({
      where: { schoolId },
      include: {
        shiftClasses: {
          include: { class: { select: { id: true, name: true } } },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Seed default Morning & Day batches if none exist
    if (shifts.length === 0) {
      await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
        await tx.schoolShift.createMany({
          data: [
            {
              schoolId,
              name: "Morning Batch",
              type: "MORNING",
              applicableClasses: "Prarambha,Bodha,Class 1,Class 2,Class 3,Class 4,Class 5",
              startTime: "07:30",
              endTime: "12:30",
              isActive: true,
            },
            {
              schoolId,
              name: "Day Batch",
              type: "DAY",
              applicableClasses: "Class 6,Class 7,Class 8,Class 9,Class 10,Class 11,Class 12",
              startTime: "11:30",
              endTime: "16:30",
              isActive: true,
            },
          ],
        });
      });
      shifts = await prisma.schoolShift.findMany({
        where: { schoolId },
        include: {
          shiftClasses: {
            include: { class: { select: { id: true, name: true } } },
          },
        },
        orderBy: { startTime: "asc" },
      });
    }

    res.json({
      success: true,
      data: shifts,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch school shifts");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/admin/admissions/bulk/shifts
 * Creates or updates school shift batch configuration
 */
router.post("/shifts", [authenticate, requireAdmissionPermission("ADMISSION_CREATE")], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const { name, type, applicableClasses, startTime, endTime, isActive = true } = req.body;

    if (!name || !type || !applicableClasses || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: "Missing required shift fields: name, type, applicableClasses, startTime, endTime.",
      });
      return;
    }

    const shift = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const existing = await tx.schoolShift.findFirst({
        where: { schoolId, name },
      });

      let savedShift;
      if (existing) {
        savedShift = await tx.schoolShift.update({
          where: { id: existing.id },
          data: {
            type: type.toUpperCase(),
            applicableClasses,
            startTime,
            endTime,
            isActive: Boolean(isActive),
          },
        });
      } else {
        savedShift = await tx.schoolShift.create({
          data: {
            schoolId,
            name,
            type: type.toUpperCase(),
            applicableClasses,
            startTime,
            endTime,
            isActive: Boolean(isActive),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "SCHOOL_SHIFT_CONFIGURED",
          entity: "SchoolShift",
          entityId: savedShift.id,
          details: `Configured shift '${name}' (${type}) for classes [${applicableClasses}]. Time: ${startTime} - ${endTime}.`,
        },
      });

      return savedShift;
    });

    res.status(201).json({
      success: true,
      data: shift,
      message: `Successfully configured shift '${name}'.`,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to configure school shift");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 9. FACILITY REQUESTS OPERATIONAL HANDOFF (TRANSPORT & HOSTEL)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/facilities/pending
 * Retrieves students requiring facilities (Transport / Hostel / Meals) awaiting operational allocation
 */
router.get("/facilities/pending", [authenticate], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const facilityType = (req.query.facilityType as string)?.toUpperCase();
    const status = (req.query.status as string)?.toUpperCase() || "REQUESTED";
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "25", 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      schoolId,
      ...(facilityType && { facilityType }),
      ...(status !== "ALL" && { status }),
    };

    const [total, requests] = await Promise.all([
      prisma.facilityRequest.count({ where: whereClause }),
      prisma.facilityRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              admissionNo: true,
              rollNo: true,
              locality: true,
              address: true,
              emergencyPhone: true,
              gender: true,
              sectionRef: {
                select: {
                  name: true,
                  class: { select: { name: true } },
                },
              },
              enrollments: {
                where: { status: "ACTIVE" },
                select: {
                  shift: { select: { name: true, type: true, startTime: true, endTime: true } },
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        requests: requests.map((r) => ({
          id: r.id,
          facilityType: r.facilityType,
          status: r.status,
          details: r.details,
          notes: r.notes,
          batchId: r.batchId,
          createdAt: r.createdAt,
          student: {
            id: r.student.id,
            name: r.student.name,
            admissionNo: r.student.admissionNo || "N/A",
            rollNo: r.student.rollNo,
            className: r.student.sectionRef?.class.name || "N/A",
            sectionName: r.student.sectionRef?.name || "-",
            locality: r.student.locality || "N/A",
            address: r.student.address,
            phone: r.student.emergencyPhone,
            shiftName: r.student.enrollments[0]?.shift?.name || "Morning Batch",
            shiftTime: r.student.enrollments[0]?.shift
              ? `${r.student.enrollments[0].shift.startTime} - ${r.student.enrollments[0].shift.endTime}`
              : "07:30 - 12:30",
          },
        })),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch pending facility requests");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/v1/admin/admissions/bulk/facilities/:id/status
 * Operational department (Transport/Hostel staff) updates facility request review/allocation status
 */
router.patch("/facilities/:id/status", [authenticate], async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, notes } = req.body;

    const validStatuses = [
      "REQUESTED",
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED",
      "ALLOCATED",
      "CANCELLED",
    ];

    if (!validStatuses.includes((status || "").toUpperCase())) {
      res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}.`,
      });
      return;
    }

    const updated = await runWithTenantDatabaseTransaction(schoolId, async (tx) => {
      const existing = await tx.facilityRequest.findFirst({
        where: { id, schoolId },
      });

      if (!existing) {
        throw new Error(`Facility request ${id} not found for this institution.`);
      }

      const resRecord = await tx.facilityRequest.update({
        where: { id },
        data: {
          status: status.toUpperCase(),
          reviewedById: userId,
          reviewedAt: new Date(),
          ...(notes && { notes }),
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "FACILITY_REQUEST_STATUS_UPDATED",
          entity: "FacilityRequest",
          entityId: id,
          details: `Updated ${existing.facilityType} request status to ${status.toUpperCase()}. Notes: ${notes || "None"}.`,
        },
      });

      return resRecord;
    });

    res.json({
      success: true,
      data: updated,
      message: `Facility request updated to ${status.toUpperCase()}.`,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to update facility request status");
    const statusCode = err.message?.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

export default router;
