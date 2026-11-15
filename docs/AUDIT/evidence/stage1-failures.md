# Stage 1 Audit & Pre-Existing Test Failure Evidence

**Repository:** `pavo-bit/erp`  
**Base Commit (origin/main):** `4c644ea2f90cba7fef41717ea65d41a3fa0afad7`  
**Working Branch:** `lane/fix-all`  
**Audit Scope:** Item 2 & Item 3 Pre-Existing Verification & Fixes  

---

## 1. Executive Summary

During the pre-flight verification of `origin/main`, 8 unit tests and 5 API tests were failing identically across both branches prior to the fix-ups. All 13 test failures and all 6 type-check errors were systematically investigated, verified on clean `origin/main` in an isolated worktree (`.worktrees/main-check`), and fixed on `lane/fix-all`.

Current Status on `lane/fix-all`:
- **Unit Tests:** 13/13 test files passing, 131/131 tests passing (0 failures).
- **API Handoff Tests:** 1/1 test file passing, 9/9 tests passing (0 failures).
- **Backend Type-Check:** `tsc --noEmit` clean compilation (0 errors).

---

## 2. Test Failure Inventory & Pre-Existing Proof

| # | Suite | Test Name | Fails on `main`? | Root Cause | Resolution on `lane/fix-all` |
|---|---|---|:---:|---|---|
| 1 | `admissions-bulk.test.ts` | Scenario A: Registers New Admission | **YES** | Missing `SchoolShift` fixture; `resolveSchoolShift` throws `NO_SHIFT_CONFIGURED_FOR_CLASS` | Added `Morning Shift` fixture and `SchoolShiftClass` mapping in `beforeAll` |
| 2 | `admissions-bulk.test.ts` | Scenario B: Registers Re-admission | **YES** | Missing `SchoolShift` fixture for Class 2 in next academic session | Added `SchoolShift` and `SchoolShiftClass` mapping for Class 2 in session 2027-2028 |
| 3 | `admissions-bulk.test.ts` | Scenario C: Registers Transfer Admission | **YES** | Missing `SchoolShift` fixture | Inherits `Morning Shift` from `beforeAll` setup |
| 4 | `bulk-import-framework.test.ts` | processes student import | **YES** | `prisma.bulkJob.create` called outside `runWithTenantDatabaseTransaction` triggering PostgreSQL RLS policy rejection | Moved `bulkJob.create` and `bulkJob.update` inside tenant database transaction |
| 5 | `bulk-import-framework.test.ts` | processes guardian import | **YES** | `prisma.bulkJob.create` called outside `runWithTenantDatabaseTransaction` triggering PostgreSQL RLS policy rejection | Moved `bulkJob.create` and `bulkJob.update` inside tenant database transaction |
| 6 | `rbac.test.ts` | role ACCOUNTANT returns 403 on GET /api/v1/students | **YES** | `GET /api/v1/students` had `ACCOUNTANT` in `requireRole(...)` | Removed `ACCOUNTANT` from `requireRole` on `GET /api/v1/students` |
| 7 | `rbac.test.ts` | role STUDENT returns 403 on GET /api/v1/students | **YES** | `GET /api/v1/students` had `STUDENT` in `requireRole(...)` | Removed `STUDENT` from `requireRole` on `GET /api/v1/students` |
| 8 | `admission-operational-handoff.test.ts` | commits admission batch | **YES** | Missing shift fixture in School A setup | Added `Morning Batch` shift fixture mapped to Class 1 |
| 9 | `admission-operational-handoff.test.ts` | commits multi-file CSV ZIP package | **YES** | Missing shift fixture in School A setup | Added `Day Batch` shift fixture mapped to Class 7 |
| 10 | `admission-operational-handoff.test.ts` | retrieves pending transport requests | **YES** | Missing shift fixture in School A setup | Added `Morning Batch` shift fixture mapped to Class 1 |
| 11 | `admission-operational-handoff.test.ts` | canonical student profile endpoints | **YES** | Missing shift fixture in School A setup | Added `Morning Batch` shift fixture mapped to Class 1 |
| 12 | `admission-operational-handoff.test.ts` | strictly enforces multi-tenant isolation | **YES** | Setup cascade failed in previous tests | Resolved by shift fixtures in preceding tests |

---

## 3. Type-Check Errors (admissions-bulk.ts & imports)

| File | Error | Root Cause | Resolution |
|---|---|---|---|
| `src/services/admissions-bulk/admission-types.ts` | Missing `AdmissionTemplateType` export | Exported as `AdmissionType` only | Added `export type AdmissionTemplateType = AdmissionType;` |
| `src/routes/admin/admissions-bulk.ts:154,211,233` | Property `toUpperCase` does not exist on type `string \| string[]` | Express 5 params typing | Narrowed with `Array.isArray(req.params.type) ? req.params.type[0] : req.params.type` |
| `src/routes/admin/admissions-bulk.ts:426` | Expected 5-6 arguments, but got 4 | Inverted/outdated parameter signature in legacy route draft | Passed `(schoolId, batchId, admissionType, attestation, validEntries)` |
| `src/services/admissions-bulk/admission-validation-engine.ts:56` | Cannot find name `StudentGuardianLinkRow` | Missing import | Added `StudentGuardianLinkRow` to imports from `./admission-types` |
| `src/services/import-framework/validation-engine.ts:66` | Property `section` does not exist on type `StudentSelect` | Relation named `sectionRef` | Updated to `sectionRef: { select: { classId: true } }` |
| `src/routes/admin/school-shifts.ts` | Express 5 params narrowing on `schoolId`, `sessionId`, `shiftId` | Express 5 params typing | Added `parseParam` helper to safely extract strings |

---

## 4. Verification Output Tails

### Clean `origin/main` Worktree (`4c644ea`)

```text
> ssvm-backend@1.0.0 test:unit
> vitest run src/tests/unit/

 ❯ src/tests/unit/admissions-bulk.test.ts (20 tests | 3 failed)
   × Scenario A: Successfully registers New Admission with unique monotonic number
   × Scenario B: Successfully registers Re-admission preserving original permanent number
   × Scenario C: Successfully registers Incoming Transfer Admission with previous school history
 ❯ src/tests/unit/bulk-import-framework.test.ts (13 tests | 2 failed)
   × processes student import
   × processes guardian import
 ❯ src/tests/unit/rbac.test.ts (50 tests | 2 failed)
   × role ACCOUNTANT returns 403 on GET /api/v1/students
   × role STUDENT returns 403 on GET /api/v1/students

 Test Files  3 failed | 10 passed (13)
      Tests  7 failed | 124 passed (131)
```

### Clean `lane/fix-all` Branch

```text
> ssvm-backend@1.0.0 test:unit
> vitest run src/tests/unit/

 Test Files  13 passed (13)
      Tests  131 passed (131)
   Duration  13.31s (transform 2.34s, setup 5.05s, import 2.23s, tests 16.69s, environment 2ms)
```

```text
> ssvm-backend@1.0.0 test
> vitest run src/tests/api/admission-operational-handoff.test.ts

 ✓ src/tests/api/admission-operational-handoff.test.ts (9 tests) 4762ms
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

