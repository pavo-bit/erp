# Wave 0 Follow-Up Summary & Final Status

## Head Commit: `ea6bfac` (PR #2)
**Date:** 2026-11-02  
**Worktree:** `remediation/wave-0`  

All 8 requested Wave 0 follow-up items have been completed. Scope remains strictly confined to Wave 0 (no Wave 1 tasks started).

---

### Item 1: `DATABASE_URL_AUTH` Required & Narrow `ssvm_auth` Role
- **Configuration & Validation:** Required in `env.ts`, `validate-env.ts`, `.env.example` (root & ssvm-backend), `docker-compose.yml`, `docker-compose.api.yml`, `ssvm-backend/docker-compose.yml`, and `ssvm-backend/k8s/deployment.yaml`.
- **Fallbacks Removed:** `src/lib/authPrisma.ts` removes fallbacks to `DATABASE_URL_TEST_FIXTURE`, `DATABASE_URL_TEST`, or `DATABASE_URL`. Throws directly if `DATABASE_URL_AUTH` is missing.
- **Dedicated Narrow Role `ssvm_auth`:** Configured with `rolsuper = false` and `rolbypassrls = false`. Given only the specific schema usage, sequence, and table grants/policies login needs (`users`, `schools`, `user_sessions`, `refresh_tokens`, `students`, `guardians`, `alumni`, `teachers`, `academic_sessions`, `classes`, `sections`, `audit_logs`, `system_logs`, `auth_events`).
- **Tests Added (`src/tests/api/auth.test.ts`):**
  - Confirms connection runs as role `ssvm_auth` with `rolsuper=false` and `rolbypassrls=false`, and successfully logs in.
  - Confirms that missing `DATABASE_URL_AUTH` throws loudly and aborts login attempts with 500.

### Item 2: Caller Inventory for Lane A (`docs/AUDIT/requests/W0-to-A.md`)
- Complete audit of all 9 callers of `getAuthPrisma()` recorded with file, lines, tables accessed, and tenant table access flags.
- None of the callers were modified, preserving scope boundaries for Lane A.

### Item 3: Student Login Ambiguity & DOB Fallback
- **Ambiguity Guard:** In `src/routes/auth.ts`, if multiple student records match the given admission number across schools and `schoolCode` is omitted, the endpoint rejects the attempt with HTTP 401: `"Multiple students found with this admission number across schools. Please specify schoolCode."`
- **DOB Fallback Removed:** Removed `req.body.dob` as a password fallback; passwords are strictly required.
- **Tests Added (`src/tests/api/student-two-schools.test.ts`):** Verified cross-school ambiguity rejection and rejection of DOB fallback.

### Item 4: CSRF Documentation Corrected (`docs/security/CSRF.md`)
- Corrected documentation to reflect `SameSite=Lax` cookies.
- Documented strict `Origin` header validation against `new URL(env.FRONTEND_URL).origin` performed in `csrfProtection` for all cookie-carrying requests.

### Item 5: Deleted `ssvm-backend/tests/`
- Deleted directory `ssvm-backend/tests/` (11 files) after confirming 1:1 mapping with `ssvm-backend/src/tests/`.
- Full mapping listed in commit `ea6bfac` message.

### Item 6: CI Step for Parallel & Shuffled Tests
- Added step `Run Shuffled Parallel Tests` to `.github/workflows/ci.yml` running `npx vitest run --sequence.shuffle --sequence.seed=$SHUFFLE_SEED` with a printed random seed.

### Item 7: Catalog Query Rerun (`ssvm_test` and `ssvm_test_template`)
Both databases verified identically via PostgreSQL catalog query:
- Public tables: 206
- Total policies: 184
- RLS enabled & forced (`relrowsecurity = true AND relforcerowsecurity = true`): 174
- Non-postgres owned tables: 0

### Item 8: CI Job Results Summary (Run ID `41442764866`)

| CI Job | Result | Duration | Details |
|---|---|---|---|
| **Migrate and RLS Tests (restricted role)** | **SUCCESS (✓)** | 1m44s | Restricted role `ssvm_app` verified; 182/182 RLS & ledger tests passed |
| **backend-type-check** | **SUCCESS (✓)** | 1m29s | `tsc --noEmit` clean with 0 errors |
| **frontend-build (super-admin)** | **SUCCESS (✓)** | 1m19s | Next.js production build succeeded |
| **frontend-build (teacher-portal)** | **SUCCESS (✓)** | 1m13s | Next.js production build succeeded |
| **frontend-build (erp-admin)** | **SUCCESS (✓)** | 1m18s | Next.js production build succeeded |
| **frontend-build (student-portal)** | **SUCCESS (✓)** | 1m1s | Next.js production build succeeded |
| **frontend-build (payment-portal)** | **SUCCESS (✓)** | 1m2s | Next.js production build succeeded |
| **frontend-build (saas-frontend)** | **SUCCESS (✓)** | 1m11s | Next.js production build succeeded |
| **frontend-build (parent-portal)** | **SUCCESS (✓)** | 1m17s | Next.js production build succeeded |
| **backend-test** | **FAILURE (X)** | 2m40s | 165/167 tests passed (23/25 test files passed). 2 tests failed: `payments.test.ts` & `tenant-isolation.spec.ts` because `getAuthPrisma()` was restricted to `ssvm_auth` with only login grants; callers unedited per requirement 2 and inventoried for Lane A |
| **backend-lint** | **FAILURE (X)** | 1m30s | Pre-existing lint errors in `app.ts` and `backup.ts` (outside Wave 0 scope) |
| **security-scan** | **FAILURE (X)** | 55s | Pre-existing npm audit vulnerabilities in transitive packages (outside Wave 0 scope) |
