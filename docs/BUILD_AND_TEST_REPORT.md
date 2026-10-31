# Build and Test Report

Updated: 2026-11-01

| Check | Result | Evidence |
|---|---|---|
| Backend dependency installation | PASS | `npm ci --no-audit --no-fund` installed 1,167 packages and invoked Prisma Client generation through the added root `postinstall`. |
| Backend unit/integration tests | NOT RUN | No PostgreSQL listener was available; Docker daemon access was denied. The default test fixture truncates tables and was not pointed at an unknown database. |
| Backend type check | PASS | `npm run type-check`. |
| Backend lint | FAIL | Full ESLint reports 567 problems (566 errors, 1 warning); focused lint over changed security/payment files passes. |
| Backend build | PASS | `npm run build`. |
| Prisma validation/migrations | Schema validation PASS; migrations NOT RUN | `npx prisma validate` passed; database unavailable for migration checks. |
| Frontend clean installs | PASS | `npm ci` completed for all seven portals after lockfile repairs. |
| Frontend builds | PASS | `npm run build` completed for all seven portals. |
| Frontend type checks | PASS | `npx tsc --noEmit` passed for all seven portals. |
| Frontend lint | FAIL / PARTIAL | Three apps lack ESLint 9 flat configs; configured apps report existing lint errors. |
| CI workflow | NOT RUN | Changes are local; no hosted CI execution was initiated. |
| Playwright E2E | NOT RUN | No controlled full-stack test environment available. |
| Whitespace/diff validation | PASS | `git diff --check` completed without errors. |
| Known production fallback scan | PASS | Checked backend source and Prisma seed files for the confirmed CSRF/payment/admin fallback strings; none remain. |

| Isolated security suite | PASS | 6 tests passed: 3 CSRF middleware cases and 3 retention behavior cases. |

The backend test setup now refuses to truncate tables unless an explicitly set `DATABASE_URL_TEST` has a test-marked database name. Do not weaken this guard to make local tests convenient.
