/**
 * ssvm-backend/src/routes/admin/import.ts
 *
 * Universal bulk data import API:
 * - Template schema and file downloads (.xlsx & .csv)
 * - File parsing with non-compacting column index preservation
 * - Column mapping, validation engine, duplicate detector, and preview
 * - Transactional execution through canonical services
 * - Audit job tracking and error export
 */

import { Router, Response } from "express";
import { authenticate, AuthRequest, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { multerUpload } from "../../middleware/upload";
import logger from "../../lib/logger";
import prisma from "../../lib/prisma";
import { TemplateRegistryService } from "../../services/import-framework/template-registry";
import { TemplateGeneratorService } from "../../services/import-framework/template-generator";
import { FileParserService } from "../../services/import-framework/file-parser";
import { ColumnMapperService } from "../../services/import-framework/column-mapper";
import { ValidationEngineService } from "../../services/import-framework/validation-engine";
import { DuplicateDetectorService } from "../../services/import-framework/duplicate-detector";
import { ImportProcessorService } from "../../services/import-framework/import-processor";

const router = Router();
const adminGuard = [authenticate, requireRole(Role.ERP_ADMIN, Role.SUPER_ADMIN)];

// 1. GET /templates — List all import modules
router.get("/templates", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const templates = TemplateRegistryService.getAllTemplates();
    res.json({
      success: true,
      data: templates.map((t) => ({
        moduleId: t.moduleId,
        moduleName: t.moduleName,
        category: t.category,
        description: t.description,
        totalFields: t.fields.length,
        requiredFieldsCount: t.fields.filter((f) => f.required).length,
      })),
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch import templates");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 2. GET /templates/:module — Get template details
router.get("/templates/:module", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const moduleParam = req.params.module as string;
    const template = TemplateRegistryService.getTemplate(moduleParam);
    if (!template) {
      res.status(404).json({ success: false, error: `Module "${moduleParam}" is not supported for bulk import.` });
      return;
    }
    res.json({ success: true, data: template });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 3. GET /templates/:module/download — Download real .xlsx or .csv template
router.get("/templates/:module/download", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const moduleParam = req.params.module as string;
    const template = TemplateRegistryService.getTemplate(moduleParam);
    if (!template) {
      res.status(404).json({ success: false, error: "Template not found" });
      return;
    }

    const format = (req.query.format as string)?.toLowerCase() || "xlsx";

    if (format === "csv") {
      const csvData = TemplateGeneratorService.generateCsvTemplate(template);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${template.moduleId}_import_template.csv"`);
      res.send(csvData);
    } else {
      const xlsxBuffer = await TemplateGeneratorService.generateExcelTemplate(template);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${template.moduleId}_import_template.xlsx"`);
      res.send(xlsxBuffer);
    }
  } catch (err: any) {
    logger.error({ err }, "Failed to download import template");
    res.status(500).json({ success: false, error: "Failed to generate template" });
  }
});

// 4. POST /preview — Upload file and get structured validation preview
router.post(
  "/preview",
  adminGuard,
  multerUpload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user!.schoolId!;
      const moduleId = req.body.moduleId;

      if (!moduleId) {
        res.status(400).json({ success: false, error: "Missing required field 'moduleId'." });
        return;
      }

      const template = TemplateRegistryService.getTemplate(moduleId);
      if (!template) {
        res.status(400).json({ success: false, error: `Unsupported import module "${moduleId}".` });
        return;
      }

      if (!req.file || !req.file.buffer) {
        res.status(400).json({ success: false, error: "No file uploaded. Please upload a .xlsx or .csv file." });
        return;
      }

      // Parse user overrides if provided
      let userOverrides: Record<string, string> = {};
      if (req.body.columnOverrides) {
        try {
          userOverrides = typeof req.body.columnOverrides === "string"
            ? JSON.parse(req.body.columnOverrides)
            : req.body.columnOverrides;
        } catch {
          // ignore invalid json overrides
        }
      }

      // Step 1: Parse file with strict column position tracking (NEVER compact rows)
      const parseResult = await FileParserService.parseBuffer(req.file.buffer, req.file.originalname);

      // Step 2: Auto-map columns
      const mapping = ColumnMapperService.autoMap(parseResult.headers, template, userOverrides);

      // Step 3: Map row keys to canonical fields
      const mappedRows = parseResult.rows.map((r) => ({
        rowNumber: r.rowNumber,
        mappedValues: ColumnMapperService.mapRow(r.rawValues, mapping.headerToField),
        rawValues: r.rawValues,
      }));

      // Step 4: Validate rows against schema and tenant context
      const validatedRows = await ValidationEngineService.validateRows(
        schoolId,
        mappedRows,
        template
      );

      // Step 5: Duplicate detection (intra-file and DB check)
      const classifiedRows = await DuplicateDetectorService.classifyRows(
        schoolId,
        validatedRows,
        template
      );

      const totalRows = classifiedRows.length;
      const validRows = classifiedRows.filter((r) => r.isValid).length;
      const invalidRows = classifiedRows.filter((r) => !r.isValid).length;
      const createCount = classifiedRows.filter((r) => r.isValid && r.action === "CREATE").length;
      const updateCount = classifiedRows.filter((r) => r.isValid && r.action === "UPDATE").length;
      const duplicateFileCount = classifiedRows.filter((r) => r.action === "DUPLICATE_FILE").length;

      res.json({
        success: true,
        data: {
          moduleId,
          filename: req.file.originalname,
          mapping,
          summary: {
            totalRows,
            validRows,
            invalidRows,
            createCount,
            updateCount,
            duplicateFileCount,
          },
          // Send first 50 rows for preview inspection
          sampleRows: classifiedRows.slice(0, 50).map((r) => ({
            rowNumber: r.rowNumber,
            isValid: r.isValid,
            action: r.action,
            values: r.sanitizedValues,
            errors: r.errors,
          })),
          // Send all classified rows serialized so client can confirm execution
          classifiedRows,
        },
      });
    } catch (err: any) {
      logger.error({ err }, "Import preview failed");
      res.status(400).json({ success: false, error: err.message || "Failed to process import preview." });
    }
  }
);

// 5. POST /process — Execute import with verified rows
router.post("/process", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id || (req.user as any).userId;
    const { moduleId, classifiedRows, clearEmptyFields, skipInvalidRows } = req.body;

    if (!moduleId || !Array.isArray(classifiedRows)) {
      res.status(400).json({ success: false, error: "Missing required fields 'moduleId' or 'classifiedRows'." });
      return;
    }

    const template = TemplateRegistryService.getTemplate(moduleId);
    if (!template) {
      res.status(400).json({ success: false, error: `Unsupported import module "${moduleId}".` });
      return;
    }

    const result = await ImportProcessorService.executeImport(
      schoolId,
      userId,
      template,
      classifiedRows,
      {
        clearEmptyFields: Boolean(clearEmptyFields),
        skipInvalidRows: skipInvalidRows !== false,
      }
    );

    res.json({
      success: true,
      message: `Successfully processed ${result.successCount} of ${result.totalRows} rows (${result.createdCount} created, ${result.updatedCount} updated, ${result.failedCount} rejected).`,
      data: result,
    });
  } catch (err: any) {
    logger.error({ err }, "Import execution failed");
    res.status(500).json({ success: false, error: err.message || "Import execution failed." });
  }
});

// 6. GET /jobs — Recent bulk import jobs
router.get("/jobs", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const jobs = await prisma.bulkJob.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 7. GET /jobs/:id/errors — Export protected error logs
router.get("/jobs/:id/errors", adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const jobId = req.params.id as string;
    const job = await prisma.bulkJob.findFirst({
      where: { id: jobId, schoolId },
    });

    if (!job) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }

    let errorData: any[] = [];
    if (job.errorFile) {
      try {
        errorData = JSON.parse(job.errorFile);
      } catch {
        errorData = [{ error: job.errorFile }];
      }
    }

    res.json({ success: true, data: errorData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;

