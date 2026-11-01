# Test Evidence

Updated: 2026-11-01

| Category | Command/check | Result | Limits |
|---|---|---|---|
| Repository baseline | `git fetch origin main`; compare `HEAD` and `FETCH_HEAD` | PASS; both `8ae14656ceb80325022cd4bb27e79f898326b623` | Fetch only, no checkout. |
| Inventory | `node ssvm-backend/scripts/build-route-authorization-inventory.cjs` | PASS; 365 declarations | Mechanical inventory only; all rows remain review-required. |
| Inventory | `node ssvm-backend/scripts/build-model-inventory.cjs` | PASS; 205 models, 124 direct school fields | Does not classify indirect ownership or enforcement. |
| Backend type check | `npm run type-check` in `ssvm-backend` | PASS | Does not verify runtime database behavior. |
| Backend type check (fresh rerun) | `npx tsc --version` then `npm run type-check` (2026-11-01) | PASS; TypeScript 5.9.3 | `tsconfig` was not changed. |
| RLS integration suite source/type check | `npm run type-check`; `npx eslint vitest.rls.config.ts src/tests/db/setup.ts src/tests/db/tenant-rls.test.ts` (2026-11-01) | PASS; type check and focused lint | The suite is authored only; this does not execute or verify PostgreSQL behavior. |
| Backend build | `npm run build` in `ssvm-backend` | PASS | Does not prove production readiness. |
| Prisma schema | `npx prisma validate` | PASS | No migration was run against PostgreSQL. |
| Focused lint | `npx eslint src/routes/finance-governance.ts src/routes/crm.ts src/routes/inventory.ts src/routes/procurement.ts src/tests/security/business-route-boundaries.test.ts src/tests/security/finance-governance-auth.test.ts src/tests/security/finance-governance.test.ts` | PASS | Full repository lint still fails. |
| Focused security suite | `npx vitest run --config vitest.security.config.ts --pool=threads` (fresh run, 2026-11-01 14:23:33 local) | PASS; 6 files, 21 tests | Uses isolated middleware/service mocks; not a DB integration suite. The separate RLS suite is excluded. |
| Full backend lint | `npm run lint` | FAIL; 548 errors, 1 warning | Repository-wide pre-existing and outstanding quality debt. |
| PostgreSQL integration | Not run | BLOCKED | No controlled PostgreSQL test database available in this execution. |
| RLS tenant-isolation suite | `npm run test:rls` | UNVERIFIED (score 0); NOT RUN | Requires real PostgreSQL and test role assertions (`rolsuper = false`, `rolbypassrls = false`); no reachable database. |
| Docker/CI/E2E | Not run | NOT VERIFIED | Docker engine/hosted CI/controlled full-stack environment not available. |

Historical portal evidence remains in `docs/BUILD_AND_TEST_REPORT.md`; seven portal builds/type checks passed in the earlier execution and were not repeated here.

Ground-truth correction from the repository owner: the RLS migration applies cleanly on an empty database and configures 23 tables. This is not a fresh database execution by the agent in this turn; it corrects prior documentation that implied migration-ordering failure. The verified defects remain incomplete RLS coverage and the fail-open NULL-tenant policy.

Fresh local evidence on 2026-11-01: `npx vitest run --config vitest.security.config.ts --pool=threads` passed 6 files and 21 tests at 14:23:33; `npx tsc --version` reported 5.9.3 and `npm run type-check` passed. No `tsconfig` file was changed. The RLS suite was not run and is not included in that total.

Tenant isolation phase evidence: `npm run type-check` and `npx eslint vitest.rls.config.ts src/tests/db/setup.ts src/tests/db/tenant-rls.test.ts` passed after authoring the RLS suite. `npm run test:rls` was not run because no real PostgreSQL instance is reachable. The RLS implementation and tests remain UNVERIFIED (score 0); no DB gate passed.

PostgreSQL gate policy: mocked/unit route checks are not DB evidence. Isolation and RLS tests must connect to a real PostgreSQL instance and assert `rolsuper = false` and `rolbypassrls = false` in setup; fail the suite if either assertion is false. Until that gate passes, each DB-dependent item remains UNVERIFIED and scores 0.
