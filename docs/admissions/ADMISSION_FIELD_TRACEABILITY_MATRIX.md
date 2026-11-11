# SSVM ERP — Admission Field Traceability Matrix
**Standard:** End-to-End Field Mapping (Paper Form $\leftrightarrow$ Excel Sheet $\leftrightarrow$ Prisma Database)

---

## 1. Field Mapping Table

| Logical Domain | Paper Form Field | Excel Template Column | Prisma Schema Target | Mandatory? | Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Admission Type** | Title / Badge | Metadata / Sheet name | `Admission.type` / `BulkJob.type` | Yes | `NEW`, `READMISSION`, `TRANSFER` |
| **Session** | Academic Session | `AcademicPlacements.SessionName` | `AcademicSession.id` | Yes | Target session (e.g. `2026-2027`) |
| **Class** | Class Applied For | `AcademicPlacements.ClassName` | `Class.id` | Yes | 14 configured classes |
| **Section** | Section Applied For | `AcademicPlacements.SectionName` | `Section.id` | No | Optional, defaults to unallocated |
| **Roll Number** | Roll Number (if set) | `AcademicPlacements.RollNo` | `Student.rollNo` | No | Defaults to sequence number |
| **Student Name** | Student Full Name | `Students.FullName` / `Name` | `Student.name` & `User.name` | Yes | Block letters |
| **Date of Birth** | Date of Birth | `Students.DateOfBirth` | `Student.dob` & `Admission.dob` | Yes | Valid calendar date, not in future |
| **Gender** | Gender | `Students.Gender` | `Student.gender` | Yes | `MALE`, `FEMALE`, `OTHER` |
| **Blood Group** | Blood Group | `Students.BloodGroup` | `Student.bloodGroup` | No | A+, A-, B+, B-, AB+, AB-, O+, O- |
| **PEN Number** | PEN (Permanent Ed No) | `Students.PEN` | `Student.pen` / `customFields` | No | 11-digit national ID |
| **Address** | Present Residential | `Students.Address` | `Student.address` | No | Address string |
| **Guardian Name** | Parent/Guardian Name | `Guardians.Name` | `Guardian.primaryName` | Yes | Primary contact name |
| **Guardian Phone** | Primary Mobile Phone | `Guardians.PrimaryPhone` | `Guardian.primaryPhone` | Yes | 10-digit mobile, used for deduplication |
| **Relationship** | Relation to Student | `StudentGuardians.Relationship` | `Guardian.primaryRelation` | Yes | `FATHER`, `MOTHER`, `GUARDIAN` |
| **Previous School** | Previous School Name | `PreviousSchools.SchoolName` | `PreviousAcademicRecord.schoolName` | If Transfer | Captured for transfer admissions |
| **TC Number** | TC / SLC Number | `PreviousSchools.TCNumber` | `PreviousAcademicRecord.tcNumber` | If Transfer | TC identifier |
| **TC Issue Date** | TC Issue Date | `PreviousSchools.TCIssueDate` | `PreviousAcademicRecord.tcIssueDate` | If Transfer | Date TC was issued |
| **Permanent Ad No** | Existing SSVM Reg No | `Students.ExistingAdmissionNo` | `Student.admissionNo` | If Re-admit | Retained permanent identity |
| **Offline Approval** | Office Register Box | Attestation Payload | `AuditLog.details` & `BulkJob` | Yes | Offline committee approval |

