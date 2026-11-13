# SSVM ERP — Bulk Student Registration & Admission Workflow Specification

**Document:** `docs/admissions/BULK_REGISTRATION_SPECIFICATION.md`  
**Status:** Canonical & Verified  
**Audience:** Platform Architects, School Administrators, Backend & Frontend Engineers  
**Target Branch:** `lane/d-portals`

---

## 1. Executive Summary & Core Philosophy

SSVM operates under a **strictly offline, paper-first admission model**. Students do not complete admissions or pay initial admission fees online. The offline process occurs as follows:
1. Parents collect and fill physical paper admission forms (New, Re-admission, or Transfer).
2. The School Admission Committee and Principal verify original documents, conduct offline interactions, and grant offline approval in physical registers.
3. The Admission Incharge prepares the official multi-sheet Excel bulk registration workbook corresponding to the approved admission type.
4. The Incharge accesses **ERP Admin → Admissions & Student Affairs → Bulk Registration**, uploads the workbook, enters offline approval credentials with authenticated attestation, reviews multi-tier validation previews, and commits the records.
5. Canonical Student, User, Guardian, Academic Placement, and Admission records are created inside transaction-scoped PostgreSQL RLS blocks.

### Invariant: Approved Admissions Only
Bulk registration is a technical ingestion and entity provisioning engine, **never an approval engine**. No online application workflow, digital approval queue, or simulated spreadsheet approval cell is permitted.

---

## 2. Three Specialized Admission Workflows

| Admission Type | Workbook Filename | Target Cohort | Number Generation Strategy |
| :--- | :--- | :--- | :--- |
| **New Admission** | `SSVM_New_Admission_Bulk.xlsx` | Students joining SSVM for the first time. | Atomically allocates new permanent monotonic Admission Number (`ADM-{YEAR}-{SEQ}`). |
| **Re-admission** | `SSVM_Readmission_Bulk.xlsx` | Former or continuing SSVM students re-enrolling. | **Retains original permanent Admission Number**; enforces mandatory existing number lookup; provisions new session enrollment. |
| **Incoming Transfer** | `SSVM_Transfer_Admission_Bulk.xlsx` | Students transferring from another school with a TC. | Allocates new permanent SSVM Admission Number; captures previous school and Transfer Certificate history. |

---

## 3. High-Level System Architecture

```
[ Offline Paper Form & Approval ]
               │
               ▼
[ 3 Multi-Sheet Excel Workbooks (.xlsx) ]
               │
               ▼
┌────────────────────────────────────────────────────────┐
│             SSVM Backend Ingestion Engine              │
│                                                        │
│  1. ExcelJS Multi-Sheet Workbook Parser                │
│     - Non-compacting column mapping                    │
│     - Empty cells → NULL (never "N/A")                 │
│                                                        │
│  2. Admission Validation Engine                        │
│     - Tenant cache preloading (0 N+1 queries)          │
│     - Relational integrity (Import_Key, Guardian_Key)  │
│     - Duplicate identity & PEN detection               │
│                                                        │
│  3. Mandatory Offline Approval Attestation             │
│     - Attested: true, Approving Authority & Date       │
│                                                        │
│  4. Transactional Registration Service                 │
│     - runWithTenantDatabaseTransaction (RLS-scoped)    │
│     - Atomic ADM-{YEAR}-{SEQ} generator               │
│     - Canonical Student + User + Guardian + Placement  │
└────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────┐
│             ERP Admin & Database Persistence           │
│                                                        │
│  - PostgreSQL 16 (fail-closed tenant isolation)        │
│  - Student Admission Register Integration              │
│  - Student Timeline Event History (Audit Trail)        │
└────────────────────────────────────────────────────────┘
```

---

## 4. Relationship Keys

To preserve database relational normalization while keeping Excel authoring intuitive:
- **`Import_Key`**: Unique temporary identifier assigned to a student record across all sheets (`STU-001`, `STU-002`).
- **`Guardian_Key`**: Unique temporary identifier assigned to a guardian (`GRD-001`, `GRD-002`).
- **`Student_Guardians` Sheet**: Junction sheet linking `Import_Key` to `Guardian_Key` with `Relationship` and `Is_Primary` boolean flag.

Import keys are strictly temporary ingestion tokens and are discarded upon database commit.

---

## 5. Offline Approval Attestation Contract

Every batch commit requires explicit authenticated user attestation:

```typescript
export interface OfflineApprovalAttestation {
  admissionType: "NEW" | "READMISSION" | "TRANSFER";
  sessionId: string;
  approvalDate: string;             // YYYY-MM-DD
  approvingAuthority: string;       // e.g. "Dr. S. K. Dash, Principal"
  approvalRegisterNumber?: string;  // e.g. "REG-2026-OFFLINE-01"
  attested: boolean;                // MUST BE TRUE
  attestedByUserId: string;         // Authenticated session user ID
  attestedAt: string;               // ISO 8601 timestamp
}
```

If `attested` is `false`, the backend fails closed immediately with `OFFLINE_APPROVAL_ATTESTATION_REQUIRED`.

