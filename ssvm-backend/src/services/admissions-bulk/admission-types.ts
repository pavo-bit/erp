/**
 * ssvm-backend/src/services/admissions-bulk/admission-types.ts
 *
 * Core domain types and interfaces for SSVM ERP Bulk Admission Registration.
 */

export type AdmissionType = "NEW" | "READMISSION" | "TRANSFER";
export type AdmissionTemplateType = AdmissionType;

export type BulkAdmissionBatchStatus =
  | "UPLOADED"
  | "PARSING"
  | "VALIDATING"
  | "VALIDATION_FAILED"
  | "READY_TO_COMMIT"
  | "COMMITTING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type BulkAdmissionRowStatus =
  | "PENDING"
  | "VALID"
  | "INVALID"
  | "WARNING"
  | "DUPLICATE_REVIEW"
  | "EXCLUDED"
  | "REGISTERED"
  | "READMISSION_RECORDED"
  | "FAILED_TO_REGISTER";

export interface OfflineApprovalAttestation {
  admissionType: AdmissionType;
  sessionId: string;
  approvalDate: string; // YYYY-MM-DD
  approvingAuthority: string; // Name & designation (e.g. "Dr. R. K. Sharma, Principal")
  approvalRegisterNumber?: string; // Optional school register serial
  approvalEvidenceAttachmentUrl?: string; // Optional scanned approval doc
  attested: boolean; // Must be true!
  attestedByUserId: string;
  attestedAt: string; // ISO timestamp
}

export interface CellError {
  sheet: string;
  rowNumber: number;
  field: string;
  fieldLabel: string;
  value: any;
  code: string;
  message: string;
  suggestedCorrection?: string;
  isWarning?: boolean;
}

export interface StudentSheetRow {
  importKey: string;
  name: string;
  fullName?: string;
  nickname?: string | null;
  dob: string | null;
  gender: string | null;
  bloodGroup?: string | null;
  nationality?: string | null;
  religion?: string | null;
  category?: string | null;
  motherTongue?: string | null;
  locality?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  medicalInfo?: string | null;
  emergencyPhone?: string | null;
  pen?: string | null; // Permanent Education Number
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  // Re-admission specific
  existingAdmissionNo?: string | null;
  // Raw 1-based source row in worksheet
  sourceRowNumber: number;
}

export interface GuardianSheetRow {
  guardianKey: string;
  name: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  primaryPhone: string;
  primaryEmail?: string | null;
  occupation?: string | null;
  annualIncome?: number | null;
  address?: string | null;
  isEmergencyContact?: boolean;
  sourceRowNumber: number;
}

export interface StudentGuardianLinkRow {
  importKey: string;
  guardianKey: string;
  relationship: string;
  isPrimary: boolean;
  sourceRowNumber: number;
}

export interface AcademicPlacementRow {
  importKey: string;
  sessionName: string;
  className: string;
  sectionName?: string | null;
  campusName?: string | null;
  rollNo?: string | null;
  sourceRowNumber: number;
}

export interface PreviousSchoolRow {
  importKey: string;
  previousSchoolName: string;
  previousBoard?: string | null;
  previousAddress?: string | null;
  previousClass?: string | null;
  previousSession?: string | null;
  previousRollNo?: string | null;
  tcNumber?: string | null;
  tcIssueDate?: string | null;
  sourceRowNumber: number;
}

export interface DocumentMetaRow {
  importKey: string;
  documentCategory: string; // TC, BIRTH_CERTIFICATE, AADHAAR, MARKSHEET, etc.
  documentTitle: string;
  fileReference?: string | null;
  sourceRowNumber: number;
}

export interface FacilitySelectionRow {
  importKey: string;
  facilityCode: string; // HOSTEL, TRANSPORT, MEALS, etc.
  details?: string | null;
  sourceRowNumber: number;
}

export interface ParsedAdmissionWorkbook {
  batchId?: string;
  admissionType?: AdmissionType;
  totalRows?: number;
  templateType: AdmissionType;
  templateVersion: string;
  students: StudentSheetRow[];
  guardians: GuardianSheetRow[];
  studentGuardians: StudentGuardianLinkRow[];
  academicPlacements: AcademicPlacementRow[];
  previousSchools: PreviousSchoolRow[];
  facilities: FacilitySelectionRow[];
  documents: DocumentMetaRow[];
  parseErrors: CellError[];
}

export interface ValidatedStudentEntry {
  importKey: string;
  sourceRowNumber: number;
  status: BulkAdmissionRowStatus;
  student: StudentSheetRow;
  placement?: AcademicPlacementRow | null;
  guardians: Array<{ guardian: GuardianSheetRow; isPrimary: boolean; relationship: string }>;
  previousSchool?: PreviousSchoolRow | null;
  facilities: FacilitySelectionRow[];
  documents: DocumentMetaRow[];
  errors: CellError[];
  warnings: CellError[];
  // Resolved database foreign keys
  resolvedClassId?: string;
  resolvedSectionId?: string;
  resolvedSessionId?: string;
  resolvedStudentId?: string; // For Re-admission
  assignedAdmissionNo?: string;
}

export interface AdmissionBatchPreviewSummary {
  batchId: string;
  admissionType: AdmissionType;
  templateVersion: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  duplicateReviewRows: number;
  readyToRegisterCount: number;
  isValid: boolean;
  errors: CellError[];
  warnings: CellError[];
  entries: ValidatedStudentEntry[];
  summaryErrors: CellError[];
}

export interface AdmissionBatchCommitOptions {
  clearEmptyFields?: boolean; // Default FALSE
  skipInvalidRows?: boolean;  // Default TRUE
}

export interface AdmissionCommitResultItem {
  importKey: string;
  sourceRowNumber: number;
  studentId: string;
  studentName: string;
  admissionNo: string;
  status: "REGISTERED" | "READMISSION_RECORDED" | "FAILED";
  message: string;
  timelineId?: string;
  enrollmentSection?: string;
  invitationStatus?: "SENT" | "UNDELIVERABLE" | "FAILED";
}

export interface AdmissionBatchCommitResult {
  batchId: string;
  admissionType: AdmissionType;
  totalRows: number;
  successCount: number;
  successfulRows?: number;
  failedCount: number;
  failedRows?: number;
  status: "COMPLETED" | "PARTIALLY_COMPLETED" | "FAILED";
  results: AdmissionCommitResultItem[];
  records?: AdmissionCommitResultItem[];
  errorLog: Array<{ importKey: string; rowNumber: number; errors: string[] }>;
}

