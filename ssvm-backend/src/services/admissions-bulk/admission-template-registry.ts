/**
 * ssvm-backend/src/services/admissions-bulk/admission-template-registry.ts
 *
 * Authoritative registry and dynamic Excel workbook generator for the 3 SSVM ERP
 * Bulk Admission templates:
 * 1. Template A: SSVM_New_Admission_Bulk.xlsx
 * 2. Template B: SSVM_Readmission_Bulk.xlsx
 * 3. Template C: SSVM_Transfer_Admission_Bulk.xlsx
 */

import ExcelJS from "exceljs";
import AdmZip from "adm-zip";
import { AdmissionType } from "./admission-types";

export interface AdmissionTemplateMetadata {
  type: AdmissionType;
  fileName: string;
  version: string;
  title: string;
  description: string;
  requiredSheets: string[];
}

export class AdmissionTemplateRegistry {
  public static readonly TEMPLATES: Record<AdmissionType, AdmissionTemplateMetadata> = {
    NEW: {
      type: "NEW",
      fileName: "SSVM_New_Admission_Bulk.xlsx",
      version: "1.0.0",
      title: "New Student Admission Workbook",
      description: "Bulk registration workbook for students enrolling at SSVM for the first time.",
      requiredSheets: [
        "Instructions",
        "Students",
        "Guardians",
        "Student_Guardians",
        "Academic_Placement",
        "Previous_Education",
        "Student_Facilities",
        "Documents",
      ],
    },
    READMISSION: {
      type: "READMISSION",
      fileName: "SSVM_Readmission_Bulk.xlsx",
      version: "1.0.0",
      title: "Re-Admission Workbook",
      description: "Bulk re-admission workbook for returning students possessing an existing SSVM Admission Number.",
      requiredSheets: [
        "Instructions",
        "ReAdmissions",
        "Profile_Updates",
        "Guardians",
        "Student_Guardians",
        "Academic_Placement",
        "Documents",
        "Student_Facilities",
      ],
    },
    TRANSFER: {
      type: "TRANSFER",
      fileName: "SSVM_Transfer_Admission_Bulk.xlsx",
      version: "1.0.0",
      title: "Incoming Transfer Admission Workbook",
      description: "Bulk registration workbook for students transferring from other institutions with Transfer Certificates.",
      requiredSheets: [
        "Instructions",
        "Students",
        "Guardians",
        "Student_Guardians",
        "Previous_School",
        "Previous_Education",
        "Academic_Placement",
        "Documents",
        "Student_Facilities",
      ],
    },
  };

  /**
   * Get all registered templates
   */
  public static getAllTemplates(): AdmissionTemplateMetadata[] {
    return Object.values(this.TEMPLATES);
  }

  public static listTemplates(): AdmissionTemplateMetadata[] {
    return this.getAllTemplates();
  }

  /**
   * Get metadata for an admission template
   */
  public static getMetadata(type: AdmissionType): AdmissionTemplateMetadata {
    const meta = this.TEMPLATES[type];
    if (!meta) throw new Error(`Unknown admission template type: ${type}`);
    return meta;
  }

  /**
   * Generate downloadable versioned Excel workbook buffer
   */
  public static async generateWorkbookBuffer(
    type: AdmissionType,
    configuredClasses: string[] = [
      "Prarambha",
      "Bodha",
      "Class 1",
      "Class 2",
      "Class 3",
      "Class 4",
      "Class 5",
      "Class 6",
      "Class 7",
      "Class 8",
      "Class 9",
      "Class 10",
      "Class 11",
      "Class 12",
    ]
  ): Promise<Buffer> {
    const meta = this.getMetadata(type);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SSVM ERP Enterprise";
    workbook.lastModifiedBy = "SSVM ERP System";
    workbook.created = new Date();
    workbook.properties.date1904 = false;

    // 1. Instructions Sheet
    this.buildInstructionsSheet(workbook, meta, configuredClasses);

    // 2. Type-Specific Primary Student Sheet
    if (type === "READMISSION") {
      this.buildReAdmissionsSheet(workbook);
      this.buildProfileUpdatesSheet(workbook);
    } else {
      this.buildStudentsSheet(workbook, type);
    }

    // 3. Guardians Sheet
    this.buildGuardiansSheet(workbook);

    // 4. Student-Guardians Junction Sheet
    this.buildStudentGuardiansSheet(workbook);

    // 5. Transfer / Previous School Sheet (if TRANSFER)
    if (type === "TRANSFER") {
      this.buildPreviousSchoolSheet(workbook);
    }

    // 6. Previous Education Sheet
    this.buildPreviousEducationSheet(workbook);

    // 7. Academic Placement Sheet
    this.buildAcademicPlacementSheet(workbook, configuredClasses);

    // 8. Documents Sheet
    this.buildDocumentsSheet(workbook);

    // 9. Student Facilities Sheet
    this.buildFacilitiesSheet(workbook);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate downloadable single-file CSV template
   */
  public static generateCsvBuffer(type: AdmissionType): string {
    const headers = [
      "Import_Key*",
      "Student_Name*",
      "DOB*(YYYY-MM-DD)",
      "Gender*(MALE/FEMALE/OTHER)",
      "Blood_Group",
      "Nationality",
      "Religion",
      "Category",
      "Mother_Tongue",
      "Locality",
      "PIN_Code",
      "Permanent_Address",
      "Student_Email",
      "Student_Phone",
      "Emergency_Phone",
      "Medical_Info",
      "PEN_Number",
      "Academic_Session*",
      "Admission_Class*",
      "Section",
      "Roll_No",
      "Guardian_Name*",
      "Guardian_Phone*",
      "Guardian_Email",
      "Guardian_Relation*",
      "Guardian_Occupation",
      "Guardian_Address",
      "Transport_Required(YES/NO)",
      "Hostel_Required(YES/NO)",
      "Meals_Required(YES/NO)",
      "Facility_Details",
      "Document_Category",
      "Document_Title",
    ];

    if (type === "READMISSION") {
      headers.splice(1, 0, "Existing_SSVM_Admission_No*");
    } else if (type === "TRANSFER") {
      headers.push(
        "Previous_School_Name*",
        "Board_Affiliation",
        "Last_Class_Passed",
        "Transfer_Certificate_No",
        "TC_Issue_Date(YYYY-MM-DD)"
      );
    }

    const sampleRow = [
      "STU-001",
      ...(type === "READMISSION" ? ["ADM-2025-0042"] : []),
      "Aarav Sharma",
      "2018-05-14",
      "MALE",
      "B+",
      "Indian",
      "Hindu",
      "GENERAL",
      "Hindi",
      "Civil Lines",
      "769001",
      "Plot 12, Sector 4, Rourkela",
      "aarav.sharma@example.com",
      "9876543210",
      "9876543211",
      "No known allergies",
      "PEN-2026-987654",
      "2026-2027",
      "Class 1",
      "A",
      "101",
      "Rajesh Sharma",
      "9876543210",
      "rajesh.sharma@example.com",
      "FATHER",
      "Engineer",
      "Plot 12, Sector 4, Rourkela",
      "YES",
      "NO",
      "NO",
      "Civil Lines Stop",
      "BIRTH_CERTIFICATE",
      "Birth Certificate Copy",
      ...(type === "TRANSFER"
        ? ["Delhi Public School", "CBSE", "UKG", "TC-2026-8812", "2026-03-31"]
        : []),
    ];

    return `${headers.join(",")}\n${sampleRow.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")}\n`;
  }

  /**
   * Generate downloadable Multi-file CSV ZIP package
   */
  public static async generateCsvPackageZipBuffer(
    type: AdmissionType,
    configuredClasses: string[] = [
      "Prarambha",
      "Bodha",
      "Class 1",
      "Class 2",
      "Class 3",
      "Class 4",
      "Class 5",
      "Class 6",
      "Class 7",
      "Class 8",
      "Class 9",
      "Class 10",
      "Class 11",
      "Class 12",
    ]
  ): Promise<Buffer> {
    const meta = this.getMetadata(type);
    const zip = new AdmZip();

    // 1. Instructions.csv
    const instructionsContent = [
      `"Parameter","Value"`,
      `"Admission Type","${meta.type}"`,
      `"Template Version","${meta.version}"`,
      `"Platform","SSVM ERP Multi-File CSV Package"`,
      `"Configured Classes","${configuredClasses.join("; ")}"`,
    ].join("\n");
    zip.addFile("Instructions.csv", Buffer.from(instructionsContent, "utf8"));

    // 2. Students.csv / ReAdmissions.csv
    if (type === "READMISSION") {
      const readmCsv = [
        `"Import_Key*","Existing_SSVM_Admission_No*","Student_Name*","DOB*(YYYY-MM-DD)","Gender*","Blood_Group","Nationality","Religion","Category","Mother_Tongue","Locality","PIN_Code","Permanent_Address","Student_Email","Student_Phone","Emergency_Phone","Medical_Info","PEN_Number"`,
        `"STU-001","ADM-2025-0042","Aarav Sharma","2018-05-14","MALE","B+","Indian","Hindu","GENERAL","Hindi","Civil Lines","769001","Plot 12, Sector 4, Rourkela","aarav.sharma@example.com","9876543210","9876543211","No allergies","PEN-2026-987654"`,
      ].join("\n");
      zip.addFile("ReAdmissions.csv", Buffer.from(readmCsv, "utf8"));

      const profileUpdatesCsv = [
        `"Import_Key*","Updated_Phone","Updated_Email","Updated_Address","Updated_Blood_Group"`,
        `"STU-001","9876543210","aarav.updated@example.com","New Address, Rourkela","B+"`,
      ].join("\n");
      zip.addFile("Profile_Updates.csv", Buffer.from(profileUpdatesCsv, "utf8"));
    } else {
      const studentsCsv = [
        `"Import_Key*","Student_Name*","DOB*(YYYY-MM-DD)","Gender*","Blood_Group","Nationality","Religion","Category","Mother_Tongue","Locality","PIN_Code","Permanent_Address","Student_Email","Student_Phone","Emergency_Phone","Medical_Info","PEN_Number"`,
        `"STU-001","Aarav Sharma","2018-05-14","MALE","B+","Indian","Hindu","GENERAL","Hindi","Civil Lines","769001","Plot 12, Sector 4, Rourkela","aarav.sharma@example.com","9876543210","9876543211","No allergies","PEN-2026-987654"`,
      ].join("\n");
      zip.addFile("Students.csv", Buffer.from(studentsCsv, "utf8"));
    }

    // 3. Guardians.csv
    const guardiansCsv = [
      `"Guardian_Key*","Guardian_Name*","Relationship*","Primary_Phone*","Primary_Email","Occupation","Annual_Income","Residential_Address","Is_Emergency_Contact"`,
      `"GRD-001","Rajesh Sharma","FATHER","9876543210","rajesh.sharma@example.com","Engineer","750000","Plot 12, Sector 4, Rourkela","YES"`,
      `"GRD-002","Pooja Sharma","MOTHER","9876543211","pooja.sharma@example.com","Doctor","800000","Plot 12, Sector 4, Rourkela","YES"`,
    ].join("\n");
    zip.addFile("Guardians.csv", Buffer.from(guardiansCsv, "utf8"));

    // 4. Student_Guardians.csv
    const sgCsv = [
      `"Import_Key*","Guardian_Key*","Relationship_To_Student*","Is_Primary"`,
      `"STU-001","GRD-001","FATHER","YES"`,
      `"STU-001","GRD-002","MOTHER","NO"`,
    ].join("\n");
    zip.addFile("Student_Guardians.csv", Buffer.from(sgCsv, "utf8"));

    // 5. Academic_Placement.csv
    const placeCsv = [
      `"Import_Key*","Academic_Session*","Admission_Class*","Allocated_Section","Allocated_Roll_No","Campus_Branch"`,
      `"STU-001","2026-2027","Class 1","A","101","Main Campus"`,
    ].join("\n");
    zip.addFile("Academic_Placement.csv", Buffer.from(placeCsv, "utf8"));

    // 6. Previous_School.csv (if TRANSFER)
    if (type === "TRANSFER") {
      const prevCsv = [
        `"Import_Key*","Previous_School_Name*","Board_Affiliation","Last_Class_Passed","Academic_Session","Roll_No","Transfer_Certificate_No","TC_Issue_Date(YYYY-MM-DD)","School_Address"`,
        `"STU-001","Delhi Public School","CBSE","UKG","2025-2026","42","TC-2026-8812","2026-03-31","Sector 14, Rourkela"`,
      ].join("\n");
      zip.addFile("Previous_School.csv", Buffer.from(prevCsv, "utf8"));
    }

    // 7. Student_Facilities.csv
    const facCsv = [
      `"Import_Key*","Facility_Code*","Facility_Details"`,
      `"STU-001","TRANSPORT","Route 4 Stop Civil Lines"`,
    ].join("\n");
    zip.addFile("Student_Facilities.csv", Buffer.from(facCsv, "utf8"));

    // 8. Documents.csv
    const docCsv = [
      `"Import_Key*","Document_Category*","Document_Title*","File_Reference"`,
      `"STU-001","BIRTH_CERTIFICATE","Student Birth Certificate Copy","stu001_birth_cert.pdf"`,
    ].join("\n");
    zip.addFile("Documents.csv", Buffer.from(docCsv, "utf8"));

    // 9. manifest.json
    const manifest = {
      templateType: meta.type,
      templateVersion: meta.version,
      generatedAt: new Date().toISOString(),
      requiredSheets: meta.requiredSheets,
      format: "SSVM_MULTI_FILE_CSV_PACKAGE",
    };
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));

    return zip.toBuffer();
  }

  // ─────────────────────────────────────────────────────────────
  // SHEET BUILDERS
  // ─────────────────────────────────────────────────────────────

  private static buildInstructionsSheet(
    workbook: ExcelJS.Workbook,
    meta: AdmissionTemplateMetadata,
    configuredClasses: string[]
  ): void {
    const sheet = workbook.addWorksheet("Instructions", {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { width: 28 },
      { width: 75 },
    ];

    // Title banner
    sheet.mergeCells("A1:B1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `SSVM ERP — ${meta.title} (v${meta.version})`;
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Deep Navy
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(1).height = 40;

    const rows: Array<[string, string]> = [
      ["Admission Type", meta.type],
      ["Template Version", meta.version],
      ["Target Platform", "SSVM ERP — Academic & Student Administration"],
      ["", ""],
      ["CRITICAL INSTRUCTIONS", "READ BEFORE ENTERING DATA:"],
      [
        "1. Approved Admissions Only",
        "This workbook is for students who have ALREADY received verified offline admission approval. Do NOT use this for online applications.",
      ],
      [
        "2. Stable Relationship Keys",
        "Use 'Import_Key' (e.g. STU-001, STU-002) to uniquely identify students across all sheets. Use 'Guardian_Key' (e.g. GRD-001) for guardians.",
      ],
      [
        "3. Non-Compacting Columns",
        "Empty optional cells must remain empty and MUST NOT shift subsequent cells left. Do NOT enter placeholder text like 'N/A', 'null', or dashes.",
      ],
      [
        "4. Date Format",
        "All dates must strictly use YYYY-MM-DD format (e.g. 2012-08-25).",
      ],
      [
        "5. Re-Admission Invariant",
        meta.type === "READMISSION"
          ? "Existing SSVM Admission/Registration Number is MANDATORY for every returning student. A new number will NOT be issued."
          : "For new enrollments, permanent SSVM Admission Numbers will be automatically allocated upon commit.",
      ],
      [
        "6. Valid Class References",
        `Configured admission classes in this institution: [${configuredClasses.join(", ")}].`,
      ],
      [
        "7. Allowed Gender Values",
        "MALE, FEMALE, OTHER",
      ],
      [
        "8. Allowed Blood Groups",
        "A+, A-, B+, B-, AB+, AB-, O+, O-",
      ],
    ];

    rows.forEach(([label, value]) => {
      const r = sheet.addRow([label, value]);
      if (label.startsWith("CRITICAL") || label.startsWith("1.") || label.startsWith("2.") || label.startsWith("5.")) {
        r.getCell(1).font = { bold: true, color: { argb: "FF991B1B" } };
        r.getCell(2).font = { bold: true };
      } else {
        r.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
        r.getCell(2).font = { color: { argb: "FF1F2937" } };
      }
    });
  }

  private static buildStudentsSheet(workbook: ExcelJS.Workbook, type: AdmissionType): void {
    const sheet = workbook.addWorksheet("Students");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Unique key (e.g. STU-001)" },
      { name: "Student_Name", label: "Student_Name*", width: 26, note: "Full legal name" },
      { name: "Nickname", label: "Nickname", width: 18, note: "Optional calling name" },
      { name: "DOB", label: "DOB (YYYY-MM-DD)*", width: 20, note: "Birth date YYYY-MM-DD" },
      { name: "Gender", label: "Gender*", width: 16, note: "MALE, FEMALE, OTHER" },
      { name: "Blood_Group", label: "Blood_Group", width: 16, note: "A+, B+, O+, AB+, etc." },
      { name: "Nationality", label: "Nationality", width: 16, note: "Default: Indian" },
      { name: "Religion", label: "Religion", width: 16, note: "Optional" },
      { name: "Category", label: "Category", width: 16, note: "GEN, OBC, SC, ST, EWS" },
      { name: "Mother_Tongue", label: "Mother_Tongue", width: 18, note: "e.g. Hindi, English" },
      { name: "Locality", label: "Locality", width: 20, note: "Residential neighborhood" },
      { name: "PEN", label: "PEN_Number", width: 20, note: "Permanent Education Number" },
      { name: "Student_Email", label: "Student_Email", width: 26, note: "Personal or school email" },
      { name: "Student_Phone", label: "Student_Phone", width: 18, note: "Contact mobile number" },
      { name: "Permanent_Address", label: "Permanent_Address", width: 35, note: "Full home address" },
    ];

    this.styleHeaderRow(sheet, headers);

    // Sample data row
    sheet.addRow([
      "STU-001",
      "Aarav Sharma",
      "Avi",
      "2014-06-15",
      "MALE",
      "O+",
      "Indian",
      "Hindu",
      "GEN",
      "Hindi",
      "Civil Lines",
      "PEN98765432101",
      "aarav.s@example.com",
      "+919876543210",
      "Flat 402, Shivam Apts, Civil Lines, Jaipur, RJ 302006",
    ]);
  }

  private static buildReAdmissionsSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("ReAdmissions");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Unique key (e.g. STU-001)" },
      {
        name: "Existing_SSVM_Admission_No",
        label: "Existing_SSVM_Admission_No*",
        width: 32,
        note: "MANDATORY: Existing school admission/registration number",
      },
      { name: "Student_Name", label: "Student_Name*", width: 26, note: "Must match existing record" },
      { name: "DOB", label: "DOB (YYYY-MM-DD)*", width: 20, note: "Birth date YYYY-MM-DD" },
      { name: "Gender", label: "Gender*", width: 16, note: "MALE, FEMALE, OTHER" },
      { name: "ReAdmission_Reason", label: "ReAdmission_Reason*", width: 30, note: "e.g. Session restart, Transfer return" },
      { name: "Previous_Exit_Date", label: "Previous_Exit_Date", width: 20, note: "YYYY-MM-DD" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow([
      "STU-001",
      "ADM-2024-0412",
      "Rohan Deshmukh",
      "2013-09-12",
      "MALE",
      "Returning from leave of absence",
      "2025-03-31",
    ]);
  }

  private static buildProfileUpdatesSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Profile_Updates");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Matches ReAdmissions Import_Key" },
      { name: "Updated_Phone", label: "Updated_Phone", width: 18, note: "New phone number (optional)" },
      { name: "Updated_Email", label: "Updated_Email", width: 26, note: "New email address (optional)" },
      { name: "Updated_Address", label: "Updated_Address", width: 35, note: "New residential address" },
      { name: "Updated_Blood_Group", label: "Updated_Blood_Group", width: 20, note: "Updated blood group" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow([
      "STU-001",
      "+919876543299",
      "rohan.new@example.com",
      "Plot 14, Sunrise Enclave, Jaipur",
      "B+",
    ]);
  }

  private static buildGuardiansSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Guardians");
    const headers = [
      { name: "Guardian_Key", label: "Guardian_Key*", width: 16, note: "Unique key (e.g. GRD-001)" },
      { name: "Guardian_Name", label: "Guardian_Name*", width: 26, note: "Full legal name" },
      { name: "Relationship", label: "Relationship*", width: 18, note: "FATHER, MOTHER, GUARDIAN, OTHER" },
      { name: "Primary_Phone", label: "Primary_Phone*", width: 18, note: "Mandatory mobile number" },
      { name: "Primary_Email", label: "Primary_Email", width: 26, note: "Contact email address" },
      { name: "Occupation", label: "Occupation", width: 20, note: "Profession or job title" },
      { name: "Annual_Income", label: "Annual_Income", width: 18, note: "Annual income in INR" },
      { name: "Address", label: "Address", width: 35, note: "Residential address" },
      { name: "Is_Emergency_Contact", label: "Is_Emergency_Contact", width: 22, note: "TRUE or FALSE" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow([
      "GRD-001",
      "Rajesh Sharma",
      "FATHER",
      "+919876543210",
      "rajesh.sharma@example.com",
      "Civil Engineer",
      "1200000",
      "Flat 402, Shivam Apts, Civil Lines, Jaipur",
      "TRUE",
    ]);
    sheet.addRow([
      "GRD-002",
      "Sunita Sharma",
      "MOTHER",
      "+919876543211",
      "sunita.sharma@example.com",
      "Architect",
      "950000",
      "Flat 402, Shivam Apts, Civil Lines, Jaipur",
      "TRUE",
    ]);
  }

  private static buildStudentGuardiansSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Student_Guardians");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Matches Students Import_Key" },
      { name: "Guardian_Key", label: "Guardian_Key*", width: 16, note: "Matches Guardians Guardian_Key" },
      { name: "Relationship", label: "Relationship*", width: 18, note: "FATHER, MOTHER, etc." },
      { name: "Is_Primary", label: "Is_Primary*", width: 16, note: "TRUE for main communications" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow(["STU-001", "GRD-001", "FATHER", "TRUE"]);
    sheet.addRow(["STU-001", "GRD-002", "MOTHER", "FALSE"]);
  }

  private static buildPreviousSchoolSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Previous_School");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Matches Students Import_Key" },
      { name: "Previous_School_Name", label: "Previous_School_Name*", width: 32, note: "Institution student is transferring from" },
      { name: "Previous_Board", label: "Previous_Board", width: 20, note: "CBSE, ICSE, State Board" },
      { name: "Previous_Address", label: "Previous_Address", width: 35, note: "School city/state" },
      { name: "Previous_Class", label: "Previous_Class", width: 18, note: "Last class passed or studied" },
      { name: "Previous_Session", label: "Previous_Session", width: 18, note: "e.g. 2025-26" },
      { name: "Previous_Roll_No", label: "Previous_Roll_No", width: 20, note: "Roll no in previous school" },
      { name: "TC_Number", label: "TC_Number*", width: 22, note: "Transfer Certificate Number" },
      { name: "TC_Issue_Date", label: "TC_Issue_Date", width: 20, note: "YYYY-MM-DD" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow([
      "STU-001",
      "St. Xavier Public School",
      "CBSE",
      "Jaipur, Rajasthan",
      "Class 9",
      "2025-26",
      "42",
      "TC-2026-8812",
      "2026-03-28",
    ]);
  }

  private static buildPreviousEducationSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Previous_Education");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Matches Students Import_Key" },
      { name: "Last_School_Attended", label: "Last_School_Attended", width: 30, note: "Optional previous school" },
      { name: "Last_Class_Completed", label: "Last_Class_Completed", width: 22, note: "e.g. Class 4" },
      { name: "Percentage_Marks", label: "Percentage_Marks", width: 18, note: "e.g. 88.5" },
      { name: "Medium_Of_Instruction", label: "Medium_Of_Instruction", width: 22, note: "English, Hindi" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow([
      "STU-001",
      "Bright Beginnings Pre-School",
      "Class 4",
      "91.2",
      "English",
    ]);
  }

  private static buildAcademicPlacementSheet(
    workbook: ExcelJS.Workbook,
    configuredClasses: string[]
  ): void {
    const sheet = workbook.addWorksheet("Academic_Placement");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Matches Students Import_Key" },
      { name: "Academic_Session", label: "Academic_Session*", width: 20, note: "e.g. 2026-2027" },
      {
        name: "Admission_Class",
        label: "Admission_Class*",
        width: 20,
        note: `One of: [${configuredClasses.slice(0, 5).join(", ")}, ...]`,
      },
      { name: "Section", label: "Section", width: 14, note: "A, B, C (Optional at admission)" },
      { name: "Campus_Name", label: "Campus_Name", width: 20, note: "Main Campus (Optional)" },
      { name: "Roll_No", label: "Roll_No", width: 16, note: "Class roll no (Optional)" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow([
      "STU-001",
      "2026-2027",
      "Class 10",
      "A",
      "Main Campus",
      "101",
    ]);
  }

  private static buildDocumentsSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Documents");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Matches Students Import_Key" },
      {
        name: "Document_Category",
        label: "Document_Category*",
        width: 24,
        note: "BIRTH_CERTIFICATE, AADHAAR, TC, MARKSHEET, ADMISSION_FORM, OTHER",
      },
      { name: "Document_Title", label: "Document_Title*", width: 28, note: "e.g. Birth Certificate Scanned Copy" },
      { name: "File_Reference", label: "File_Reference", width: 26, note: "Reference name for document uploaded via ERP" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow([
      "STU-001",
      "BIRTH_CERTIFICATE",
      "Original Municipal Birth Certificate",
      "stu001_birth_cert.pdf",
    ]);
    sheet.addRow([
      "STU-001",
      "AADHAAR",
      "Student Aadhaar Card Copy",
      "stu001_aadhaar.pdf",
    ]);
  }

  private static buildFacilitiesSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet("Student_Facilities");
    const headers = [
      { name: "Import_Key", label: "Import_Key*", width: 16, note: "Matches Students Import_Key" },
      { name: "Facility_Code", label: "Facility_Code*", width: 20, note: "HOSTEL, TRANSPORT, MEALS" },
      { name: "Facility_Details", label: "Facility_Details", width: 30, note: "e.g. Route 4 Stop Civil Lines / Block B" },
    ];

    this.styleHeaderRow(sheet, headers);

    sheet.addRow(["STU-001", "TRANSPORT", "Route 4 Stop Civil Lines"]);
  }

  private static styleHeaderRow(
    sheet: ExcelJS.Worksheet,
    headers: Array<{ name: string; label: string; width: number; note?: string }>
  ): void {
    sheet.columns = headers.map((h) => ({ width: h.width }));

    const headerValues = headers.map((h) => h.label);
    const headerRow = sheet.addRow(headerValues);

    headerRow.height = 32;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Deep Navy
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      const meta = headers[colNumber - 1];
      if (meta?.note) {
        cell.note = meta.note;
      }
    });
  }
}

