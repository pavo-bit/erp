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
 * Renders complete printable A4 HTML Paper Form for offline admissions.
 * Accurately displays the active application fee snapshot.
 */
router.get("/forms/:type/print", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const type = (req.params.type as string).toUpperCase() as "NEW" | "READMISSION" | "TRANSFER";
    const session = req.query.session as string | undefined;
    const formNumber = req.query.formNumber as string | undefined;
    const feeParam = req.query.fee ? parseInt(req.query.fee as string, 10) : undefined;

    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid form type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }

    const html = await AdmissionPaperFormsService.renderForm(schoolId, type, {
      academicSession: session,
      formNumber,
      applicationFee: feeParam,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err: any) {
    logger.error({ err }, "Failed to render paper admission form");
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/admin/admissions/bulk/forms/:type/pdf
 * Generates and downloads genuine standards-compliant binary PDF (%PDF-1.4)
 */
router.get("/forms/:type/pdf", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const type = (req.params.type as string).toUpperCase() as "NEW" | "READMISSION" | "TRANSFER";
    const session = req.query.session as string | undefined;
    const formNumber = req.query.formNumber as string | undefined;
    const feeParam = req.query.fee ? parseInt(req.query.fee as string, 10) : undefined;

    if (!["NEW", "READMISSION", "TRANSFER"].includes(type)) {
      res.status(400).json({ success: false, error: "Invalid form type. Choose NEW, READMISSION, or TRANSFER." });
      return;
    }

    const pdfBuffer = await AdmissionPdfService.generateFormPdf(schoolId, type, {
      academicSession: session,
      formNumber,
      applicationFee: feeParam,
    });

    const filename = `SSVM_Admission_Form_${type}_${session || "2026-2027"}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    logger.error({ err }, "Failed to generate admission form PDF");
    res.status(500).json({ success: false, error: err.message || "Failed to generate PDF." });
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

// ─────────────────────────────────────────────────────────────
// 5. APPLICATION FEE CONFIGURATION & IMMUTABLE ISSUANCE
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/fee
 * Retrieves current institutional application fee and fee modification audit history
 */
router.get("/fee", adminGuard, async (req: AuthRequest, res: Response) => {
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
 * Updates application fee with required permission check, audit log, and reason tracking
 */
router.put("/fee", [authenticate, requireRole("SUPER_ADMIN", "ADMIN", "ERP_ADMIN")], async (req: AuthRequest, res: Response) => {
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
 * Issues an official paper form and captures immutable fee snapshot
 */
router.post("/forms/issue", adminGuard, async (req: AuthRequest, res: Response) => {
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
router.get("/register", adminGuard, async (req: AuthRequest, res: Response) => {
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

    if (status === "ACTIVE") {
      where.isActive = true;
    } else if (status === "INACTIVE") {
      where.isActive = false;
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
          [sortBy === "name" ? "name" : sortBy === "createdAt" ? "createdAt" : "admissionNo"]:
            sortOrder === "asc" ? "asc" : "desc",
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
            },
          },
          timelines: {
            orderBy: { date: "desc" },
            take: 2,
          },
        },
      }),
    ]);

    // Format output with computed admission type and placement details
    const formatted = students.map((s) => {
      const hasReadmissionTimeline = s.timelines.some((t) => t.type === "READMISSION");
      const hasTransferTimeline = s.timelines.some((t) => t.type === "TRANSFER_ADMISSION");
      const computedAdmissionType = hasReadmissionTimeline
        ? "READMISSION"
        : hasTransferTimeline
        ? "TRANSFER"
        : "NEW";

      return {
        id: s.id,
        name: s.name,
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
        status: s.isActive ? "ACTIVE" : "INACTIVE",
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
// 7. ADMISSION OVERVIEW & RE-ADMISSION RECORDS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/admissions/bulk/overview
 * High-level admission metrics and summary statistics
 */
router.get("/overview", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;

    const [totalStudents, totalAdmissions, currentFee, recentStudents] = await Promise.all([
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

export default router;
