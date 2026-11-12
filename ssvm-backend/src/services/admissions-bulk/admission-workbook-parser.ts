/**
 * ssvm-backend/src/services/admissions-bulk/admission-workbook-parser.ts
 *
 * Safe multi-sheet Excel workbook parser for SSVM ERP Bulk Admission Registration.
 * Strictly adheres to 1-based cell indexing, non-compacting column positions,
 * and relationship key extraction.
 */

import ExcelJS from "exceljs";
import AdmZip from "adm-zip";
import Papa from "papaparse";
import crypto from "crypto";
import {
  AdmissionType,
  CellError,
  ParsedAdmissionWorkbook,
  StudentSheetRow,
  GuardianSheetRow,
  StudentGuardianLinkRow,
  AcademicPlacementRow,
  PreviousSchoolRow,
  FacilitySelectionRow,
  DocumentMetaRow,
} from "./admission-types";
import { AdmissionTemplateRegistry } from "./admission-template-registry";

export class AdmissionWorkbookParser {
  /**
   * Alias for parseWorkbook to support routes and tests
   */
  public static async parseWorkbook(
    buffer: Buffer,
    originalFilename?: string
  ): Promise<ParsedAdmissionWorkbook> {
    return this.parse(buffer, originalFilename);
  }

  /**
   * Parse an uploaded Excel workbook, Multi-file CSV ZIP package, or Single CSV buffer
   */
  public static async parse(
    buffer: Buffer,
    originalFilename?: string
  ): Promise<ParsedAdmissionWorkbook> {
    if (!buffer || buffer.length === 0) {
      throw new Error("Empty buffer provided for admission import parsing");
    }

    const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // 1. Check if buffer is a ZIP archive
    const isZip =
      buffer.length > 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;

    if (isZip) {
      let zip: AdmZip;
      try {
        zip = new AdmZip(buffer);
      } catch (err: any) {
        throw new Error(`Invalid or corrupt ZIP archive: ${err.message}`);
      }

      // Check for Excel markers ([Content_Types].xml or xl/workbook.xml)
      const isExcel =
        zip.getEntry("[Content_Types].xml") !== null ||
        zip.getEntry("xl/workbook.xml") !== null;

      if (isExcel) {
        const result = await this.parseExcelWorkbook(buffer);
        result.batchId = batchId;
        result.admissionType = result.templateType;
        result.totalRows = result.students.length;
        return result;
      }

      // Check if it contains CSV files -> Multi-file CSV package
      const entries = zip.getEntries();
      const hasCsvFiles = entries.some((e) => e.entryName.toLowerCase().endsWith(".csv"));
      if (hasCsvFiles) {
        const result = await this.parseCsvZipPackage(zip);
        result.batchId = batchId;
        result.admissionType = result.templateType;
        result.totalRows = result.students.length;
        return result;
      }

      // Fallback: try Excel loader
      const result = await this.parseExcelWorkbook(buffer);
      result.batchId = batchId;
      result.admissionType = result.templateType;
      result.totalRows = result.students.length;
      return result;
    }

    // 2. Check if buffer is Single-file CSV
    const isCsvName = originalFilename && originalFilename.toLowerCase().endsWith(".csv");
    const previewStr = buffer.toString("utf8", 0, Math.min(buffer.length, 1000));
    const isCsvContent = !isZip && (previewStr.includes(",") || previewStr.includes(";"));

    if (isCsvName || isCsvContent) {
      const result = await this.parseSingleCsv(buffer);
      result.batchId = batchId;
      result.admissionType = result.templateType;
      result.totalRows = result.students.length;
      return result;
    }

    // Fallback: try Excel loading
    const result = await this.parseExcelWorkbook(buffer);
    result.batchId = batchId;
    result.admissionType = result.templateType;
    result.totalRows = result.students.length;
    return result;
  }

  /**
   * Parse genuine Excel workbook using ExcelJS
   */
  public static async parseExcelWorkbook(buffer: Buffer): Promise<ParsedAdmissionWorkbook> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (err: any) {
      throw new Error(`Invalid or corrupt Excel workbook: ${err.message}`);
    }

    const parseErrors: CellError[] = [];

    // 1. Detect Template Type and Version
    const { templateType, templateVersion } = this.detectTemplateMetadata(workbook, parseErrors);

    // 2. Validate Required Sheets for this template
    const templateMeta = AdmissionTemplateRegistry.getMetadata(templateType);
    for (const reqSheet of templateMeta.requiredSheets) {
      const sheet = workbook.getWorksheet(reqSheet);
      if (!sheet) {
        parseErrors.push({
          sheet: reqSheet,
          rowNumber: 0,
          field: "sheet",
          fieldLabel: "Worksheet",
          value: null,
          code: "MISSING_REQUIRED_SHEET",
          message: `Mandatory sheet '${reqSheet}' is missing from the workbook.`,
          suggestedCorrection: `Ensure the workbook contains the '${reqSheet}' sheet generated by SSVM ERP.`,
        });
      }
    }

    // 3. Parse Students / ReAdmissions Sheet
    const students: StudentSheetRow[] = [];
    const studentSheet =
      templateType === "READMISSION"
        ? workbook.getWorksheet("ReAdmissions")
        : workbook.getWorksheet("Students");

    if (studentSheet) {
      this.parseStudentsSheet(studentSheet, templateType, students, parseErrors);
    }

    // 4. Parse Profile Updates Sheet (Re-Admission only)
    if (templateType === "READMISSION") {
      const profileUpdatesSheet = workbook.getWorksheet("Profile_Updates");
      if (profileUpdatesSheet) {
        this.applyProfileUpdates(profileUpdatesSheet, students, parseErrors);
      }
    }

    // 5. Parse Guardians Sheet
    const guardians: GuardianSheetRow[] = [];
    const guardianSheet = workbook.getWorksheet("Guardians");
    if (guardianSheet) {
      this.parseGuardiansSheet(guardianSheet, guardians, parseErrors);
    }

    // 6. Parse Student-Guardians Junction Sheet
    const studentGuardians: StudentGuardianLinkRow[] = [];
    const sgSheet = workbook.getWorksheet("Student_Guardians");
    if (sgSheet) {
      this.parseStudentGuardiansSheet(sgSheet, studentGuardians, parseErrors);
    }

    // 7. Parse Academic Placement Sheet
    const academicPlacements: AcademicPlacementRow[] = [];
    const placementSheet = workbook.getWorksheet("Academic_Placement");
    if (placementSheet) {
      this.parseAcademicPlacementSheet(placementSheet, academicPlacements, parseErrors);
    }

    // 8. Parse Previous School Sheet (Transfer only)
    const previousSchools: PreviousSchoolRow[] = [];
    const prevSchoolSheet = workbook.getWorksheet("Previous_School");
    if (prevSchoolSheet) {
      this.parsePreviousSchoolSheet(prevSchoolSheet, previousSchools, parseErrors);
    }

    // 9. Parse Documents Sheet
    const documents: DocumentMetaRow[] = [];
    const docSheet = workbook.getWorksheet("Documents");
    if (docSheet) {
      this.parseDocumentsSheet(docSheet, documents, parseErrors);
    }

    // 10. Parse Facilities Sheet
    const facilities: FacilitySelectionRow[] = [];
    const facilitySheet = workbook.getWorksheet("Student_Facilities");
    if (facilitySheet) {
      this.parseFacilitiesSheet(facilitySheet, facilities, parseErrors);
    }

    return {
      templateType,
      templateVersion,
      students,
      guardians,
      studentGuardians,
      academicPlacements,
      previousSchools,
      facilities,
      documents,
      parseErrors,
    };
  }

  /**
   * Parse multi-file CSV ZIP package containing separate CSV files per sheet
   */
  private static async parseCsvZipPackage(zip: AdmZip): Promise<ParsedAdmissionWorkbook> {
    const entries = zip.getEntries();
    // Security check 1: max entry count
    if (entries.length > 50) {
      throw new Error("ZIP package exceeds maximum allowable file count (50 files).");
    }

    // Security check 2: path traversal & size bomb checks
    let totalUncompressedSize = 0;
    const maxAllowedSize = 50 * 1024 * 1024; // 50MB
    for (const entry of entries) {
      const name = entry.entryName;
      if (name.includes("..") || name.startsWith("/") || name.startsWith("\\")) {
        throw new Error(`Path traversal attempt detected in ZIP entry '${name}'.`);
      }
      totalUncompressedSize += entry.header.size;
      if (totalUncompressedSize > maxAllowedSize) {
        throw new Error("ZIP package exceeds maximum decompressed size limit of 50MB.");
      }
    }

    // Map entries by normalized basename (e.g. "students.csv" -> entry)
    const fileMap = new Map<string, AdmZip.IZipEntry>();
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const base = entry.entryName.split(/[\/\\]/).pop()?.toLowerCase();
      if (base) {
        fileMap.set(base, entry);
      }
    }

    const parseErrors: CellError[] = [];
    let templateType: AdmissionType = "NEW";
    let templateVersion = "1.0.0";

    // Read Instructions.csv if present
    const instEntry = fileMap.get("instructions.csv");
    if (instEntry) {
      const instText = zip.readAsText(instEntry, "utf8");
      const parsedInst = Papa.parse<string[]>(instText, { skipEmptyLines: "greedy" });
      for (const row of parsedInst.data || []) {
        if (!row || row.length < 2) continue;
        const k = (row[0] || "").toLowerCase().trim();
        const v = (row[1] || "").toUpperCase().trim();
        if (k.includes("admission type")) {
          if (v === "READMISSION" || v === "RE_ADMISSION") templateType = "READMISSION";
          else if (v === "TRANSFER") templateType = "TRANSFER";
          else templateType = "NEW";
        }
        if (k.includes("template version")) {
          templateVersion = v || "1.0.0";
        }
      }
    } else {
      if (fileMap.has("readmissions.csv")) templateType = "READMISSION";
      else if (fileMap.has("previous_school.csv")) templateType = "TRANSFER";
      else templateType = "NEW";
    }

    // Parse Students / ReAdmissions
    const students: StudentSheetRow[] = [];
    const studentEntry =
      templateType === "READMISSION" ? fileMap.get("readmissions.csv") : fileMap.get("students.csv");

    if (!studentEntry) {
      parseErrors.push({
        sheet: templateType === "READMISSION" ? "ReAdmissions" : "Students",
        rowNumber: 0,
        field: "sheet",
        fieldLabel: "Worksheet",
        value: null,
        code: "MISSING_REQUIRED_SHEET",
        message: `Mandatory CSV file '${templateType === "READMISSION" ? "ReAdmissions.csv" : "Students.csv"}' is missing from ZIP package.`,
      });
    } else {
      const text = zip.readAsText(studentEntry, "utf8");
      this.parseCsvStudentRows(text, templateType, students, parseErrors);
    }

    // Parse Guardians
    const guardians: GuardianSheetRow[] = [];
    const grdEntry = fileMap.get("guardians.csv");
    if (grdEntry) {
      const text = zip.readAsText(grdEntry, "utf8");
      this.parseCsvGuardianRows(text, guardians, parseErrors);
    }

    // Parse Student_Guardians
    const studentGuardians: StudentGuardianLinkRow[] = [];
    const sgEntry = fileMap.get("student_guardians.csv");
    if (sgEntry) {
      const text = zip.readAsText(sgEntry, "utf8");
      this.parseCsvStudentGuardianLinkRows(text, studentGuardians, parseErrors);
    }

    // Parse Academic_Placement
    const academicPlacements: AcademicPlacementRow[] = [];
    const placeEntry = fileMap.get("academic_placement.csv");
    if (placeEntry) {
      const text = zip.readAsText(placeEntry, "utf8");
      this.parseCsvAcademicPlacementRows(text, academicPlacements, parseErrors);
    }

    // Parse Previous_School
    const previousSchools: PreviousSchoolRow[] = [];
    const prevEntry = fileMap.get("previous_school.csv");
    if (prevEntry) {
      const text = zip.readAsText(prevEntry, "utf8");
      this.parseCsvPreviousSchoolRows(text, previousSchools, parseErrors);
    }

    // Parse Facilities
    const facilities: FacilitySelectionRow[] = [];
    const facEntry = fileMap.get("student_facilities.csv");
    if (facEntry) {
      const text = zip.readAsText(facEntry, "utf8");
      this.parseCsvFacilityRows(text, facilities, parseErrors);
    }

    // Parse Documents
    const documents: DocumentMetaRow[] = [];
    const docEntry = fileMap.get("documents.csv");
    if (docEntry) {
      const text = zip.readAsText(docEntry, "utf8");
      this.parseCsvDocumentRows(text, documents, parseErrors);
    }

    return {
      templateType,
      templateVersion,
      students,
      guardians,
      studentGuardians,
      academicPlacements,
      previousSchools,
      facilities,
      documents,
      parseErrors,
    };
  }

  /**
   * Parse single-file CSV format where one row represents complete student admission
   */
  private static async parseSingleCsv(buffer: Buffer): Promise<ParsedAdmissionWorkbook> {
    const text = buffer.toString("utf8");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) {
      throw new Error("CSV file must contain a header row and at least one data row.");
    }

    const headerRow = rows[0];
    const headerMap = this.extractHeaderMapFromRow(headerRow);
    const parseErrors: CellError[] = [];

    // Detect template type from headers
    let templateType: AdmissionType = "NEW";
    if (headerMap.has("existing_ssvm_admission_no") || headerMap.has("existing_admission_no")) {
      templateType = "READMISSION";
    } else if (
      headerMap.has("previous_school") ||
      headerMap.has("previous_school_name") ||
      headerMap.has("tc_number")
    ) {
      templateType = "TRANSFER";
    }

    const students: StudentSheetRow[] = [];
    const guardians: GuardianSheetRow[] = [];
    const studentGuardians: StudentGuardianLinkRow[] = [];
    const academicPlacements: AcademicPlacementRow[] = [];
    const previousSchools: PreviousSchoolRow[] = [];
    const facilities: FacilitySelectionRow[] = [];
    const documents: DocumentMetaRow[] = [];

    const importKeyCol = headerMap.get("import_key");
    if (!importKeyCol) {
      parseErrors.push({
        sheet: "SingleCSV",
        rowNumber: 1,
        field: "Import_Key",
        fieldLabel: "Import Key",
        value: null,
        code: "MISSING_HEADER",
        message: "Mandatory column 'Import_Key' is missing in header row.",
      });
      return {
        templateType,
        templateVersion: "1.0.0",
        students,
        guardians,
        studentGuardians,
        academicPlacements,
        previousSchools,
        facilities,
        documents,
        parseErrors,
      };
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const sourceRowNumber = r + 1;

      const importKey = this.getCsvSanitizedValue(row, importKeyCol);
      if (!importKey) {
        parseErrors.push({
          sheet: "SingleCSV",
          rowNumber: sourceRowNumber,
          field: "Import_Key",
          fieldLabel: "Import Key",
          value: null,
          code: "MISSING_IMPORT_KEY",
          message: `Row ${sourceRowNumber} is missing mandatory 'Import_Key'.`,
        });
        continue;
      }

      const existingAdmNo =
        templateType === "READMISSION"
          ? this.getCsvSanitizedValue(
              row,
              headerMap.get("existing_ssvm_admission_no") || headerMap.get("existing_admission_no")
            )
          : null;

      // 1. Student demographic
      students.push({
        importKey,
        name:
          this.getCsvSanitizedValue(row, headerMap.get("student_name") || headerMap.get("name")) || "",
        nickname: this.getCsvSanitizedValue(row, headerMap.get("nickname")),
        dob: this.formatDateString(
          this.getCsvSanitizedValue(row, headerMap.get("dob") || headerMap.get("date_of_birth"))
        ),
        gender: (this.getCsvSanitizedValue(row, headerMap.get("gender")) || "").toUpperCase(),
        bloodGroup: this.getCsvSanitizedValue(row, headerMap.get("blood_group")),
        nationality: this.getCsvSanitizedValue(row, headerMap.get("nationality")),
        religion: this.getCsvSanitizedValue(row, headerMap.get("religion")),
        category: this.getCsvSanitizedValue(row, headerMap.get("category")),
        motherTongue: this.getCsvSanitizedValue(row, headerMap.get("mother_tongue")),
        locality: this.getCsvSanitizedValue(row, headerMap.get("locality")),
        pincode: this.getCsvSanitizedValue(row, headerMap.get("pincode") || headerMap.get("pin_code")),
        landmark: this.getCsvSanitizedValue(row, headerMap.get("landmark")),
        medicalInfo: this.getCsvSanitizedValue(row, headerMap.get("medical_info")),
        emergencyPhone: this.getCsvSanitizedValue(
          row,
          headerMap.get("emergency_phone") || headerMap.get("emergency_contact")
        ),
        pen: this.getCsvSanitizedValue(row, headerMap.get("pen_number") || headerMap.get("pen")),
        email: this.getCsvSanitizedValue(row, headerMap.get("student_email") || headerMap.get("email")),
        phone: this.getCsvSanitizedValue(row, headerMap.get("student_phone") || headerMap.get("phone")),
        address: this.getCsvSanitizedValue(
          row,
          headerMap.get("permanent_address") || headerMap.get("address")
        ),
        existingAdmissionNo: existingAdmNo,
        sourceRowNumber,
      });

      // 2. Guardian (if present in flat columns)
      const grdName = this.getCsvSanitizedValue(
        row,
        headerMap.get("guardian_name") || headerMap.get("parent_name")
      );
      const grdPhone = this.getCsvSanitizedValue(
        row,
        headerMap.get("guardian_phone") || headerMap.get("parent_phone")
      );
      if (grdName || grdPhone) {
        const grdKey = `GRD-${importKey}`;
        guardians.push({
          guardianKey: grdKey,
          name: grdName || "Primary Guardian",
          relationship: (
            this.getCsvSanitizedValue(
              row,
              headerMap.get("guardian_relation") || headerMap.get("relationship")
            ) || "FATHER"
          ).toUpperCase() as any,
          primaryPhone: grdPhone || "0000000000",
          primaryEmail: this.getCsvSanitizedValue(row, headerMap.get("guardian_email")),
          occupation: this.getCsvSanitizedValue(row, headerMap.get("guardian_occupation")),
          address: this.getCsvSanitizedValue(row, headerMap.get("guardian_address")),
          isEmergencyContact: true,
          sourceRowNumber,
        });
        studentGuardians.push({
          importKey,
          guardianKey: grdKey,
          relationship: (
            this.getCsvSanitizedValue(
              row,
              headerMap.get("guardian_relation") || headerMap.get("relationship")
            ) || "FATHER"
          ).toUpperCase(),
          isPrimary: true,
          sourceRowNumber,
        });
      }

      // 3. Placement (if present in flat columns)
      const admClass = this.getCsvSanitizedValue(
        row,
        headerMap.get("admission_class") || headerMap.get("class")
      );
      const session = this.getCsvSanitizedValue(
        row,
        headerMap.get("academic_session") || headerMap.get("session")
      );
      if (admClass || session) {
        academicPlacements.push({
          importKey,
          sessionName: session || "2026-2027",
          className: admClass || "Class 1",
          sectionName: this.getCsvSanitizedValue(row, headerMap.get("section")),
          rollNo: this.getCsvSanitizedValue(row, headerMap.get("roll_no")),
          sourceRowNumber,
        });
      }

      // 4. Previous School / Transfer info
      const prevSchool = this.getCsvSanitizedValue(
        row,
        headerMap.get("previous_school") || headerMap.get("previous_school_name")
      );
      const tcNo = this.getCsvSanitizedValue(row, headerMap.get("tc_number") || headerMap.get("tc_no"));
      if (prevSchool || tcNo) {
        previousSchools.push({
          importKey,
          previousSchoolName: prevSchool || "Previous School",
          previousBoard: this.getCsvSanitizedValue(row, headerMap.get("previous_board")),
          previousClass: this.getCsvSanitizedValue(row, headerMap.get("previous_class")),
          previousSession: this.getCsvSanitizedValue(row, headerMap.get("previous_session")),
          previousRollNo: this.getCsvSanitizedValue(row, headerMap.get("previous_roll_no")),
          tcNumber: tcNo,
          tcIssueDate: this.formatDateString(
            this.getCsvSanitizedValue(row, headerMap.get("tc_date") || headerMap.get("tc_issue_date"))
          ),
          sourceRowNumber,
        });
      }

      // 5. Facilities
      const transportReq = this.getCsvSanitizedValue(row, headerMap.get("transport_required"));
      if (transportReq && /^(yes|true|1|y)$/i.test(transportReq.trim())) {
        facilities.push({
          importKey,
          facilityCode: "TRANSPORT",
          details: this.getCsvSanitizedValue(
            row,
            headerMap.get("facility_details") || headerMap.get("pickup_locality")
          ),
          sourceRowNumber,
        });
      }
      const hostelReq = this.getCsvSanitizedValue(row, headerMap.get("hostel_required"));
      if (hostelReq && /^(yes|true|1|y)$/i.test(hostelReq.trim())) {
        facilities.push({
          importKey,
          facilityCode: "HOSTEL",
          details: this.getCsvSanitizedValue(row, headerMap.get("hostel_details")),
          sourceRowNumber,
        });
      }
      const mealsReq = this.getCsvSanitizedValue(row, headerMap.get("meals_required"));
      if (mealsReq && /^(yes|true|1|y)$/i.test(mealsReq.trim())) {
        facilities.push({
          importKey,
          facilityCode: "MEALS",
          details: this.getCsvSanitizedValue(row, headerMap.get("meal_plan")),
          sourceRowNumber,
        });
      }

      // 6. Documents
      const docCat = this.getCsvSanitizedValue(row, headerMap.get("document_category"));
      const docTitle = this.getCsvSanitizedValue(row, headerMap.get("document_title"));
      if (docCat || docTitle) {
        documents.push({
          importKey,
          documentCategory: (docCat || "OTHER").toUpperCase(),
          documentTitle: docTitle || "Supporting Document",
          fileReference: this.getCsvSanitizedValue(row, headerMap.get("file_reference")),
          sourceRowNumber,
        });
      }
    }

    return {
      templateType,
      templateVersion: "1.0.0",
      students,
      guardians,
      studentGuardians,
      academicPlacements,
      previousSchools,
      facilities,
      documents,
      parseErrors,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CSV ROW PARSERS
  // ─────────────────────────────────────────────────────────────

  private static parseCsvStudentRows(
    csvText: string,
    type: AdmissionType,
    students: StudentSheetRow[],
    errors: CellError[]
  ): void {
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) return;

    const headers = this.extractHeaderMapFromRow(rows[0]);
    const importKeyCol = headers.get("import_key");
    if (!importKeyCol) {
      errors.push({
        sheet: "Students",
        rowNumber: 1,
        field: "Import_Key",
        fieldLabel: "Import Key",
        value: null,
        code: "MISSING_HEADER",
        message: "Mandatory column 'Import_Key' is missing in header row.",
      });
      return;
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const sourceRowNumber = r + 1;

      const importKey = this.getCsvSanitizedValue(row, importKeyCol);
      if (!importKey) {
        errors.push({
          sheet: "Students",
          rowNumber: sourceRowNumber,
          field: "Import_Key",
          fieldLabel: "Import Key",
          value: null,
          code: "MISSING_IMPORT_KEY",
          message: `Row ${sourceRowNumber} is missing mandatory 'Import_Key'.`,
        });
        continue;
      }

      const existingAdmNo =
        type === "READMISSION"
          ? this.getCsvSanitizedValue(row, headers.get("existing_ssvm_admission_no"))
          : null;

      students.push({
        importKey,
        name: this.getCsvSanitizedValue(row, headers.get("student_name")) || "",
        nickname: this.getCsvSanitizedValue(row, headers.get("nickname")),
        dob: this.formatDateString(this.getCsvSanitizedValue(row, headers.get("dob"))),
        gender: (this.getCsvSanitizedValue(row, headers.get("gender")) || "").toUpperCase(),
        bloodGroup: this.getCsvSanitizedValue(row, headers.get("blood_group")),
        nationality: this.getCsvSanitizedValue(row, headers.get("nationality")),
        religion: this.getCsvSanitizedValue(row, headers.get("religion")),
        category: this.getCsvSanitizedValue(row, headers.get("category")),
        motherTongue: this.getCsvSanitizedValue(row, headers.get("mother_tongue")),
        locality: this.getCsvSanitizedValue(row, headers.get("locality")),
        pincode: this.getCsvSanitizedValue(row, headers.get("pincode") || headers.get("pin_code")),
        landmark: this.getCsvSanitizedValue(row, headers.get("landmark")),
        medicalInfo: this.getCsvSanitizedValue(row, headers.get("medical_info")),
        emergencyPhone: this.getCsvSanitizedValue(
          row,
          headers.get("emergency_phone") || headers.get("emergency_contact")
        ),
        pen: this.getCsvSanitizedValue(row, headers.get("pen_number") || headers.get("pen")),
        email: this.getCsvSanitizedValue(row, headers.get("student_email")),
        phone: this.getCsvSanitizedValue(row, headers.get("student_phone")),
        address: this.getCsvSanitizedValue(row, headers.get("permanent_address")),
        existingAdmissionNo: existingAdmNo,
        sourceRowNumber,
      });
    }
  }

  private static parseCsvGuardianRows(
    csvText: string,
    guardians: GuardianSheetRow[],
    _errors: CellError[]
  ): void {
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) return;

    const headers = this.extractHeaderMapFromRow(rows[0]);
    const keyCol = headers.get("guardian_key");
    if (!keyCol) return;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const guardianKey = this.getCsvSanitizedValue(row, keyCol);
      if (!guardianKey) continue;

      const rawIncome = this.getCsvSanitizedValue(row, headers.get("annual_income"));
      const parsedIncome = rawIncome ? Number(rawIncome.replace(/[^0-9.]/g, "")) : null;
      const isEmergency = this.getCsvSanitizedValue(row, headers.get("is_emergency_contact"));

      guardians.push({
        guardianKey,
        name: this.getCsvSanitizedValue(row, headers.get("guardian_name")) || "",
        relationship: (
          this.getCsvSanitizedValue(row, headers.get("relationship")) || "FATHER"
        ).toUpperCase() as any,
        primaryPhone: this.getCsvSanitizedValue(row, headers.get("primary_phone")) || "",
        primaryEmail: this.getCsvSanitizedValue(row, headers.get("primary_email")),
        occupation: this.getCsvSanitizedValue(row, headers.get("occupation")),
        annualIncome: Number.isNaN(parsedIncome) ? null : parsedIncome,
        address: this.getCsvSanitizedValue(row, headers.get("residential_address")),
        isEmergencyContact: Boolean(isEmergency && /^(yes|true|1|y)$/i.test(isEmergency)),
        sourceRowNumber: r + 1,
      });
    }
  }

  private static parseCsvStudentGuardianLinkRows(
    csvText: string,
    studentGuardians: StudentGuardianLinkRow[],
    _errors: CellError[]
  ): void {
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) return;

    const headers = this.extractHeaderMapFromRow(rows[0]);
    const sKeyCol = headers.get("import_key");
    const gKeyCol = headers.get("guardian_key");
    if (!sKeyCol || !gKeyCol) return;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const importKey = this.getCsvSanitizedValue(row, sKeyCol);
      const guardianKey = this.getCsvSanitizedValue(row, gKeyCol);
      if (!importKey || !guardianKey) continue;

      const rawPrimary = this.getCsvSanitizedValue(row, headers.get("is_primary"));
      const isPrimary = Boolean(rawPrimary && /^(yes|true|1|y)$/i.test(rawPrimary));

      studentGuardians.push({
        importKey,
        guardianKey,
        relationship: (
          this.getCsvSanitizedValue(row, headers.get("relationship_to_student")) || "FATHER"
        ).toUpperCase(),
        isPrimary,
        sourceRowNumber: r + 1,
      });
    }
  }

  private static parseCsvAcademicPlacementRows(
    csvText: string,
    placements: AcademicPlacementRow[],
    _errors: CellError[]
  ): void {
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) return;

    const headers = this.extractHeaderMapFromRow(rows[0]);
    const keyCol = headers.get("import_key");
    if (!keyCol) return;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const importKey = this.getCsvSanitizedValue(row, keyCol);
      if (!importKey) continue;

      placements.push({
        importKey,
        sessionName: this.getCsvSanitizedValue(row, headers.get("academic_session")) || "",
        className: this.getCsvSanitizedValue(row, headers.get("admission_class")) || "",
        sectionName: this.getCsvSanitizedValue(row, headers.get("allocated_section")),
        campusName: this.getCsvSanitizedValue(row, headers.get("campus_branch")),
        rollNo: this.getCsvSanitizedValue(row, headers.get("allocated_roll_no")),
        sourceRowNumber: r + 1,
      });
    }
  }

  private static parseCsvPreviousSchoolRows(
    csvText: string,
    prevSchools: PreviousSchoolRow[],
    _errors: CellError[]
  ): void {
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) return;

    const headers = this.extractHeaderMapFromRow(rows[0]);
    const keyCol = headers.get("import_key");
    if (!keyCol) return;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const importKey = this.getCsvSanitizedValue(row, keyCol);
      if (!importKey) continue;

      prevSchools.push({
        importKey,
        previousSchoolName: this.getCsvSanitizedValue(row, headers.get("previous_school_name")) || "",
        previousBoard: this.getCsvSanitizedValue(row, headers.get("board_affiliation")),
        previousAddress: this.getCsvSanitizedValue(row, headers.get("school_address")),
        previousClass: this.getCsvSanitizedValue(row, headers.get("last_class_passed")),
        previousSession: this.getCsvSanitizedValue(row, headers.get("academic_session")),
        previousRollNo: this.getCsvSanitizedValue(row, headers.get("roll_no")),
        tcNumber: this.getCsvSanitizedValue(row, headers.get("transfer_certificate_no")),
        tcIssueDate: this.formatDateString(this.getCsvSanitizedValue(row, headers.get("tc_issue_date"))),
        sourceRowNumber: r + 1,
      });
    }
  }

  private static parseCsvFacilityRows(
    csvText: string,
    facilities: FacilitySelectionRow[],
    _errors: CellError[]
  ): void {
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) return;

    const headers = this.extractHeaderMapFromRow(rows[0]);
    const keyCol = headers.get("import_key");
    const codeCol = headers.get("facility_code");
    if (!keyCol || !codeCol) return;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const importKey = this.getCsvSanitizedValue(row, keyCol);
      const code = this.getCsvSanitizedValue(row, codeCol);
      if (!importKey || !code) continue;

      facilities.push({
        importKey,
        facilityCode: code.toUpperCase(),
        details: this.getCsvSanitizedValue(row, headers.get("facility_details")),
        sourceRowNumber: r + 1,
      });
    }
  }

  private static parseCsvDocumentRows(
    csvText: string,
    documents: DocumentMetaRow[],
    _errors: CellError[]
  ): void {
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: "greedy" });
    const rows = parsed.data || [];
    if (rows.length < 2) return;

    const headers = this.extractHeaderMapFromRow(rows[0]);
    const keyCol = headers.get("import_key");
    const catCol = headers.get("document_category");
    if (!keyCol || !catCol) return;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (this.isCsvRowEmpty(row)) continue;
      const importKey = this.getCsvSanitizedValue(row, keyCol);
      const cat = this.getCsvSanitizedValue(row, catCol);
      if (!importKey || !cat) continue;

      documents.push({
        importKey,
        documentCategory: cat.toUpperCase(),
        documentTitle: this.getCsvSanitizedValue(row, headers.get("document_title")) || "Supporting Document",
        fileReference: this.getCsvSanitizedValue(row, headers.get("file_reference")),
        sourceRowNumber: r + 1,
      });
    }
  }

  private static extractHeaderMapFromRow(headerRow: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (let i = 0; i < headerRow.length; i++) {
      const text = headerRow[i] || "";
      const normalized = text
        .toLowerCase()
        .replace(/\(.*\)/g, "")
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      if (normalized) {
        map.set(normalized, i + 1); // 1-based index
      }
    }
    return map;
  }

  private static getCsvSanitizedValue(row: string[], colNumber?: number): string | null {
    if (!colNumber || colNumber > row.length) return null;
    const raw = (row[colNumber - 1] || "").trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (["n/a", "na", "null", "none", "-", "--", "nil"].includes(lower)) return null;
    return raw;
  }

  private static isCsvRowEmpty(row: string[]): boolean {
    return !row || row.every((c) => !c || !c.trim());
  }

  private static formatDateString(str: string | null): string | null {
    if (!str) return null;
    str = str.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0");
      const month = ddmmyyyy[2].padStart(2, "0");
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }
    return str;
  }

  // ─────────────────────────────────────────────────────────────
  // METADATA DETECTION
  // ─────────────────────────────────────────────────────────────

  private static detectTemplateMetadata(
    workbook: ExcelJS.Workbook,
    errors: CellError[]
  ): { templateType: AdmissionType; templateVersion: string } {
    let templateType: AdmissionType = "NEW";
    let templateVersion = "1.0";

    const instructionsSheet = workbook.getWorksheet("Instructions");
    if (instructionsSheet) {
      instructionsSheet.eachRow((row) => {
        const key = this.cellToString(row.getCell(1).value).toLowerCase();
        const val = this.cellToString(row.getCell(2).value).trim().toUpperCase();

        if (key.includes("admission type")) {
          if (val === "READMISSION" || val === "RE_ADMISSION") {
            templateType = "READMISSION";
          } else if (val === "TRANSFER") {
            templateType = "TRANSFER";
          } else {
            templateType = "NEW";
          }
        }

        if (key.includes("template version")) {
          templateVersion = val || "1.0";
        }
      });
    } else {
      // Fallback heuristics from sheets present
      if (workbook.getWorksheet("ReAdmissions")) {
        templateType = "READMISSION";
      } else if (workbook.getWorksheet("Previous_School")) {
        templateType = "TRANSFER";
      } else {
        templateType = "NEW";
      }
    }

    return { templateType, templateVersion };
  }

  // ─────────────────────────────────────────────────────────────
  // INDIVIDUAL SHEET PARSERS
  // ─────────────────────────────────────────────────────────────

  private static parseStudentsSheet(
    sheet: ExcelJS.Worksheet,
    type: AdmissionType,
    students: StudentSheetRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    if (!headers.get("import_key")) {
      errors.push({
        sheet: sheet.name,
        rowNumber: 1,
        field: "Import_Key",
        fieldLabel: "Import Key",
        value: null,
        code: "MISSING_HEADER",
        message: "Mandatory column 'Import_Key' is missing in header row.",
      });
      return;
    }

    const totalRows = sheet.rowCount;
    for (let r = 2; r <= totalRows; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const importKey = this.getSanitizedValue(row, headers.get("import_key"));
      if (!importKey) {
        errors.push({
          sheet: sheet.name,
          rowNumber: r,
          field: "Import_Key",
          fieldLabel: "Import Key",
          value: null,
          code: "MISSING_IMPORT_KEY",
          message: `Row ${r} is missing mandatory 'Import_Key'.`,
          suggestedCorrection: "Provide a unique identifier (e.g. STU-001).",
        });
        continue;
      }

      const existingAdmNo =
        type === "READMISSION"
          ? this.getSanitizedValue(row, headers.get("existing_ssvm_admission_no"))
          : null;

      students.push({
        importKey,
        name: this.getSanitizedValue(row, headers.get("student_name")) || "",
        nickname: this.getSanitizedValue(row, headers.get("nickname")),
        dob: this.formatDateCell(row, headers.get("dob")),
        gender: (this.getSanitizedValue(row, headers.get("gender")) || "").toUpperCase(),
        bloodGroup: this.getSanitizedValue(row, headers.get("blood_group")),
        nationality: this.getSanitizedValue(row, headers.get("nationality")),
        religion: this.getSanitizedValue(row, headers.get("religion")),
        category: this.getSanitizedValue(row, headers.get("category")),
        motherTongue: this.getSanitizedValue(row, headers.get("mother_tongue")),
        locality: this.getSanitizedValue(row, headers.get("locality")),
        pincode: this.getSanitizedValue(row, headers.get("pincode") || headers.get("pin_code")),
        landmark: this.getSanitizedValue(row, headers.get("landmark")),
        medicalInfo: this.getSanitizedValue(row, headers.get("medical_info") || headers.get("medical_conditions")),
        emergencyPhone: this.getSanitizedValue(row, headers.get("emergency_phone") || headers.get("emergency_contact")),
        pen: this.getSanitizedValue(row, headers.get("pen_number") || headers.get("pen")),
        email: this.getSanitizedValue(row, headers.get("student_email")),
        phone: this.getSanitizedValue(row, headers.get("student_phone")),
        address: this.getSanitizedValue(row, headers.get("permanent_address")),
        existingAdmissionNo: existingAdmNo,
        sourceRowNumber: r,
      });
    }
  }

  private static applyProfileUpdates(
    sheet: ExcelJS.Worksheet,
    students: StudentSheetRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    const keyCol = headers.get("import_key");
    if (!keyCol) return;

    const studentMap = new Map<string, StudentSheetRow>(students.map((s) => [s.importKey, s]));

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const importKey = this.getSanitizedValue(row, keyCol);
      if (!importKey) continue;

      const student = studentMap.get(importKey);
      if (student) {
        const phone = this.getSanitizedValue(row, headers.get("updated_phone"));
        const email = this.getSanitizedValue(row, headers.get("updated_email"));
        const address = this.getSanitizedValue(row, headers.get("updated_address"));
        const bg = this.getSanitizedValue(row, headers.get("updated_blood_group"));

        if (phone) student.phone = phone;
        if (email) student.email = email;
        if (address) student.address = address;
        if (bg) student.bloodGroup = bg;
      }
    }
  }

  private static parseGuardiansSheet(
    sheet: ExcelJS.Worksheet,
    guardians: GuardianSheetRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    const keyCol = headers.get("guardian_key");
    if (!keyCol) return;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const guardianKey = this.getSanitizedValue(row, keyCol);
      if (!guardianKey) continue;

      const rawIncome = this.getSanitizedValue(row, headers.get("annual_income"));
      const parsedIncome = rawIncome ? Number(rawIncome.replace(/[^0-9.]/g, "")) : null;

      const rawEmerg = this.getSanitizedValue(row, headers.get("is_emergency_contact"));
      const isEmergency = rawEmerg
        ? ["true", "yes", "1"].includes(rawEmerg.toLowerCase())
        : true;

      guardians.push({
        guardianKey,
        name: this.getSanitizedValue(row, headers.get("guardian_name")) || "",
        relationship: (this.getSanitizedValue(row, headers.get("relationship")) || "OTHER").toUpperCase() as any,
        primaryPhone: this.getSanitizedValue(row, headers.get("primary_phone")) || "",
        primaryEmail: this.getSanitizedValue(row, headers.get("primary_email")),
        occupation: this.getSanitizedValue(row, headers.get("occupation")),
        annualIncome: !isNaN(parsedIncome as number) ? parsedIncome : null,
        address: this.getSanitizedValue(row, headers.get("address")),
        isEmergencyContact: isEmergency,
        sourceRowNumber: r,
      });
    }
  }

  private static parseStudentGuardiansSheet(
    sheet: ExcelJS.Worksheet,
    links: StudentGuardianLinkRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    const importKeyCol = headers.get("import_key");
    const guardianKeyCol = headers.get("guardian_key");

    if (!importKeyCol || !guardianKeyCol) return;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const importKey = this.getSanitizedValue(row, importKeyCol);
      const guardianKey = this.getSanitizedValue(row, guardianKeyCol);
      if (!importKey || !guardianKey) continue;

      const rawPrimary = this.getSanitizedValue(row, headers.get("is_primary"));
      const isPrimary = rawPrimary ? ["true", "yes", "1"].includes(rawPrimary.toLowerCase()) : false;

      links.push({
        importKey,
        guardianKey,
        relationship: (this.getSanitizedValue(row, headers.get("relationship")) || "OTHER").toUpperCase(),
        isPrimary,
        sourceRowNumber: r,
      });
    }
  }

  private static parseAcademicPlacementSheet(
    sheet: ExcelJS.Worksheet,
    placements: AcademicPlacementRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    const importKeyCol = headers.get("import_key");
    if (!importKeyCol) return;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const importKey = this.getSanitizedValue(row, importKeyCol);
      if (!importKey) continue;

      placements.push({
        importKey,
        sessionName: this.getSanitizedValue(row, headers.get("academic_session")) || "",
        className: this.getSanitizedValue(row, headers.get("admission_class") || headers.get("class")) || "",
        sectionName: this.getSanitizedValue(row, headers.get("section")),
        campusName: this.getSanitizedValue(row, headers.get("campus_name") || headers.get("campus")),
        rollNo: this.getSanitizedValue(row, headers.get("roll_no") || headers.get("roll")),
        sourceRowNumber: r,
      });
    }
  }

  private static parsePreviousSchoolSheet(
    sheet: ExcelJS.Worksheet,
    previousSchools: PreviousSchoolRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    const importKeyCol = headers.get("import_key");
    if (!importKeyCol) return;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const importKey = this.getSanitizedValue(row, importKeyCol);
      if (!importKey) continue;

      previousSchools.push({
        importKey,
        previousSchoolName: this.getSanitizedValue(row, headers.get("previous_school_name")) || "",
        previousBoard: this.getSanitizedValue(row, headers.get("previous_board")),
        previousAddress: this.getSanitizedValue(row, headers.get("previous_address")),
        previousClass: this.getSanitizedValue(row, headers.get("previous_class")),
        previousSession: this.getSanitizedValue(row, headers.get("previous_session")),
        previousRollNo: this.getSanitizedValue(row, headers.get("previous_roll_no")),
        tcNumber: this.getSanitizedValue(row, headers.get("tc_number")),
        tcIssueDate: this.formatDateCell(row, headers.get("tc_issue_date")),
        sourceRowNumber: r,
      });
    }
  }

  private static parseDocumentsSheet(
    sheet: ExcelJS.Worksheet,
    documents: DocumentMetaRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    const importKeyCol = headers.get("import_key");
    if (!importKeyCol) return;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const importKey = this.getSanitizedValue(row, importKeyCol);
      if (!importKey) continue;

      documents.push({
        importKey,
        documentCategory: (this.getSanitizedValue(row, headers.get("document_category")) || "OTHER").toUpperCase(),
        documentTitle: this.getSanitizedValue(row, headers.get("document_title")) || "Document",
        fileReference: this.getSanitizedValue(row, headers.get("file_reference")),
        sourceRowNumber: r,
      });
    }
  }

  private static parseFacilitiesSheet(
    sheet: ExcelJS.Worksheet,
    facilities: FacilitySelectionRow[],
    errors: CellError[]
  ): void {
    const headers = this.extractHeaderMap(sheet);
    const importKeyCol = headers.get("import_key");
    if (!importKeyCol) return;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (this.isRowEmpty(row)) continue;

      const importKey = this.getSanitizedValue(row, importKeyCol);
      if (!importKey) continue;

      facilities.push({
        importKey,
        facilityCode: (this.getSanitizedValue(row, headers.get("facility_code")) || "").toUpperCase(),
        details: this.getSanitizedValue(row, headers.get("facility_details")),
        sourceRowNumber: r,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER UTILITIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Builds normalized header map: lowercase, stripped punctuation -> 1-based column index
   */
  private static extractHeaderMap(sheet: ExcelJS.Worksheet): Map<string, number> {
    const map = new Map<string, number>();
    const headerRow = sheet.getRow(1);

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = this.cellToString(cell.value);
      const normalized = text
        .toLowerCase()
        .replace(/\(.*\)/g, "") // strip (YYYY-MM-DD), etc.
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      if (normalized) {
        map.set(normalized, colNumber);
      }
    });

    return map;
  }

  private static getSanitizedValue(row: ExcelJS.Row, colNumber?: number): string | null {
    if (!colNumber) return null;
    const cell = row.getCell(colNumber);
    const str = this.cellToString(cell.value).trim();
    if (!str) return null;

    // Filter literal placeholder strings
    const lower = str.toLowerCase();
    if (["n/a", "na", "null", "none", "-", "--", "nil"].includes(lower)) {
      return null;
    }

    return str;
  }

  private static formatDateCell(row: ExcelJS.Row, colNumber?: number): string | null {
    if (!colNumber) return null;
    const cell = row.getCell(colNumber);

    if (cell.value instanceof Date) {
      return cell.value.toISOString().split("T")[0];
    }

    const str = this.getSanitizedValue(row, colNumber);
    if (!str) return null;

    // Standardize YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Standardize DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0");
      const month = ddmmyyyy[2].padStart(2, "0");
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }

    return str;
  }

  private static cellToString(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "object" && val.text) return String(val.text);
    if (typeof val === "object" && val.result !== undefined) return String(val.result);
    return String(val);
  }

  private static isRowEmpty(row: ExcelJS.Row): boolean {
    let empty = true;
    row.eachCell({ includeEmpty: false }, (cell) => {
      const s = this.cellToString(cell.value).trim();
      if (s) empty = false;
    });
    return empty;
  }
}
