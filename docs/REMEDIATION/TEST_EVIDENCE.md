# Test Evidence

Updated: 2026-11-01

| Category | Command/check | Result | Limits |
|---|---|---|---|
| Repository baseline | `git fetch origin main`; compare `HEAD` and `FETCH_HEAD` | PASS; both `8ae14656ceb80325022cd4bb27e79f898326b623` | Fetch only, no checkout. |
| Inventory | `node ssvm-backend/scripts/build-route-authorization-inventory.cjs` | PASS; 365 declarations | Mechanical inventory only; all rows remain review-required. |
| Inventory | `node ssvm-backend/scripts/build-model-inventory.cjs` | PASS; 205 models, 124 direct school fields | Does not classify indirect ownership or enforcement. |
| Backend type check | `npm run type-check` in `ssvm-backend` | PASS | Does not verify runtime database behavior. |
| Backend build | `npm run build` in `ssvm-backend` | PASS | Does not prove production readiness. |
| Prisma schema | `npx prisma validate` | PASS | No migration was run against PostgreSQL. |
| Focused lint | `npx eslint src/routes/finance-governance.ts src/routes/crm.ts src/routes/inventory.ts src/routes/procurement.ts src/tests/security/finance-governance*.test.ts` | PASS | Full repository lint still fails. |
| Focused security suite | `npx vitest run --config vitest.security.config.ts --pool=threads` | PASS; 5 files, 16 tests | Uses isolated middleware/service mocks; not a DB integration suite. Executed with loopback access. |
| Full backend lint | `npm run lint` | FAIL; 548 errors, 1 warning | Repository-wide pre-existing and outstanding quality debt. |
| PostgreSQL integration | Not run | BLOCKED | No controlled PostgreSQL test database available in this execution. |
| Docker/CI/E2E | Not run | NOT VERIFIED | Docker engine/hosted CI/controlled full-stack environment not available. |

Historical portal evidence remains in `docs/BUILD_AND_TEST_REPORT.md`; seven portal builds/type checks passed in the earlier execution and were not repeated here.
