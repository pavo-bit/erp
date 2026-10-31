# SSVM ERP Testing Master Plan

Updated: 2026-10-31

## Safe execution rules

- Never run tests that truncate/reset a shared, development or production database.
- The backend fixture now requires explicit `DATABASE_URL_TEST` with a database name containing `test` before truncation.
- Use isolated deterministic test data and controlled external-service mocks.
- Do not claim live payment-provider verification from mocks.
- Do not mark tests PASS until a real command completes successfully.

## Required suites

| Suite | Scope | Current status |
|---|---|---|
| Static/backend | TypeScript, lint, build, Prisma validation | Clean npm ci, type check, build and Prisma validation pass; lint reports 567 existing violations. |
| Unit | Business rules, calculations, utilities, auth policy | Not run; npm dependencies installed; no isolated test DB available for configured global setup. |
| Security middleware | CSRF token/origin/exemption behavior | 3 token/origin tests passed in isolated config; login/webhook/bearer exemption cases remain untested. |
| DB integration | tenant ownership, documents, finance, governance, inventory, procurement | Not run; PostgreSQL service unavailable on localhost and Docker daemon inaccessible. |
| Frontend | lint, type check, production build for all seven apps | Not run. |
| E2E | Student, parent, teacher, admin, finance, procurement, super-admin | Not run. |
| Ops/recovery | clean install, migrations, backup/restore | Not run. |

## CI gates

The current CI is incomplete. It now includes all seven portal builds, uses `npm ci`, and supplies backend database URLs, but still needs backend/frontend lint/type-check, isolated integration DB lifecycle, migration checks, security tests, E2E and report artifacts. Backend lint is enabled locally but the current source has substantial violations.
