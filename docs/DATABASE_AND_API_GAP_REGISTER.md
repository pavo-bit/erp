# Database and API Gap Register: SSVM ERP

**Document Version:** 1.0.0  
**Scope:** Prisma Schema, API Routes, Frontend Portal Coverage, Known Gaps  

---

## 1. Database Schema Breakdown (208 Models)

### 1.1. Tenant-Scoped Models (127 Models with direct `schoolId`)
All 127 models contain a mandatory `schoolId` foreign key to `School(id)` and are protected by PostgreSQL Row Level Security:

1. **Academic & Students:** `Student`, `StudentProfile`, `Class`, `Subject`, `Attendance`, `Exam`, `Grade`, `ReportCard`, `Homework`, `Assignment`, `StudentDocument`, `Enrollment`, `ClassSection`.
2. **Finance & Accounting:** `FeeStructure`, `FeeComponent`, `FeeItem`, `Invoice`, `InvoiceItem`, `PaymentTransaction`, `Receipt`, `LedgerAccount`, `JournalEntry`, `FiscalYear`, `FinancialPeriod`, `FineRule`, `TaxRate`, `BankReconciliation`, `Scholarship`.
3. **HR & Staff:** `Staff`, `Teacher`, `Department`, `Designation`, `LeaveApplication`, `Payroll`, `SalaryComponent`, `BiometricLog`, `StaffDocument`.
4. **Operations & Assets:** `InventoryItem`, `StockTransaction`, `Vendor`, `PurchaseOrder`, `GoodsReceipt`, `GoodsReceiptLine`, `Asset`, `AssetCategory`, `Vehicle`, `TransportRoute`, `Book`, `BookIssue`, `VisitorPass`.
5. **System & Audit:** `AuditLog`, `SystemLog`, `Notification`, `Event`, `Notice`, `DisciplineIncident`, `SchoolBranch`.

### 1.2. Indirect Tenant Models (50 Models without direct `schoolId`)
These models join directly to a tenant-scoped parent model (e.g. `InvoiceItem -> Invoice`, `PurchaseOrderItem -> PurchaseOrder`):
- `Section`, `TimetableSlot`, `ClassSubject`, `ExamSubject`, `StudentMark`, `AssignmentSubmission`, `AssignmentAttachment`, `PurchaseOrderItem`, `PurchaseRequestItem`, `BudgetLine`, `PostingRuleLine`, `WorkflowStep`, etc.
- **RLS Protection Strategy:** Protected either by inherited join queries or by subquery policies in PostgreSQL.

### 1.3. Global / Multi-Tenant Platform Models (31 Models)
Models that exist across all schools or belong exclusively to the SaaS platform operator:
- `School`, `SchoolGroup`, `SubscriptionPlanConfig`, `Permission`, `RolePermission`, `FeatureFlag`, `Currency`, `MasterCountry`, `MasterState`, `MasterCity`, `MasterSubject`, `MasterDepartment`, `AppConfiguration`, `SystemBackup`.

### 1.4. Soft-Delete Enabled Models (12 Models)
Models containing `deletedAt DateTime?` for recoverable archiving:
- `Student`, `User`, `Teacher`, `Staff`, `Invoice`, `PaymentTransaction`, `Class`, `Section`, `Subject`, `InventoryItem`, `Vendor`, `PurchaseOrder`.
- **Soft-Delete Policy:** Soft-delete interceptor verifies that queries exclude `deletedAt IS NOT NULL` unless explicitly requesting archived records, and soft-delete mutations happen within tenant transactions.

---

## 2. API Route & Backend Implementation Gaps

| API Route Group | Registered Endpoints | Implementation Status | Identified Functional Gaps |
|---|---|---|---|
| `/api/v1/auth` | 14 | IMPLEMENTED | MFA / TOTP enrollment verification needs UI polish; session listing complete. |
| `/api/v1/students` | 18 | IMPLEMENTED | Student promotion bulk API needs dry-run validation checks. |
| `/api/v1/teachers` | 12 | IMPLEMENTED | Timetable assignment collision detection needs unit tests. |
| `/api/v1/invoices` | 16 | IMPLEMENTED | Bulk invoice generation with fine rule application verified. |
| `/api/v1/finance` | 24 | PARTIALLY IMPLEMENTED | General ledger posting verified; bank reconciliation (`/finance/reconciliation`) returns 501 stub. |
| `/api/v1/payments` | 10 | IMPLEMENTED | Razorpay order generation, signature verification, and webhook handling implemented. |
| `/api/v1/attendance` | 8 | IMPLEMENTED | Daily marking and reporting complete; biometric bulk ingestion endpoint needs performance testing. |
| `/api/v1/exams` | 14 | IMPLEMENTED | Mark entry and GPA calculation functional; report card PDF generation needs streaming response. |
| `/api/v1/hr` | 16 | PARTIALLY IMPLEMENTED | Staff onboarding and leave management complete; automated payslip email delivery needs worker hookup. |
| `/api/v1/library` | 12 | IMPLEMENTED | Book issue/return complete; automated fine invoice generation upon late return needs end-to-end integration. |
| `/api/v1/transport` | 10 | IMPLEMENTED | Routes, stops, vehicle tracking metadata complete; GPS telemetry ingestion endpoint needs rate limit tuning. |
| `/api/v1/inventory` | 14 | IMPLEMENTED | Items, categories, POs, and Goods Receipts (Lane B) functional. |
| `/api/v1/notifications` | 8 | PARTIALLY IMPLEMENTED | In-app notifications functional; external SMS gateway webhook and failure retry need fallback queue. |
| `/api/v1/saas` | 16 | IMPLEMENTED | School onboarding and feature flag toggle functional. |
| `/api/v1/health` | 4 | IMPLEMENTED | Liveness, readiness, metrics, and DB ping endpoints verified. |

---

## 3. Frontend Portal API Coverage & Gap Register

From the exhaustive audit of 90 pages across all 7 frontend portals:

| Portal | Total Pages | Real API Connected | Mock / Static State | Identified Page Gaps |
|---|---|---|---|---|
| `erp-admin` | 42 | 31 | 11 | - `admin/crm`: Static demo leads.<br>- `admin/reconciliation`: UI ready, backend returns 501.<br>- `admin/transport/tracking`: Static map placeholder.<br>- `admin/ancillary`: Mock cafeteria/dormitory items. |
| `super-admin` | 8 | 6 | 2 | - `super-admin/telemetry`: Needs live Prometheus query proxy.<br>- `super-admin/billing`: Subscription change needs webhook hookup. |
| `teacher-portal`| 11 | 9 | 2 | - `teacher/lesson-plans`: Local mock storage.<br>- `teacher/messages`: Static contact list. |
| `student-portal`| 11 | 8 | 3 | - `student/e-learning`: Mock course modules.<br>- `student/bus-tracker`: Static GPS coordinates.<br>- `student/id-card`: Static HTML layout. |
| `parent-portal` | 14 | 10 | 4 | - `parent/bus-tracking`: Static route mock.<br>- `parent/chat`: Mock message history.<br>- `parent/calendar`: Local events array.<br>- `parent/feedback`: Static submission form. |
| `payment-portal`| 3 | 3 | 0 | Fully integrated with real `/api/v1/payments/verify` & checkout. |
| `saas-frontend` | 1 | 1 | 0 | Contact & school inquiry form connected to `/api/v1/crm/lead`. |
| **TOTAL** | **90** | **68** | **22** | **22 pages targeted for full API migration.** |

---

## 4. Remediation Plan for Identified Gaps

1. **Bank Reconciliation (`/api/v1/finance/reconciliation`):**
   - Implement statement import parser (CSV / MT940 / OFX).
   - Match transaction amounts, dates, and reference numbers against `PaymentTransaction` and `LedgerEntry`.
   - Update `erp-admin/src/app/admin/reconciliation/page.tsx` to display real matched and unmatched ledger items.
2. **Library Overdue Fine Automation:**
   - Link `softDeleteWorker.ts` or a new cron worker to scan `BookIssue` records where `returnDate IS NULL` and `dueDate < NOW()`.
   - Automatically generate fee invoice with fee component `LIBRARY_FINE` in the student's account.
3. **Transport Real-Time Tracking:**
   - Replace static coordinates in `student-portal` and `parent-portal` with Server-Sent Events (SSE) from `/api/v1/transport/routes/:id/telemetry`.
4. **CRM & Admissions:**
   - Wire `erp-admin/src/app/admin/crm/page.tsx` to real `/api/v1/crm/leads` and `/api/v1/crm/interactions` endpoints.

