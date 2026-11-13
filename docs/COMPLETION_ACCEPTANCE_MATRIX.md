# SSVM ERP — Completion Acceptance Matrix & Verification Protocol

**Document:** `docs/COMPLETION_ACCEPTANCE_MATRIX.md`  
**Working Repository:** `pavo-bit/erp`  
**Target Branch:** `lane/d-portals`  
**Baseline Commit:** `97f2c9c`  
**Date:** 12 November 2026  
**Status:** Canonical Release Governance Register

---

## 1. Programme Acceptance Governance & Principles

This matrix governs the acceptance of all 8 phases (Phase 0 through Phase 7) of the **SSVM ERP Admission Completion → Student Data Integrity → Operational Facility Allocation** programme.

### Non-Negotiable Boundaries
1. **Preserve Completed Admission Architecture:** Do not rebuild the existing paper forms, binary PDF generator, fee snapshot engine, or bulk XLSX/CSV ingestion.
2. **Preserve Canonical Student Directory & Profile:** Extend the existing `/admin/students` and `/admin/students/[id]` without parallel implementations.
3. **Strict Paper Admission Model:** No public online admission submissions or online checkout gateways.
4. **No Premature Allocation:** An admission facility request (`FacilityRequest`) must NEVER be interpreted or stored as an actual allocation (`TransportAllocation`, `HostelAllocation`).
5. **No Phone-Only Auto-Merging:** Guardian identity matching must use multi-signal validation and human staff review; unrelated families must never be merged solely because they share a phone number.
6. **Immutable Student Identity:** Permanent admission numbers (`admissionNo`) and canonical student records must never be overwritten or changed during re-admission or transfers.
7. **Fail-Closed Tenancy & RLS:** All tenant operations must run within `runWithTenantDatabaseTransaction` enforcing `SET LOCAL app.current_school_id`. No cross-school data leakage across reads or writes.
8. **Evidence-Based Acceptance:** A phase is marked ACCEPTED only when executed test suites pass on real PostgreSQL 16 on port 5433 with exact pass counts reported.

---

## 2. Programme Acceptance Gates Scorecard

| Phase | Title | Priority | Core Criterion | Verification Method | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **0** | **Baseline Audit & Freeze** | Critical | Verify working tree, baseline commit `97f2c9c`, canonical component mapping, database migrations, and 93 passing regression tests | Working tree audit, test runner execution, schema & RLS review | **ACCEPTED** |
| **1** | **School Shift Configuration** | Critical | Normalized `SchoolShiftClass` model, session-aware shifts, Super Admin UI at `/dashboard/schools/[schoolId]/shifts`, dynamic resolution in registration without hardcoded regex | Vitest API suite, Super Admin UI compilation, PostgreSQL RLS tests | **PENDING** |
| **2** | **Guardian Identity Matching** | High | Multi-signal guardian matcher (phone, name, email, locality), staff review workflow, safe sibling linking via `StudentGuardian` without phone-only auto-merge | Vitest unit/API tests, registration simulation | **PENDING** |
| **3** | **Unified Document Workflow** | High | Unify `Document` model, real binary file upload with MIME verification and SHA-256 checksums, `PENDING_UPLOAD → UPLOADED → VERIFIED / REJECTED` lifecycle, authenticated download, student profile UI | Multipart upload tests, file integrity verification, profile UI tests | **PENDING** |
| **4** | **Transport Student Allocation** | Critical | Transport pending requests tab, locality/PIN/shift filters, concurrency-safe vehicle capacity lock (`FOR UPDATE`), atomic allocation commit + `FacilityRequest = ALLOCATED` | Concurrency stress test, Vitest API suite, UI compilation | **PENDING** |
| **5** | **Hostel Student Allocation** | High | Hostel pending requests tab, gender and room capacity validation, atomic room assignment + `FacilityRequest = ALLOCATED`, checkout/transfer reconciliation | Real DB allocation test, gender policy validation | **PENDING** |
| **6** | **Shared Filter Infrastructure** | Medium | Server-side query builder helper (`buildStandardStudentFilter`), reusable frontend filter component, database indexes on locality, PIN, and shift | Filter benchmark tests, pagination & query audit | **PENDING** |
| **7** | **Security & Release Verification** | Critical | Full regression across all modules, multi-tenant RLS isolation, cross-school access denial, 8-portal `tsc --noEmit` zero errors, operational container verification | Comprehensive test suite, TypeScript compilation across 8 targets | **PENDING** |

---

## 3. Phase-by-Phase Detailed Acceptance Gates

### Phase 0: Baseline Audit and Feature Freeze (ACCEPTED)
- [x] Verified working tree is clean and up to date with `origin/lane/d-portals` at commit `97f2c9c`.
- [x] Confirmed migration `20261112130000_admission_operational_handoff` is applied on real PostgreSQL 16.
- [x] All 14 core and operational modules mapped to canonical source files.
- [x] Verified 93/93 tests passing on real PostgreSQL 16 on port 5433 with RLS.
- [x] Verified 0 errors across all 8 TypeScript targets (`tsc --noEmit`).
- [x] Created `docs/COMPLETION_BASELINE_AUDIT.md`, `docs/REMAINING_GAP_REGISTER.md`, and `docs/COMPLETION_ACCEPTANCE_MATRIX.md`.

---

### Phase 1: Correct School Shift Configuration (PENDING)
- [ ] **Data Model:** Normalized `SchoolShiftClass` junction table (`schoolId`, `shiftId`, `classId`, `sessionId`, `isActive`) with unique constraint preventing a class from having two active shifts in the same session.
- [ ] **Session Scoping & Versioning:** `SchoolShift` scoped to `AcademicSession` with version tracking.
- [ ] **Super Admin UI:** Dedicated shift management workspace at `super-admin/src/app/dashboard/schools/[schoolId]/shifts/page.tsx` allowing Super Admin to configure shifts, select actual classes, review conflict validations, and publish configurations.
- [ ] **Registration Decoupling:** Removal of hardcoded class regular expressions from `AdmissionRegistrationService`. Dynamic resolution using `(schoolId, sessionId, classId)`. Fail-closed validation if class is unassigned.
- [ ] **Multi-School Isolation:** Super Admin operations require explicit tenant context; school admins cannot modify other institutions' shifts.
- [ ] **Test Coverage:** Automated tests verifying multi-school shift configurations, session transitions, overlap rejections, and dynamic registration assignment.

---

### Phase 2: Guardian Identity and Family Matching (PENDING)
- [ ] **Preservation of Junction Model:** Continue using `Guardian` and `StudentGuardian` junction records.
- [ ] **Multi-Signal Matcher:** Normalized matching evaluating phone, sanitized name, email, and locality/address.
- [ ] **No Phone-Only Auto-Merge:** When phone numbers match but guardian names or addresses diverge, record is flagged as `AMBIGUOUS_GUARDIAN_CANDIDATE` requiring staff attestation.
- [ ] **Staff Review Workflow:** Staff can confirm shared sibling guardian, create new distinct guardian, or link as secondary contact.
- [ ] **Audit Trail:** Decision records capturing staff user ID, timestamp, and justification.
- [ ] **Test Coverage:** Tests verifying shared genuine siblings, same phone with different identities, and cross-school guardian isolation.

---

### Phase 3: Unified Admission Document Workflow (PENDING)
- [ ] **Model Resolution:** Standardize document lifecycle on canonical `Document` model with `fileName`, `fileType`, `fileSize`, and `checksum` (SHA-256).
- [ ] **Binary Upload Endpoint:** `POST /api/v1/students/:id/documents/:documentId/upload` accepting multipart file uploads (PDF, JPEG, PNG, max 10MB) with MIME magic byte validation.
- [ ] **Storage Security:** Saved to persistent volume storage with random UUID filenames preventing path traversal. Private authenticated download streaming.
- [ ] **Verification State Machine:** `PENDING_UPLOAD → UPLOADED → VERIFIED` or `REJECTED` (with mandatory rejection reason). Re-upload retains previous history.
- [ ] **Student Profile UI:** Interactive document upload, verification, rejection, and download actions inside the Student Profile Documents tab.
- [ ] **Test Coverage:** Tests for binary upload, invalid MIME rejection, SHA-256 calculation, verify/reject transitions, and cross-tenant access denial.

---

### Phase 4: Transport Allocation Integration (PENDING)
- [ ] **Pending Requests Tab:** Dedicated workspace in `erp-admin/src/app/admin/transport/page.tsx` listing students awaiting transport allocation with locality, PIN code, shift, and guardian contact.
- [ ] **Operational Filters:** Server-side filtering by locality, PIN code, class, section, shift, and request status.
- [ ] **Atomic Allocation Transaction:** Assign student to stop and route; acquire database `FOR UPDATE` row lock on vehicle allocations; verify capacity is not exceeded.
- [ ] **Synchronized Request Status:** Atomically update `FacilityRequest.status = "ALLOCATED"`, recording reviewer ID, timestamp, and notes.
- [ ] **Reconciliation on Removal:** Cancelling or deleting a transport allocation reconciles the facility request status.
- [ ] **Test Coverage:** Concurrency test proving vehicle seating capacity cannot be exceeded under simultaneous requests; atomic rollback on failure.

---

### Phase 5: Hostel Allocation Integration (PENDING)
- [ ] **Pending Requests Tab:** Dedicated workspace in `erp-admin/src/app/admin/hostel/page.tsx` displaying students requesting hostel rooms during admission.
- [ ] **Operational Filters:** Filtering by gender, locality, PIN code, class, and room type.
- [ ] **Validation & Concurrency:** Gender policy enforcement (`BOYS`, `GIRLS`), room maintenance status verification, and `FOR UPDATE` capacity locking.
- [ ] **Atomic Reconciliation:** Creating `HostelAllocation` atomically transitions `FacilityRequest.status` to `ALLOCATED`.
- [ ] **Checkout / Transfer Reconciliation:** Student room checkout updates allocation and reconciles request history.
- [ ] **Test Coverage:** Tests verifying room capacity limit enforcement, gender policy checks, and atomic facility request updates.

---

### Phase 6: Shared Search & Filter Infrastructure (PENDING)
- [ ] **Standardized Query Builder:** Shared backend utility `buildStandardStudentFilter` across all operational endpoints.
- [ ] **Consistent Filter Criteria:** Standard query params: `search`, `sessionId`, `classId`, `sectionId`, `shiftId`, `locality`, `pincode`, `status`, `isAllocated`, `page`, `limit`.
- [ ] **Database Performance:** Optimized PostgreSQL compound indexes on `(schoolId, locality)`, `(schoolId, pincode)`, and `(schoolId, shiftId)`.
- [ ] **Reusable Frontend Filter Bar:** Clean component in `erp-admin/src/components/shared/OperationalFilterBar.tsx` used across Admissions, Students, Transport, and Hostel.
- [ ] **Test Coverage:** Benchmark test demonstrating query response time remains < 50ms with combined multi-parameter filters on realistic datasets.

---

### Phase 7: Security, Integration & Release Verification (PENDING)
- [ ] **Full Regression Suite:** 100% pass across all admission, student, shift, document, transport, and hostel test suites.
- [ ] **PostgreSQL RLS Audit:** Verified against real PostgreSQL 16 database running unprivileged `ssvm_app` role (`rolsuper=false`, `rolbypassrls=false`).
- [ ] **Zero TypeScript Errors:** Strict `tsc --noEmit` pass with 0 errors across all 8 applications.
- [ ] **Container Restart Persistence:** Verified uploaded document files and database state persist across container restarts.
- [ ] **Final Acceptance Report:** Published comprehensive verification report with exact execution logs and pass counts.

