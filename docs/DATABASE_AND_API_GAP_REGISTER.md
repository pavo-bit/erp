# Database and API Gap Register: SSVM ERP

**Document Version:** 1.1.0  
**Audit Timestamp:** 2026-11-07T23:32:00+05:30  
**Scope:** Prisma Schema, API Routes, Frontend Portal Coverage, Reconciliation & Verification  
**Status:** Reconciled Post-Phase 10 Production Verification  

---

## 1. Database Schema Reconciliation (211 Prisma Models / 208 Physical Tables)

### 1.1. Table & Model Counts Reconciliation
- **Prisma Schema Models:** **211 models**
  - **130 Direct Tenant Models** (explicit `schoolId` foreign key to `School(id)`).
  - **50 Indirect Tenant Models** (join/child tables with inherited foreign key constraints).
  - **31 Global / Platform Models** (`School`, `SubscriptionPlanConfig`, `Permission`, `FeatureFlag`, etc.).
- **Physical PostgreSQL Tables:** **208 tables**
  - **205 tables** created by baseline migration `20261101130000_full_schema_baseline`.
  - **3 tables** created by cash collection migration `20261107160000_cash_collection_and_allocations` (`fee_receipts`, `payment_allocations`, `student_advance_credits`).
- **Row Level Security (RLS) Coverage:**
  - **180 tenant models** (130 direct + 50 indirect) have verified PostgreSQL RLS enabled and forced (`FORCE ROW LEVEL SECURITY`).
  - Verified via `node ssvm-backend/scripts/generate-tenant-classification.cjs --check`.
  - Zero cross-tenant leakage observed across test suites.

### 1.2. Direct Tenant Models (130 Models)
1. **Academic & Students:** `Student`, `StudentProfile`, `Class`, `Subject`, `Attendance`, `Exam`, `Grade`, `ReportCard`, `Homework`, `Assignment`, `StudentDocument`, `Enrollment`, `ClassSection`.
2. **Finance & Accounting:** `FeeStructure`, `FeeComponent`, `FeeItem`, `Invoice`, `InvoiceItem`, `PaymentTransaction`, `Receipt`, `FeeReceipt`, `PaymentAllocation`, `StudentAdvanceCredit`, `LedgerAccount`, `JournalEntry`, `FiscalYear`, `FinancialPeriod`, `FineRule`, `TaxRate`, `BankReconciliation`, `Scholarship`.
3. **HR & Staff:** `Staff`, `Teacher`, `Department`, `Designation`, `LeaveApplication`, `Payroll`, `Salary`, `SalaryComponent`, `BiometricLog`, `StaffDocument`.
4. **Operations & Assets:** `InventoryItem`, `StockTransaction`, `Vendor`, `PurchaseOrder`, `GoodsReceipt`, `GoodsReceiptLine`, `Asset`, `AssetCategory`, `Vehicle`, `TransportVehicle`, `TransportRoute`, `TransportStop`, `Book`, `BookIssue`, `VisitorPass`.
5. **System & Audit:** `AuditLog`, `SystemLog`, `Notification`, `Event`, `Notice`, `DisciplineIncident`, `SchoolBranch`, `SchoolSettings`.

### 1.3. Indirect Tenant Models (50 Models)
Child and join models connected to tenant parents via strict foreign keys:
`Section`, `TimetableSlot`, `ClassSubject`, `ExamSubject`, `StudentMark`, `AssignmentSubmission`, `AssignmentAttachment`, `PurchaseOrderItem`, `PurchaseRequestItem`, `BudgetLine`, `PostingRuleLine`, `WorkflowStep`, etc.

### 1.4. Global Platform Models (31 Models)
`School`, `SchoolGroup`, `SubscriptionPlanConfig`, `Permission`, `RolePermission`, `FeatureFlag`, `Currency`, `MasterCountry`, `MasterState`, `MasterCity`, `MasterSubject`, `MasterDepartment`, `AppConfiguration`, `SystemBackup`, `BackupValidation`, etc.

---

## 2. API Route & Backend Implementation Status

| API Route Group | Registered Endpoints | Implementation Status | Functional Audit & Verification |
|---|---|---|---|
| `/api/v1/auth` | 14 | **VERIFIED** | MFA/TOTP, JWT bearer rotation, sliding-window rate limiters, double-submit CSRF. |
| `/api/v1/students` | 18 | **VERIFIED** | Student enrollment, promotion workflow with prerequisites, academic history. |
| `/api/v1/teachers` | 12 | **VERIFIED** | Timetable slot scheduling with room/faculty collision guards. |
| `/api/v1/invoices` | 16 | **VERIFIED** | Multi-component fee invoicing, fine accrual engine, partial balance tracking. |
| `/api/v1/finance` | 28 | **VERIFIED** | Bank reconciliation service, double-entry General Ledger (`debits == credits`), closed period lock, balance sheet generator. |
| `/api/v1/finance/cashier`| 8 | **VERIFIED** | Manual cash desk, multi-invoice allocation, excess advance credits, sequential receipt generator (`REC-YYYY-XXXXXX`), official PDF receipts. |
| `/api/v1/payments` | 10 | **VERIFIED** | Razorpay checkout, tokenized payments, idempotent webhook processing with error classification. |
| `/api/v1/hr` | 18 | **VERIFIED** | Staff records, payroll bulk generation, salary disbursement posting to GL (`5010-SAL` -> `1010-BANK`), printable HTML payslips. |
| `/api/v1/procurement` | 16 | **VERIFIED** | PR approval, PO generation, partial/full Goods Receipt (GRN) posting to Accounts Payable (`5020-GEN` -> `2010-AP`), stock ledger updates. |
| `/api/v1/library` | 14 | **VERIFIED** | Catalog management, book issue/return, automated overdue fine invoice accrual with duplicate prevention. |
| `/api/v1/transport` | 12 | **VERIFIED** | Vehicle fleet, route and stop allocations, GPS telemetry ingestion and location querying. |
| `/api/v1/communications`| 8 | **VERIFIED** | Template CRUD with strict RBAC, outbox relay worker, manual sweep trigger (`/outbox/sweep`). |
| `/api/v1/saas` | 18 | **VERIFIED** | Tenant provisioning pipeline, quota middleware (`requireQuota`), platform analytics overview (`/saas/metrics`). |
| `/api/v1/shfi` | 12 | **VERIFIED** | Diagnostic event ingestion, deterministic classification, 11-stage incident state machine, escalation, school filtering. |
| `/api/v1/support` | 4 | **VERIFIED** | Customer-safe inquiry facade for Parents/Teachers with no internal stack or query leakage. |
| `/api/v1/health` | 6 | **VERIFIED** | Liveness, readiness, deep storage write/read/unlink probes, DB latency, Redis ping, queue telemetry. |

---

## 3. Frontend Portal API Coverage Reconciliation

Audit of all 90 page routes across all 7 Next.js applications:

| Portal | Total Pages | Real API Connected | Static / Informational Pages | Verification Status |
|---|---|---|---|---|
| `erp-admin` | 42 | 38 | 4 (Static docs / terms) | **PASS** — Live fee collection desk, transport fleet management, vehicle telemetry, SHFI school incident portal, staff payroll. |
| `super-admin` | 8 | 8 | 0 | **PASS** — Live platform metrics (`/saas/metrics`), school tenant onboarding, SHFI global operations centre, subscription plans. |
| `teacher-portal`| 11 | 11 | 0 | **PASS** — Mark entry, attendance submission, timetable viewing, salary history with printable payslips. |
| `student-portal`| 11 | 11 | 0 | **PASS** — Timetable schedule, assignment submission, report card viewing, fee payment status. |
| `parent-portal` | 14 | 13 | 1 (Static guide) | **PASS** — Transport tracking with vehicle coordinates, examination breakdown, fee statements, safe support inquiry facade. |
| `payment-portal`| 3 | 3 | 0 | **PASS** — Hosted checkout with Razorpay signature verification and receipt download. |
| `saas-frontend` | 1 | 1 | 0 | **PASS** — Public school registration inquiry connected to `/api/v1/saas/request`. |
| **TOTAL** | **90** | **85** | **5** | **100% Type-Safe Build Pass (`npx tsc --noEmit` across all 7 portals)** |
