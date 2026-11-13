/**
 * ssvm-backend/src/services/import-framework/template-registry.ts
 *
 * Canonical schema definitions for all bulk-importable ERP modules.
 * Specifies field names, types, constraints, aliases, and example values.
 */

export type FieldDataType = "string" | "number" | "boolean" | "date" | "email" | "phone" | "enum";

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldDataType;
  required: boolean;
  enumValues?: string[];
  description: string;
  example: string | number;
  aliases: string[];
}

export interface ModuleTemplateDefinition {
  moduleId: string;
  moduleName: string;
  category: string;
  description: string;
  uniqueIdentifier: string;
  fields: FieldDefinition[];
  relationships?: Array<{ field: string; entity: string; description: string }>;
}

export const MODULE_TEMPLATES: Record<string, ModuleTemplateDefinition> = {
  students: {
    moduleId: "students",
    moduleName: "Student Directory",
    category: "Admissions & Student Affairs",
    description: "Enroll or update student profiles, roll numbers, academic placement, and contact info.",
    uniqueIdentifier: "rollNo",
    fields: [
      {
        name: "name",
        label: "Student Name",
        type: "string",
        required: true,
        description: "Full legal name of the student.",
        example: "Aarav Sharma",
        aliases: ["student name", "name", "full name", "student"],
      },
      {
        name: "rollNo",
        label: "Roll Number",
        type: "string",
        required: true,
        description: "Unique school roll number.",
        example: "STU-2026-001",
        aliases: ["roll no", "roll number", "rollno", "roll"],
      },
      {
        name: "admissionNo",
        label: "Admission Number",
        type: "string",
        required: false,
        description: "Permanent institutional admission number.",
        example: "ADM-2026-1042",
        aliases: ["admission no", "admission number", "adm no", "admissionid"],
      },
      {
        name: "className",
        label: "Class Name",
        type: "string",
        required: true,
        description: "Name of the class (must exist in Institution Setup).",
        example: "Class 10",
        aliases: ["class", "class name", "grade", "standard"],
      },
      {
        name: "sectionName",
        label: "Section Name",
        type: "string",
        required: false,
        description: "Section name within the class.",
        example: "A",
        aliases: ["section", "section name", "sec"],
      },
      {
        name: "email",
        label: "Student Email",
        type: "email",
        required: false,
        description: "Student institutional or personal email address.",
        example: "aarav.sharma@example.com",
        aliases: ["email", "student email", "mail"],
      },
      {
        name: "phone",
        label: "Student Phone",
        type: "phone",
        required: false,
        description: "Contact mobile number.",
        example: "+919876543210",
        aliases: ["phone", "mobile", "contact", "student phone"],
      },
      {
        name: "gender",
        label: "Gender",
        type: "enum",
        required: false,
        enumValues: ["MALE", "FEMALE", "OTHER"],
        description: "Student gender (MALE, FEMALE, OTHER).",
        example: "MALE",
        aliases: ["gender", "sex"],
      },
      {
        name: "dob",
        label: "Date of Birth",
        type: "date",
        required: false,
        description: "Birth date in YYYY-MM-DD or DD/MM/YYYY format.",
        example: "2010-05-15",
        aliases: ["dob", "date of birth", "birth date"],
      },
    ],
    relationships: [
      { field: "className", entity: "Class", description: "Must match a valid Class in this school." },
      { field: "sectionName", entity: "Section", description: "Must match an existing Section in the specified Class." },
    ],
  },

  guardians: {
    moduleId: "guardians",
    moduleName: "Parents & Guardians",
    category: "Admissions & Student Affairs",
    description: "Import parent/guardian contact info and map them to students via student roll number.",
    uniqueIdentifier: "primaryPhone",
    fields: [
      {
        name: "name",
        label: "Guardian Name",
        type: "string",
        required: true,
        description: "Full name of parent or legal guardian.",
        example: "Rajesh Sharma",
        aliases: ["guardian name", "parent name", "father name", "mother name", "name"],
      },
      {
        name: "relationship",
        label: "Relationship",
        type: "enum",
        required: true,
        enumValues: ["FATHER", "MOTHER", "GUARDIAN", "OTHER"],
        description: "FATHER, MOTHER, GUARDIAN, or OTHER.",
        example: "FATHER",
        aliases: ["relationship", "relation", "type"],
      },
      {
        name: "primaryPhone",
        label: "Primary Phone",
        type: "phone",
        required: true,
        description: "Mobile number used for SMS alerts and communications.",
        example: "+919876543210",
        aliases: ["phone", "mobile", "primary phone", "contact number"],
      },
      {
        name: "primaryEmail",
        label: "Email Address",
        type: "email",
        required: false,
        description: "Primary email address for invoices and academic reports.",
        example: "rajesh.sharma@example.com",
        aliases: ["email", "primary email", "parent email"],
      },
      {
        name: "studentRollNo",
        label: "Student Roll Number",
        type: "string",
        required: true,
        description: "Roll number of the student linked to this guardian.",
        example: "STU-2026-001",
        aliases: ["student roll no", "student roll", "child roll no", "student"],
      },
      {
        name: "occupation",
        label: "Occupation",
        type: "string",
        required: false,
        description: "Professional occupation.",
        example: "Civil Engineer",
        aliases: ["occupation", "profession", "designation"],
      },
      {
        name: "isEmergencyContact",
        label: "Is Emergency Contact",
        type: "boolean",
        required: false,
        description: "TRUE or FALSE (default TRUE).",
        example: "TRUE",
        aliases: ["emergency contact", "is emergency", "emergency"],
      },
    ],
    relationships: [
      { field: "studentRollNo", entity: "Student", description: "Must match an existing student's Roll Number in this school." },
    ],
  },

  staff: {
    moduleId: "staff",
    moduleName: "Staff & Employee Directory",
    category: "HR & Workforce",
    description: "Maintain canonical employee identities, departments, and employment details.",
    uniqueIdentifier: "employeeId",
    fields: [
      {
        name: "name",
        label: "Full Name",
        type: "string",
        required: true,
        description: "Full legal name of the staff member.",
        example: "Dr. Sunita Rao",
        aliases: ["name", "staff name", "employee name", "full name"],
      },
      {
        name: "email",
        label: "Email Address",
        type: "email",
        required: true,
        description: "Official institutional login email.",
        example: "sunita.rao@school.edu",
        aliases: ["email", "official email", "staff email"],
      },
      {
        name: "employeeId",
        label: "Employee ID",
        type: "string",
        required: true,
        description: "Unique staff payroll/employee identifier.",
        example: "EMP-104",
        aliases: ["employee id", "empid", "staff id", "employee code"],
      },
      {
        name: "role",
        label: "Role",
        type: "enum",
        required: true,
        enumValues: ["TEACHER", "ACCOUNTANT", "HR", "RECEPTIONIST", "LIBRARIAN", "ASSET_MANAGER", "ERP_ADMIN"],
        description: "System role for platform permissions.",
        example: "TEACHER",
        aliases: ["role", "system role", "designation role"],
      },
      {
        name: "department",
        label: "Department",
        type: "string",
        required: false,
        description: "Department name (e.g. Science, Mathematics, Transport).",
        example: "Science",
        aliases: ["department", "dept"],
      },
      {
        name: "phone",
        label: "Phone Number",
        type: "phone",
        required: false,
        description: "Contact mobile number.",
        example: "+919876543299",
        aliases: ["phone", "mobile", "contact"],
      },
    ],
  },

  classes: {
    moduleId: "classes",
    moduleName: "Classes & Sections",
    category: "Institution Setup",
    description: "Configure academic classes, section divisions, and seating capacity.",
    uniqueIdentifier: "className",
    fields: [
      {
        name: "className",
        label: "Class Name",
        type: "string",
        required: true,
        description: "Class name (e.g. Class 1, Grade 10).",
        example: "Class 10",
        aliases: ["class", "class name", "grade"],
      },
      {
        name: "sectionName",
        label: "Section Name",
        type: "string",
        required: true,
        description: "Section subdivision (e.g. A, B, C).",
        example: "A",
        aliases: ["section", "section name", "sec"],
      },
      {
        name: "capacity",
        label: "Capacity",
        type: "number",
        required: false,
        description: "Maximum student seating capacity.",
        example: 45,
        aliases: ["capacity", "max students", "seats"],
      },
      {
        name: "room",
        label: "Homeroom / Hall",
        type: "string",
        required: false,
        description: "Designated classroom number or building.",
        example: "Room 201",
        aliases: ["room", "classroom", "hall"],
      },
    ],
  },

  subjects: {
    moduleId: "subjects",
    moduleName: "Curriculum & Subjects",
    category: "Institution Setup",
    description: "Define academic subjects, subject codes, credits, and classification.",
    uniqueIdentifier: "code",
    fields: [
      {
        name: "name",
        label: "Subject Name",
        type: "string",
        required: true,
        description: "Full title of the subject.",
        example: "Advanced Mathematics",
        aliases: ["subject name", "subject", "title", "name"],
      },
      {
        name: "code",
        label: "Subject Code",
        type: "string",
        required: true,
        description: "Unique institutional subject code.",
        example: "MATH-101",
        aliases: ["subject code", "code", "course code"],
      },
      {
        name: "type",
        label: "Classification",
        type: "enum",
        required: false,
        enumValues: ["THEORY", "PRACTICAL", "CORE", "ELECTIVE", "VOCATIONAL"],
        description: "Subject category (THEORY, PRACTICAL, CORE, ELECTIVE).",
        example: "THEORY",
        aliases: ["type", "classification", "subject type"],
      },
      {
        name: "credits",
        label: "Academic Credits",
        type: "number",
        required: false,
        description: "Weight or academic credits (optional).",
        example: 4,
        aliases: ["credits", "weight", "credit hours"],
      },
    ],
  },

  attendance: {
    moduleId: "attendance",
    moduleName: "Student Attendance",
    category: "Academic Operations",
    description: "Import daily student roll-call records with strict date and duplicate validation.",
    uniqueIdentifier: "rollNo_date",
    fields: [
      {
        name: "rollNo",
        label: "Student Roll Number",
        type: "string",
        required: true,
        description: "Roll number of the student.",
        example: "STU-2026-001",
        aliases: ["roll no", "roll number", "student roll", "roll"],
      },
      {
        name: "date",
        label: "Attendance Date",
        type: "date",
        required: true,
        description: "Calendar date of attendance (YYYY-MM-DD or DD/MM/YYYY).",
        example: "2026-11-10",
        aliases: ["date", "attendance date", "day"],
      },
      {
        name: "status",
        label: "Attendance Status",
        type: "enum",
        required: true,
        enumValues: ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
        description: "PRESENT, ABSENT, LATE, or EXCUSED.",
        example: "PRESENT",
        aliases: ["status", "attendance status", "present"],
      },
      {
        name: "remarks",
        label: "Remarks / Reason",
        type: "string",
        required: false,
        description: "Optional notes or reason for absence.",
        example: "Medical appointment",
        aliases: ["remarks", "notes", "reason"],
      },
    ],
  },

  fees: {
    moduleId: "fees",
    moduleName: "Fee Structures & Assignments",
    category: "Finance & Accounts",
    description: "Define fee schedule line items and student fee assignments.",
    uniqueIdentifier: "name",
    fields: [
      {
        name: "name",
        label: "Fee Head Name",
        type: "string",
        required: true,
        description: "Title of the fee (e.g. Tuition Fee Q1, Lab Maintenance).",
        example: "Tuition Fee - Term 1",
        aliases: ["fee name", "fee head", "title", "name"],
      },
      {
        name: "amount",
        label: "Amount (₹)",
        type: "number",
        required: true,
        description: "Monetary amount in Indian Rupees.",
        example: 25000,
        aliases: ["amount", "fee amount", "tariff", "rate"],
      },
      {
        name: "frequency",
        label: "Billing Frequency",
        type: "enum",
        required: false,
        enumValues: ["ANNUAL", "TERMLY", "MONTHLY", "ONE_TIME"],
        description: "ANNUAL, TERMLY, MONTHLY, or ONE_TIME.",
        example: "TERMLY",
        aliases: ["frequency", "cycle", "period"],
      },
      {
        name: "className",
        label: "Applicable Class",
        type: "string",
        required: false,
        description: "Target class for this fee item (optional).",
        example: "Class 10",
        aliases: ["class", "class name", "target class"],
      },
    ],
  },
};

export class TemplateRegistryService {
  public static getTemplate(moduleId: string): ModuleTemplateDefinition | null {
    return MODULE_TEMPLATES[moduleId.toLowerCase()] || null;
  }

  public static getAllTemplates(): ModuleTemplateDefinition[] {
    return Object.values(MODULE_TEMPLATES);
  }
}

