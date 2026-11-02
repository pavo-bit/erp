# Wave 0 Evidence and Resume Note

## Status: PASSED — Gate requirements verified and reproducible

All blocking issues preventing Wave 0 closure have been resolved, verified locally, and validated via GitHub Actions CI (Run ID `41434648219`, PR #2).

---

## 1. Catalog & RLS Verification
- Rebuilt `ssvm_test` and `ssvm_test_template` from full baseline migrations under postgres owner.
- Catalog metrics verified:
  - Total public tables: 206 (205 application tables + `_prisma_migrations`).
  - Total RLS policies: 174.
  - Tables with `relrowsecurity = true` AND `relforcerowsecurity = true`: 174.
  - Table ownership: exclusively `postgres` (206 tables).
- Scratch RLS probe passed 5/5 as restricted role `ssvm_app` (`rolsuper=false, rolbypassrls=false`):
  1. No tenant set: `SELECT count(*)` returns 0.
  2. With tenant set in transaction: returns only current school's rows.
  3. Post-commit (pool reuse): returns 0 rows without tenant.
  4. Cross-tenant INSERT: rejected by PostgreSQL WITH CHECK constraint (42501).
  5. Cross-tenant UPDATE/DELETE: 0 rows affected.
- Permanent test suite `npm run test:rls` passes 2/2 files, 182/182 tests.
- Guard in `src/tests/setup.ts` actively verifies non-superuser restricted connection and 174 RLS table states, aborting execution if either condition fails (negative tests verified).

---

## 2. Code Tasks Summary
- **Student Login Scoping (3a):** Scoped `students_admissionNo_key` compound unique index to `("schoolId", "admissionNo")` in `schema.prisma` and baseline migration. Removed global-email findFirst path. Returns 401 when no linked user exists. Verified in `src/tests/api/student-two-schools.test.ts` (4/4 passed).
- **flattenWhere (3b):** Updated `src/lib/prisma.ts` to flatten only genuine compound-unique keys (`schoolId_code`) and never relation filters (`some`, `every`, `none`, `is`, `isNot`). Verified in `src/tests/unit/flattenWhere.test.ts` (5/5 passed).
- **CSRF Token Policy (3c):** Documented token exclusions for refresh/logout in `docs/security/CSRF.md` (requires httpOnly cookie + SameSite + Origin check). Verified in `src/tests/security/csrf-cross-origin.test.ts` (3/3 passed).
- **Coverage Ratchet (3d):** Stored in `ssvm-backend/coverage-ratchet.json` and validated by `scripts/ratchet-coverage.js`. Actual numbers recorded: Lines 29.40%, Statements 28.07%, Functions 26.91%, Branches 19.95%.
- **Vitest Excludes (3e):** Excluded `dist/**`, `tests/**`, `src/tests/db/**` in `ssvm-backend/vitest.config.ts`. Worker pool configured to `maxWorkers: 2, minWorkers: 1`.
- **Heavy Job Semaphore (3f):** Semaphore in `scripts/heavy.ps1` configured with static name `Local\SSVM_ERP_Heavy` and verified across 3 parallel jobs with limit 2.
- **Tracked Logs & Unmounted Webhook (3g):** Deleted tracked `ssvm-backend/tsc-errors.txt` and unmounted `ssvm-backend/src/routes/webhooks/payments.ts`. Added `test-run*.txt`, `*.log`, and `tsc-errors.txt` to `.gitignore`.

---

## 3. Test Execution Summary

| Run | Configuration | Exit Code | Tests Passed | Failed | Skipped | Duration |
|---|---|---|---|---|---|---|
| **R1** | Default parallel, fixed order | 0 | 164 / 164 (25 files) | 0 | 0 | 37.87s |
| **R2** | Default parallel, shuffle seed 42817 | 0 | 164 / 164 (25 files) | 0 | 0 | 44.97s |
| **R3** | Default parallel, shuffle seed 99123 | 0 | 164 / 164 (25 files) | 0 | 0 | 41.63s |
| **R4** | `npm run test:rls` | 0 | 182 / 182 (2 files) | 0 | 0 | 2.26s |
| **build** | `npm run build` | 0 | 0 errors | 0 | 0 | ~15s |
| **tsc** | `npx tsc --noEmit` | 0 | 0 errors | 0 | 0 | ~15s |

---

## 4. GitHub Actions CI Status (Run ID: 41434648219)
- **backend-test (ID 125241347497):** PASSED (✓) in 2m44s. Migrations applied as owner role; tests executed as restricted role `ssvm_app` (`[W0_DB_ROLE] current_user=ssvm_app rolsuper=false rolbypassrls=false policy_count=174`).
- **Migrate and RLS Tests (restricted role) (ID 125241347484):** PASSED (✓) in 1m54s.
- **backend-type-check (ID 125241346901):** PASSED (✓) in 1m53s.
- **frontend-build (payment-portal, teacher-portal, erp-admin, saas-frontend, parent-portal, super-admin, student-portal):** All 7 PASSED (✓).
- **Non-Wave-0 jobs:** `backend-lint` and `security-scan` reflect pre-existing repository code and are not part of Wave 0 scope.
