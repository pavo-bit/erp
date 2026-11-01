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
| CI PostgreSQL role setup | `.github/workflows/ci.yml` restricted app role provisioning | CONFIGURED; NOT RUN | Workflow now provisions a run-scoped non-superuser test role; migration runs as the PostgreSQL bootstrap role. No CI job has executed this configuration yet. |
| Docker/CI/E2E | Not run | NOT VERIFIED | Docker engine/hosted CI/controlled full-stack environment not available. |

Historical portal evidence remains in `docs/BUILD_AND_TEST_REPORT.md`; seven portal builds/type checks passed in the earlier execution and were not repeated here.

Ground-truth correction from the repository owner: the RLS migration applies cleanly on an empty database and configures 23 tables. This is not a fresh database execution by the agent in this turn; it corrects prior documentation that implied migration-ordering failure. The verified defects remain incomplete RLS coverage and the fail-open NULL-tenant policy.

Fresh local evidence on 2026-11-01: `npx vitest run --config vitest.security.config.ts --pool=threads` passed 6 files and 21 tests at 14:23:33; `npx tsc --version` reported 5.9.3 and `npm run type-check` passed. No `tsconfig` file was changed. The RLS suite was not run and is not included in that total.

Tenant isolation phase evidence: `npm run type-check` and `npx eslint vitest.rls.config.ts src/tests/db/setup.ts src/tests/db/tenant-rls.test.ts` passed after authoring the RLS suite. `npm run test:rls` was not run because no real PostgreSQL instance is reachable. The RLS implementation and tests remain UNVERIFIED (score 0); no DB gate passed.

PostgreSQL gate policy: mocked/unit route checks are not DB evidence. Isolation and RLS tests must connect to a real PostgreSQL instance and assert `rolsuper = false` and `rolbypassrls = false` in setup; fail the suite if either assertion is false. Until that gate passes, each DB-dependent item remains UNVERIFIED and scores 0.

GitHub handoff: PR [#1](https://github.com/pavo-bit/erp/pull/1) is open for `remediation/80pct`. GitHub Actions run link/results could not be retrieved: `gh pr checks 1 --watch --interval 10` failed to connect to `api.github.com`, and the connected Code Review diagnostics tool returned that the GitHub connection is unavailable. Runtime role separation commit `161b591` was reverted as `a7bd17f` pending real PostgreSQL verification.

## Phase 2 authoring update — 2026-11-01

| Command/check | Result | Limits |
|---|---|---|
| `npm run db:tenant-classification` | PASS; generated 205 model entries: 124 direct, 50 indirect, 31 global | Heuristic schema classification; all entries remain UNVERIFIED (score 0). 61 tenant models intersect migration CREATE TABLE inventory; 113 have no migration table. |
| `npm run db:tenant-classification:check` | PASS; generated JSON, TypeScript model map and RLS migration are current | Structural freshness check only; no semantic review or DB gate. |
| `npm run type-check` | PASS; fresh rerun after correcting indirect to-one relation filter | Does not validate Prisma runtime or generated SQL behavior. |
| `npx eslint vitest.config.ts vitest.rls.config.ts src/lib/prisma.ts src/tests/db/setup.ts src/tests/db/tenant-rls.test.ts` | FAIL; 13 errors, 0 warnings in `src/lib/prisma.ts` | Existing explicit `any`/`@ts-ignore` patterns and unused logger in touched file; no rules suppressed. |
| `git diff --check` | PASS | Whitespace check only. |
| `npm run test:rls` | UNVERIFIED (score 0); NOT RUN | No reachable real PostgreSQL. Missing-tenant case is expected RED against baseline fail-open policy. New generated per-model coverage assertions also fail for missing migration models and uncovered RLS policies. Setup asserts `rolsuper=false` and `rolbypassrls=false`. |
| PR CI (`migrate`, `lint`, `type-check`, `tests`, `test:rls`) | UNVERIFIED (score 0); no run results retrieved | PR #1 is open; GitHub connection/API unavailable from this execution. |

The Phase 2 implementation is incomplete. Its classification, extension, migration, and RLS authoring remain UNVERIFIED (score 0) pending semantic review and real PostgreSQL evidence. Per-request transaction context and a trustworthy audited super-admin path are not implemented. Runtime-role commit `161b591` remains reverted and unverified.

## Phase 1 / Prisma client cleanup update — 2026-11-01

| Command/check | Result | Limits |
|---|---|---|
| `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script --output ../docs/DATABASE/BASELINE_CANDIDATE.sql` | PASS; generated an offline candidate with 205 `CREATE TABLE` statements and 44 `CREATE TYPE` statements | Copied into the active `20261101130000_full_schema_baseline` migration and the partial migration folders were replaced in commit `766790b`; this replacement still awaits a clean hosted DB gate. |
| `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` | BLOCKED; Prisma requires `--shadow-database-url` for a migrations-directory diff | No real PostgreSQL/shadow database is reachable. |
| `docker info --format '{{.ServerVersion}}'` | BLOCKED; Docker Desktop engine pipe returned permission denied | No local Postgres container can be provisioned from this execution. |
| `npx eslint src/lib/prisma.ts` | PASS; 0 errors, 0 warnings | Changed file only. |
| `npm run type-check` | PASS | Does not prove runtime DB context. |
| `npx vitest run --config vitest.security.config.ts --pool=threads` after Prisma lint fix | PASS; 6 files, 21 tests | Fresh run at 15:06:13 local. |
| Same security command after Prisma singleton batch 1 | PASS; 6 files, 21 tests | Fresh run at 15:07:26 local. |
| Same security command after Prisma singleton batch 2 | PASS; 6 files, 21 tests | Fresh run at 15:09:34 local. |
| `npm run db:tenant-classification:check` | PASS; 205 models current | Structural freshness only; generated classifications remain UNVERIFIED. |
| `rg -l 'new PrismaClient\\s*\\(' . -g '!node_modules' -g '!dist'` | PASS; only `src/lib/prisma.ts` remains | Before this turn: 36 files outside the central module; exact list is in `PRISMA_CLIENT_INVENTORY.md`. The migration/DB gates remain unverified. |
| `git diff --check` | PASS | Whitespace check only. |
| PR #1 hosted CI run | FAIL; [Actions run 41294194583](https://github.com/pavo-bit/erp/actions/runs/41294194583) | Real PostgreSQL and Redis services started. Job-level details follow. |

| PR #1 job / step | Result | Evidence |
|---|---|---|
| `migrate` / `Deploy Prisma Migrations` | FAIL on real PostgreSQL | Migration `20261101150000_generated_tenant_rls` raised `Classified tenant table public.access_reviews is missing; apply the complete baseline schema before tenant RLS.` This confirms the partial migration history does not build the classified schema. |
| `lint` / `backend-lint` | FAIL; 519 errors, 1 warning | Repository-wide debt; `src/lib/prisma.ts` focused lint is PASS with 0 errors. |
| `type-check` / `backend-type-check` | PASS | CI job completed successfully. |
| `tests` / `Run Tests with Coverage` | SKIPPED | The backend-test job stopped at migration deploy. |
| `test:rls` / `Run PostgreSQL RLS tests` | SKIPPED | The backend-test job stopped at migration deploy; no RLS test result is claimed. |
| `Build & Test Backend` workflow | FAIL during setup | [Actions run 41294194587](https://github.com/pavo-bit/erp/actions/runs/41294194587); `actions/setup-node` could not find a root lockfile. Type-check in the main workflow separately passed. |
| Frontend portal build jobs | PASS; 7/7 | `erp-admin`, `parent-portal`, `payment-portal`, `saas-frontend`, `student-portal`, `super-admin`, `teacher-portal`. |
| `security-scan` | FAIL | `npm audit --audit-level=high` reported high and moderate dependency advisories; Trivy was skipped. |

The previous hosted CI run tested commit `cffcd24` before the baseline migration replacement and failed at missing `public.access_reviews`; it did not test the new baseline. The baseline and retained full-text index migration are now active in the working tree; a new real-PostgreSQL CI result is required before claiming all 205 tables exist or schema diff is empty. The generated tenant RLS migration raises an exception if a classified tenant table is absent, but it is not to be merged until the baseline and trusted request/pre-auth transaction paths pass end-to-end on PostgreSQL. No per-request transaction wrapper or separate trusted pre-auth/super-admin DB role path has been implemented. Existing deployed databases need a controlled migration-history adoption plan. `161b591` remains reverted, not verified, and must not be depended on.
