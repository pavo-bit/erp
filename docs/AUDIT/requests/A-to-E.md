# Lane A request to Lane E

**Status:** OPEN — Package dependencies, lockfile, and root tooling/workflow configuration are owned by Lane E.

## Context
During CI validation on PR #3 (`lane/a-db-spine` -> `remediation/80pct`), all database, migration, RLS, backend type-check, backend unit/API/architecture tests, and frontend build workflows pass. However, two pre-existing repository-wide checks fail due to baseline issues outside Lane A's ownership:

1. **`security-scan` (Job 125525149360):**
   - Pre-existing CVE vulnerabilities detected by Trivy in baseline `package-lock.json` (such as transitive dependencies in dev/test tooling).
   - Package manager files (`package.json`, `package-lock.json`) are outside Lane A scope and strictly owned by Lane E.
   - Please perform dependency audit/upgrades to satisfy the security scan threshold.

2. **`backend-lint` (Job 125525150132):**
   - CI runs `eslint src/ --max-warnings 0` which reports 648 baseline lint errors/warnings across unmigrated routes and controllers outside Lane A ownership.
   - Lane A has cleaned up all ESLint warnings in files modified under Lane A scope (`src/app.ts`, `src/index.ts`, `src/jobs/backup.ts`, `src/lib/prisma.ts`).
   - Please configure ESLint rules, migration ratcheting, or resolve remaining baseline errors in non-Lane-A files to allow `backend-lint` to pass cleanly.

## Evidence
- PR #3 CI Run: `https://github.com/pavo-bit/erp/actions/runs/1480112345` (Run `41517638747`)
- Passing Lane A jobs: `Migrate and RLS Tests (restricted role)` (125525150145), `backend-type-check` (125525150037), `frontend-build` (all 6 matrix jobs).
