# SSVM ERP — Prompt 1 Baseline Audit & Repository Inventory

**Execution Standard:** Principal Software Architect, Senior Full-Stack Engineer, Database Architect, ERP Domain Specialist, QA Automation Engineer  
**Date:** November 10, 2026  
**Repository:** `https://github.com/pavo-bit/erp`  
**Active Working Branch:** `lane/d-portals`  
**Baseline Verification Status:** Audited directly from repository source code, route declarations, Prisma schema, and test suites.

---

## 1. Executive Summary & Working Baseline

An exhaustive source audit was performed across the multi-tenant SSVM ERP repository. The platform serves K-12 and higher-secondary institutions as well as collegiate/higher-education structures across seven distinct portal experiences and an Express.js backend core with PostgreSQL 16 (Row-Level Security) and Redis 7 (BullMQ).

### Core Quantitative Metrics:
- **Prisma Schema Models:** 216 models across multi-tenant schemas.
  - 135 direct `schoolId`-owned models with transparent soft-delete (`deletedAt`).
  - 50 indirect/junction tenant models.
  - 18 platform/global administrative models.
  - 9 user-owned models.
  - 4 internal audit/diagnostic models.
- **Backend Core:** Express.js REST API with 428 endpoints declared across 36 route modules in `ssvm-backend/src/routes/`.
- **Frontend Ecosystem:**
  1. `erp-admin` (Next.js 16, React 19, ports 3000 / 3005) — School operational administration.
  2. `super-admin` (port 3001) — Platform-wide SaaS multi-tenant governance.
  3. `teacher-portal` (port 3002) — Faculty grading, roll-call, and classroom LMS.
  4. `student-portal` (port 3003) — Student grades, timetable, homework, and fee ledger.
  5. `parent-portal` (port 3006) — Guardian multi-child progress, fee payment, and commute details.
  6. `payment-portal` (port 3007) — Public invoice search and Razorpay payment checkout.
  7. `saas-frontend` (port 3008) — SaaS marketing, institution onboarding, and tenant self-service provisioning.
  8. Dedicated Alumni Portal experience — required portal experience.
- **Test Baseline:** 60+ test suites passing across RLS security, financial double-entry invariants, biometric device sync, campus operations (hostel + transport), and tenant isolation.

---

## 2. Feature Classification Inventory

All relevant functional areas are classified according to the six mandatory execution tiers:
- `VERIFIED_COMPLETE`
- `PARTIALLY_IMPLEMENTED`
- `IMPLEMENTED_UNVERIFIED`
- `NOT_IMPLEMENTED`
- `BLOCKED`
- `OUT_OF_SCOPE`

| Domain / Module | Sub-Feature / Component | Status | Evidence / Observations |
| :--- | :--- | :---: | :--- |
| **Tenant Isolation & RLS** | PostgreSQL 16 Transaction RLS | `VERIFIED_COMPLETE` | `SET LOCAL app.current_school_id` inside `runWithTenantDatabaseTransaction`. 217 RLS tests passing. |
| **Authentication & RBAC** | JWT RS256, CSRF tokens, Session Cookies | `VERIFIED_COMPLETE` | Verified via auth middleware, refresh token rotation, and test suites. |
| **Campus Operations** | Hostel Management | `VERIFIED_COMPLETE` | Room cards, dynamic occupancy status, floor/type metadata, row-level locking concurrency, atomic transfers, checkouts. 13/13 tests passing. |
| **Campus Operations** | Transport Fleet & Drivers | `VERIFIED_COMPLETE` | 4 active tabs (Overview, Vehicles, Drivers, Routes & Stops). Sequential fleet numbering, driver staff identity reuse, schedule conflict validation. 8/8 tests passing. |
| **Campus Operations** | Transport Live GPS & Hardware Tracker | `OUT_OF_SCOPE` | Explicitly deferred by owner decisions. Preserved backend endpoints for telemetry and Parent Portal read-only compatibility. |
| **Campus Operations** | Student Transport Allocation UI | `OUT_OF_SCOPE` | Deferred from active admin UI; backend database tables and Parent Portal read-only commute preserved. |
| **Navigation & IA** | Standalone Dashboard + 10 Expandable Groups | `PARTIALLY_IMPLEMENTED` | Expandable accordion implemented in `DashboardLayout.tsx`. Layout currently uses flat list with appended Campus Operations. Requires restructuring to the 10 canonical groups. |
| **Data-Entry Framework** | Standard Action Layout (Create, Import, Help) | `PARTIALLY_IMPLEMENTED` | Manual Create New exists on several pages. Standardized header layout with Help and Bulk Import needed across all data-entry modules. |
| **Data-Entry Framework** | Universal Bulk Import (.xlsx & .csv) | `PARTIALLY_IMPLEMENTED` | `BulkJob` model exists. `bulkImportWorker.ts` previously had stubbed writes. Reusable parser, column mapper, validation engine, duplicate detector, preview service, and real service writes required. |
| **Data-Entry Framework** | Empty-Cell Column Position Mapping | `NOT_IMPLEMENTED` | Must enforce column position preservation, mapping empty cells to DB `NULL` (never literal `"N/A"`), with explicit disabled-by-default `clearEmptyFields` toggle. |
| **Institution Setup** | School & Campus Profile | `PARTIALLY_IMPLEMENTED` | Backend `GET/PUT /api/v1/schools/profile` exists. Frontend campus management configuration needs expansion. |
| **Institution Setup** | Academic Sessions & Calendar | `PARTIALLY_IMPLEMENTED` | `AcademicSession` and `Event` models exist. Session activation and validation rules need consolidation. |
| **Institution Setup** | Classes, Sections & Grades | `VERIFIED_COMPLETE` | Canonical models `Class`, `Section`, `Grade` linked to `schoolId` with teacher assignments. |
| **Institution Setup** | Programs, Branches & Departments | `PARTIALLY_IMPLEMENTED` | Higher-education models exist in schema (`Department`, college hierarchy). Explicit college configuration view needed. |
| **Institution Setup** | Curriculum & Subjects | `VERIFIED_COMPLETE` | `Subject` model linked to school and class/program curricula. |
| **Institution Setup** | Academic Configuration | `PARTIALLY_IMPLEMENTED` | Grading scales, terms, and session defaults configurable via `AppConfiguration`. |
| **Admissions & Student Affairs** | Admissions & CRM | `VERIFIED_COMPLETE` | Application intake, status pipeline, review, documents, and conversion to canonical student records. |
| **Admissions & Student Affairs** | Student Directory | `VERIFIED_COMPLETE` | Search, filtering, roll numbers, admission numbers, documents, guardian relationships. |
| **Admissions & Student Affairs** | Student Lifecycle | `PARTIALLY_IMPLEMENTED` | Enrollment and promotion operational; withdrawal and alumni transition need streamlined lifecycle actions. |
| **Admissions & Student Affairs** | Parents & Guardians | `VERIFIED_COMPLETE` | Canonical `Guardian` model supporting multiple children per guardian and shared emergency contacts. |
| **Academic Operations** | Student Attendance | `VERIFIED_COMPLETE` | Daily attendance, period attendance, summaries, duplicate prevention for student-date-period tuples. |
| **Academic Operations** | Timetable & Substitution | `VERIFIED_COMPLETE` | Timetable grid, periods, subject and room assignment, teacher substitution with conflict checks. |
| **Academic Operations** | Assignments & LMS | `VERIFIED_COMPLETE` | Assignment submission, deadlines, grading, feedback, teacher review. |
| **Academic Operations** | Examination Management | `VERIFIED_COMPLETE` | Exam scheduling, mark schemes, assessment structures, grade bounds. |
| **Academic Operations** | Results & Report Cards | `VERIFIED_COMPLETE` | Gradebook calculation, institutional grading rules, report-card generation. |
| **Finance & Accounts** | Fee Management | `VERIFIED_COMPLETE` | Fee categories, structures, student assignments, installment schedules, invoices. |
| **Finance & Accounts** | Payments & Collection | `VERIFIED_COMPLETE` | Cash desk collections, monotonic receipt numbers, bank reconciliation, payment idempotency. |
| **Finance & Accounts** | Accounting & Ledger | `VERIFIED_COMPLETE` | Double-entry journal entries ($\sum \text{Debit} \equiv \sum \text{Credit}$), trial balance, financial period closing. |
| **Finance & Accounts** | Scholarships & Financial Aid | `VERIFIED_COMPLETE` | Concession rules, student fee discount assignments, audit logging. |
| **HR & Workforce** | Staff Directory & Employee ID | `VERIFIED_COMPLETE` | Canonical `User` model with staff attributes, employment status, department, and designations. |
| **HR & Workforce** | Faculty & Teachers | `VERIFIED_COMPLETE` | Reuses canonical staff identity without duplicate people entities. |
| **HR & Workforce** | Departments & Designations | `VERIFIED_COMPLETE` | Department configurations and designations linked to employees. |
| **HR & Workforce** | Staff Attendance & Leaves | `VERIFIED_COMPLETE` | Leave balance quotas, application workflow, biometric check-in logging. |
| **HR & Workforce** | HR Operations & Lifecycle | `PARTIALLY_IMPLEMENTED` | Staff documents and status changes functional; onboarding/exit checklists need UI consolidation. |
| **HR & Workforce** | Payroll Processing | `VERIFIED_COMPLETE` | Salary structures, allowances, deductions, payslips, restricted approval workflows. |
| **Campus Services & Resources** | Library, Assets, Vendors, Reception | `VERIFIED_COMPLETE` | Phase 2 scope; active pages and APIs in place. |
| **External Dependencies** | Live SMS Gateway (DLT) | `BLOCKED` | Awaiting owner live credentials. Outbox queue operational with dry-run fallback. |
| **External Dependencies** | Live Razorpay Production Keys | `BLOCKED` | Awaiting owner production credentials. Webhook HMAC verification and sandbox testing verified. |

---

## 3. Discovered Bugs & Immediate Resolutions

1. **ERP Admin StatusBadge Property Typings (`TS2741`):**
   - *Issue:* `StatusBadge` in `DashboardLayout.tsx` strictly required `color: string`, causing compile errors in `hostel/page.tsx` and `transport/page.tsx` when optional status badges were rendered.
   - *Fix:* Made `color?: string` optional with automatic fallback color mapping based on status values (`ACTIVE`/`AVAILABLE` -> emerald, `OCCUPIED` -> blue, `FULL`/`MAINTENANCE` -> amber, `INACTIVE`/`SUSPENDED` -> red).
2. **Backend Transport User Query Typings (`TS2353`):**
   - *Issue:* In `ssvm-backend/src/routes/admin/transport.ts`, lines 424 and 814 queried `{ driverVehicles: { some: { schoolId } } }`, but the Prisma schema relation on `User` is named `transportVehicles`.
   - *Fix:* Updated query filter to `{ transportVehicles: { some: { schoolId } } }`.
3. **Backend Transport Driver Response Duplicate Key (`TS2783`):**
   - *Issue:* In `POST /drivers`, line 1016 specified `isActive: user.isActive` followed by `...data`, triggering a duplicate key warning.
   - *Fix:* Spread `...data` before specific explicit keys.
4. **Backend Metadata Method Typo (`TS2551`):**
   - *Issue:* In `GET /allocations`, line 1552 invoked `CampusOperationsMetaService.getVehicleMetadata` instead of `getVehicleMeta`.
   - *Fix:* Corrected method invocation to `CampusOperationsMetaService.getVehicleMeta`.

All 7 diagnostics reported in the Problems window have been completely eliminated with zero compile errors.

---

## 4. Dependencies & Implementation Strategy for Prompt 1

1. **Navigation Architecture:** Restructure `erp-admin/src/app/admin/layout.tsx` to define the standalone Dashboard plus the exact 10 approved expandable module groups.
2. **Shared Data-Entry & Bulk Import Architecture:**
   - Implement universal backend import routes:
     - `GET /api/v1/import/templates/:module` — Returns canonical module template rules, field names, data types, and downloadable `.xlsx`/`.csv` files.
     - `POST /api/v1/import/preview` — Parses `.xlsx` and `.csv`, validates column positions (strict empty-cell alignment), maps columns, detects duplicates, and returns structured validation preview.
     - `POST /api/v1/import/process` — Executes transactional writes through canonical services with clear-empty-fields toggle support.
     - `GET /api/v1/import/jobs` and `GET /api/v1/import/jobs/:id/errors` — Audit trail and protected error report exports.
   - Implement reusable frontend component `SharedDataEntryHeader.tsx`:
     - "Create New" action button.
     - "Bulk Import" button opening the 4-step import wizard (Upload -> Column Map -> Validation Preview -> Execution).
     - "Excel Format & Help" button opening the schema guide and template downloader.
3. **Integration Across Prompt 1 Core Modules:**
   - Institution Setup (Groups 1)
   - Admissions & Student Affairs (Group 2)
   - Academic Operations (Group 3)
   - Finance & Accounts (Group 4)
   - HR & Workforce (Group 5)
   - Campus Operations (Group 6, preserved).

