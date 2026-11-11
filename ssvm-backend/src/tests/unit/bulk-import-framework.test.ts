/**
 * ssvm-backend/src/tests/unit/bulk-import-framework.test.ts
 *
 * Verifies Universal Bulk Import Architecture:
 * - Excel (.xlsx) and CSV (.csv) parsing with strict column alignment
 * - Empty cells remain associated with original column (NEVER compacted or shifted)
 * - Empty optional cells map to database NULL (never literal "N/A")
 * - Missing mandatory values trigger validation errors
 * - Column mapping with aliases and manual overrides
 * - Intra-file and DB duplicate detection
 * - Clear empty fields toggle: disabled by default (preserves existing values); enabled clears to NULL
 * - Template generation (.xlsx and .csv)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TemplateRegistryService } from "../../services/import-framework/template-registry";
import { TemplateGeneratorService } from "../../services/import-framework/template-generator";
import { FileParserService } from "../../services/import-framework/file-parser";
import { ColumnMapperService } from "../../services/import-framework/column-mapper";
import { ValidationEngineService } from "../../services/import-framework/validation-engine";
import { DuplicateDetectorService } from "../../services/import-framework/duplicate-detector";
import { ImportProcessorService } from "../../services/import-framework/import-processor";
import { getTestPrisma } from "../helpers/testApp";
import ExcelJS from "exceljs";

describe("Universal Bulk Import Framework", () => {
  const prisma = getTestPrisma();
  let schoolId: string;

  beforeEach(async () => {
    schoolId = `school_import_${Date.now()}`;
    await prisma.school.create({
      data: {
        id: schoolId,
        name: "Import Test School",
        code: `ITS-${Date.now()}`,
      },
    });

    const session = await prisma.academicSession.create({
      data: {
        schoolId,
        name: "2026-2027",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });

    // Create a test class
    await prisma.class.create({
      data: {
        schoolId,
        sessionId: session.id,
        name: "Class 10",
        sections: {
          create: [{ name: "A", capacity: 40 }],
        },
      },
    });
  });

  describe("Template Registry & File Generation", () => {
    it("returns schema definitions for all core modules", () => {
      const template = TemplateRegistryService.getTemplate("students");
      expect(template).toBeDefined();
      expect(template?.moduleId).toBe("students");
      expect(template?.fields.some((f) => f.name === "rollNo")).toBe(true);

      const all = TemplateRegistryService.getAllTemplates();
      expect(all.length).toBeGreaterThanOrEqual(6);
    });

    it("generates downloadable Excel workbook buffer with headers and sample data", async () => {
      const template = TemplateRegistryService.getTemplate("students")!;
      const buffer = await TemplateGeneratorService.generateExcelTemplate(template);

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(100);

      // Verify generated workbook can be parsed back
      const parsed = await FileParserService.parseBuffer(buffer, "template.xlsx");
      expect(parsed.headers.length).toBe(template.fields.length);
      expect(parsed.totalRows).toBe(1); // sample row
    });

    it("generates downloadable CSV template string", () => {
      const template = TemplateRegistryService.getTemplate("students")!;
      const csv = TemplateGeneratorService.generateCsvTemplate(template);

      expect(csv).toContain("Student Name");
      expect(csv).toContain("Roll Number");
    });
  });

  describe("Non-Compacting Column Position Parsing", () => {
    it("preserves column positions when cells are empty in Excel (never compacts or shifts)", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Students");

      sheet.addRow(["Student Name", "Email", "Phone", "Class Name"]);
      // Row 1: Student A, has Email, missing Phone, has Class Name
      sheet.addRow(["Student A", "studentA@test.com", null, "Class 10"]);
      // Row 2: Student B, missing Email, has Phone, has Class Name
      sheet.addRow(["Student B", null, "9876543210", "Class 10"]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await FileParserService.parseBuffer(buffer, "test.xlsx");

      expect(result.rows.length).toBe(2);

      // Verify Student A: Phone is null, Class Name is NOT shifted into Phone
      const row1 = result.rows[0].rawValues;
      expect(row1["Student Name"]).toBe("Student A");
      expect(row1["Email"]).toBe("studentA@test.com");
      expect(row1["Phone"]).toBeNull();
      expect(row1["Class Name"]).toBe("Class 10");

      // Verify Student B: Email is null, Phone is NOT shifted into Email
      const row2 = result.rows[1].rawValues;
      expect(row2["Student Name"]).toBe("Student B");
      expect(row2["Email"]).toBeNull();
      expect(row2["Phone"]).toBe("9876543210");
      expect(row2["Class Name"]).toBe("Class 10");
    });

    it("preserves column positions in CSV with empty tokens (,,)", async () => {
      const csv = `Student Name,Email,Phone,Class Name\nStudent A,studentA@test.com,,Class 10\nStudent B,,9876543210,Class 10\n`;
      const buffer = Buffer.from(csv, "utf-8");
      const result = await FileParserService.parseBuffer(buffer, "test.csv");

      expect(result.rows.length).toBe(2);
      expect(result.rows[0].rawValues["Phone"]).toBeNull();
      expect(result.rows[0].rawValues["Class Name"]).toBe("Class 10");

      expect(result.rows[1].rawValues["Email"]).toBeNull();
      expect(result.rows[1].rawValues["Phone"]).toBe("9876543210");
    });

    it("sanitizes literal 'N/A' to database NULL", async () => {
      const csv = `Student Name,Roll Number,Class Name,Admission Number\nStudent C,STU-C,Class 10,N/A\n`;
      const result = await FileParserService.parseBuffer(Buffer.from(csv), "test.csv");

      expect(result.rows[0].rawValues["Admission Number"]).toBeNull();
    });
  });

  describe("Column Mapping & Validation Engine", () => {
    it("auto-maps header aliases to canonical fields", () => {
      const template = TemplateRegistryService.getTemplate("students")!;
      const headers = ["full name", "roll number", "standard", "contact"];
      const mapping = ColumnMapperService.autoMap(headers, template);

      expect(mapping.headerToField["full name"]).toBe("name");
      expect(mapping.headerToField["roll number"]).toBe("rollNo");
      expect(mapping.headerToField["standard"]).toBe("className");
      expect(mapping.headerToField["contact"]).toBe("phone");
    });

    it("rejects rows missing mandatory fields", async () => {
      const template = TemplateRegistryService.getTemplate("students")!;
      const rows = [
        {
          rowNumber: 2,
          mappedValues: {
            name: "Incomplete Student",
            // missing rollNo and className!
          },
        },
      ];

      const validated = await ValidationEngineService.validateRows(schoolId, rows, template);
      expect(validated[0].isValid).toBe(false);
      expect(validated[0].errors.some((e) => e.field === "rollNo")).toBe(true);
      expect(validated[0].errors.some((e) => e.field === "className")).toBe(true);
    });

    it("validates foreign key relational placement in tenant context", async () => {
      const template = TemplateRegistryService.getTemplate("students")!;
      const rows = [
        {
          rowNumber: 2,
          mappedValues: {
            name: "Valid Class Student",
            rollNo: "R-101",
            className: "Class 10", // exists!
          },
        },
        {
          rowNumber: 3,
          mappedValues: {
            name: "Ghost Class Student",
            rollNo: "R-102",
            className: "NonExistent Class 99", // does not exist!
          },
        },
      ];

      const validated = await ValidationEngineService.validateRows(schoolId, rows, template);
      expect(validated[0].isValid).toBe(true);
      expect(validated[1].isValid).toBe(false);
      expect(validated[1].errors[0].message).toContain("does not exist in this institution");
    });
  });

  describe("Duplicate Detection & Classification", () => {
    it("flags intra-file duplicate unique keys as DUPLICATE_FILE", async () => {
      const template = TemplateRegistryService.getTemplate("students")!;
      const rows = [
        { rowNumber: 2, mappedValues: { name: "Student 1", rollNo: "R-DUP", className: "Class 10" } },
        { rowNumber: 3, mappedValues: { name: "Student 2", rollNo: "R-DUP", className: "Class 10" } }, // Duplicate!
      ];

      const validated = await ValidationEngineService.validateRows(schoolId, rows, template);
      const classified = await DuplicateDetectorService.classifyRows(schoolId, validated, template);

      expect(classified[0].action).toBe("CREATE");
      expect(classified[1].action).toBe("DUPLICATE_FILE");
      expect(classified[1].isValid).toBe(false);
    });

    it("detects existing DB record and classifies as UPDATE", async () => {
      // Pre-create student
      await prisma.student.create({
        data: {
          schoolId,
          name: "Existing Student",
          rollNo: "R-EXISTING",
          isActive: true,
        },
      });

      const template = TemplateRegistryService.getTemplate("students")!;
      const rows = [
        { rowNumber: 2, mappedValues: { name: "Updated Name", rollNo: "R-EXISTING", className: "Class 10" } },
      ];

      const validated = await ValidationEngineService.validateRows(schoolId, rows, template);
      const classified = await DuplicateDetectorService.classifyRows(schoolId, validated, template);

      expect(classified[0].action).toBe("UPDATE");
      expect(classified[0].existingRecordId).toBeDefined();
    });
  });

  describe("Transactional Execution & Clear Empty Fields Policy", () => {
    it("preserves existing values on UPDATE when clearEmptyFields is false (default)", async () => {
      // Create student with admission number
      const existing = await prisma.student.create({
        data: {
          schoolId,
          name: "Original Name",
          rollNo: "R-POLICY-1",
          admissionNo: "ADM-9999",
          isActive: true,
        },
      });

      const template = TemplateRegistryService.getTemplate("students")!;
      const rows = [
        {
          rowNumber: 2,
          isValid: true,
          action: "UPDATE" as const,
          existingRecordId: existing.id,
          sanitizedValues: {
            name: "Updated Name Only",
            rollNo: "R-POLICY-1",
            admissionNo: null, // empty in uploaded update row!
          },
          errors: [],
        },
      ];

      // Execute import with clearEmptyFields = false
      const result = await ImportProcessorService.executeImport(schoolId, "user-test", template, rows, {
        clearEmptyFields: false,
        skipInvalidRows: true,
      });

      expect(result.successCount).toBe(1);

      // Verify admissionNo was NOT cleared
      const updated = await prisma.student.findUnique({ where: { id: existing.id } });
      expect(updated?.name).toBe("Updated Name Only");
      expect(updated?.admissionNo).toBe("ADM-9999"); // PRESERVED!
    });

    it("clears optional fields to NULL when clearEmptyFields is explicitly enabled", async () => {
      const existing = await prisma.student.create({
        data: {
          schoolId,
          name: "Original Name",
          rollNo: "R-POLICY-2",
          admissionNo: "ADM-8888",
          isActive: true,
        },
      });

      const template = TemplateRegistryService.getTemplate("students")!;
      const rows = [
        {
          rowNumber: 2,
          isValid: true,
          action: "UPDATE" as const,
          existingRecordId: existing.id,
          sanitizedValues: {
            name: "Updated Name",
            rollNo: "R-POLICY-2",
            admissionNo: null,
          },
          errors: [],
        },
      ];

      // Execute import with clearEmptyFields = true
      const result = await ImportProcessorService.executeImport(schoolId, "user-test", template, rows, {
        clearEmptyFields: true,
        skipInvalidRows: true,
      });

      expect(result.successCount).toBe(1);

      // Verify admissionNo was cleared to null
      const updated = await prisma.student.findUnique({ where: { id: existing.id } });
      expect(updated?.admissionNo).toBeNull();
    });
  });
});
