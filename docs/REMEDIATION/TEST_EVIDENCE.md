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

The initial hosted CI run at commit `cffcd24` predated the baseline replacement and failed at missing `public.access_reviews`. The current hosted PostgreSQL run verifies the replacement baseline and schema. The generated fail-closed RLS migration passes the dedicated RLS test suite, but it must not be merged until the per-request and trusted pre-auth transaction paths also work end-to-end. Those paths are still unimplemented. Existing deployed databases need a controlled migration-history adoption plan. `161b591` remains reverted, not verified, and must not be depended on.

## Payment, search, ledger, and test-fixture remediation — 2026-11-01

The baseline already contains `@@unique([invoiceId, transactionId])` and creates
`payment_transactions_invoiceId_transactionId_key`; the DB census script now also
asserts that this index exists, is unique, and has the expected columns. This new
assertion has not yet run against a clean database, so this incremental verification
remains UNVERIFIED. The prior hosted baseline run applied the baseline on an empty
PostgreSQL database and confirmed schema diff and all 205 tables, but it predates this
index assertion.

| Command/check | Result | Notes |
|---|---|---|
| `npm run type-check` | PASS | Fresh local run after current edits. |
| `npx prisma validate` | PASS | Fresh local run. |
| `npm run db:tenant-classification:check` | PASS | Fresh local run; 205 models (124 direct, 50 indirect, 31 global); 174 tenant models with migration tables. Structural check only. |
| `npx eslint tests/fts_rls.test.ts tests/architecture.test.ts tests/auth.test.ts tests/health.test.ts tests/messaging.test.ts tests/multitenancy/isolation.test.ts tests/tenant.test.ts tests/webhooks.test.ts src/tests/helpers/factories.ts src/tests/db/ledger-integrity.test.ts scripts/verify-database-schema.ts` | FAIL; 20 errors, 0 warnings | Existing `any` errors in several edited test files/factories and unused bindings in `tests/multitenancy/isolation.test.ts`. |
| `git diff --check` | PASS | Whitespace validation only. |
| `npm run test:ci` | FAIL before test collection; 41 failed suites, 0 tests | Vitest could not rename temporary cache files (Windows sandbox `EPERM`). Not a test pass/fail count. |
| `$env:TEMP=(Resolve-Path .vitest-temp).Path; $env:TMP=$env:TEMP; npm run test:ci -- --exclude 'dist/**'` | FAIL before collection; 25 failed suites, 0 tests | A real isolated `DATABASE_URL_TEST` is not configured locally. This is not a DB gate and reports no skipped tests. `dist/**` was excluded to avoid double-counting compiled copies. |
| `npm audit --audit-level=high` | BLOCKED | npm registry DNS lookup failed (`ENOTFOUND registry.npmjs.org`); current advisory list cannot be refreshed here. Previous hosted CI reported high advisories but its package-level details were not available in this run. |
| Clean PostgreSQL baseline + composite-index assertion | UNVERIFIED (score 0) | Requires hosted CI or another reachable real PostgreSQL database. |
| Search route + trigram indexes | UNVERIFIED (score 0) | Test asserts student/document matches and four trigram indexes. Route behavior and migration were not executed against PostgreSQL here. |
| Ledger balance and posted-row immutability | UNVERIFIED (score 0) | Migration and three DB tests authored; no PostgreSQL execution. |
| Authenticated request tenant transaction and trusted role paths | NOT IMPLEMENTED | The current AsyncLocalStorage context and Prisma query extension do not wrap the whole request in a transaction. Pre-auth, webhook, worker, and audited super-admin connections are not yet separated. The RLS migration remains isolated in the `database-rls` CI job and must not be merged until authenticated API tests pass. |
| Existing database adoption | DOCUMENTED; NOT EXECUTED | See `docs/DATABASE/EXISTING_DATABASE_ADOPTION.md`. The plan requires a backup, staging equivalence review, and explicit DBA approval before `migrate resolve --applied`. |

The previous hosted test artifact reported 178 tests: 36 passed, 85 failed, 57
skipped, 0 errors. The 57 were Vitest hook/setup cascades, not explicit `.skip`
tests: suites importing the server bootstrap instead of the exported Express app
failed setup, and other suites could not seed tenant rows while RLS had no tenant
context. The current branch changes affected imports to `src/app`, adds required
`School.code` to the shared factory, and keeps the RLS migration outside the main
test job. This local run cannot confirm whether those fixes clear the cascades because
the local DB gate is unavailable. A fresh CI artifact is required for a new total.

| Area | Weight | Current verified score for this change set |
|---|---:|---:|
| DB & migrations | 15 | 0 for new DB assertions (UNVERIFIED) |
| Security/authz | 15 | 0 for request transaction/trusted-connection requirements (NOT IMPLEMENTED) |
| Tenant isolation | 15 | 0 for request-bound transaction behavior (NOT IMPLEMENTED; RLS suite remains separately gated) |
| Finance/payments | 15 | 0 for new clean-DB index assertion and ledger invariants (UNVERIFIED) |
| Backend features | 10 | 0 for new search behavior (UNVERIFIED) |
| Portals | 15 | No new portal gate run; prior evidence unchanged |
| Tests/CI/E2E | 10 | 0 for this fresh local full-suite attempt (blocked before test collection) |
| Ops/docs | 5 | 1 for the authored adoption plan and corrected deployment lockfile path; deploy CI not rerun |

This is a per-change evidence table, not a replacement for the overall readiness
score. No new overall percentage is claimed until the required full gates produce
fresh evidence. This evidence is recorded in `docs/REMEDIATION/TEST_EVIDENCE.md`.

### Hosted CI follow-up — PR run 41296848127

Run: [41296848127](https://github.com/pavo-bit/erp/actions/runs/41296848127),
commit `c111f50`. These jobs ran on hosted PostgreSQL 16 and Redis 7:

| Job / gate | Result | Detail |
|---|---|---|
| `Build & Test Backend` | PASS | `npm ci`, Prisma client generation, and strict TypeScript check passed. |
| `backend-type-check` | PASS | `npm run type-check` passed. |
| `Migrate and RLS Tests (restricted role)` | FAIL before RLS tests | Migrations deployed, but shadow diff found the 4 raw trigram indexes absent from the Prisma model declarations. Follow-up commit `1ed9811` declares matching Gin/trigram indexes; rerun pending. `test:rls` was not reached. |
| `backend-test` | FAIL; 169 tests: 93 passed, 43 failed, 33 skipped | The test role could not `TRUNCATE` tables during shared setup. Follow-up commit `1ed9811` grants cleanup privileges in this non-RLS-only job; rerun pending. Additional failures include existing RBAC expectations (17 failures: unauthenticated role cases returned 403 where tests expect 401) and a payment webhook assertion. |
| `backend-lint` | FAIL; 519 errors, 1 warning | Existing repository lint debt; no lint rule was relaxed. |
| `security-scan` | FAIL | 89 advisories total: 31 high, 2 critical, 54 moderate, 2 low. `npm audit fix` is suggested for the two critical dependencies; no force upgrade was run. |
| Frontend build jobs | PASS; 7/7 | All configured Next.js portals built. |
| Deploy workflow | PASS | Lockfile path correction was accepted; package install and backend type check passed. |

Audit triage from that run: critical `handlebars` (4.7.9; direct dependency,
compiled for school editable communication templates and reports) has three
JavaScript-injection advisories; upgrade the direct dependency to a fixed compatible
release and review template compilation before release. Critical `proxy-addr`
(transitive through Express) has an IPv4-mapped IPv6 trust-subnet spoofing advisory;
upgrade through the maintained Express dependency chain and test `trust proxy` / IP
allowlisting behavior. High advisories affect `@grpc/grpc-js`,
`@opentelemetry/propagator-jaeger`, `axios`, `basic-ftp`, `body-parser`,
`brace-expansion`, `browserslist`, `deepmerge-ts`, `follow-redirects`, `form-data`,
`ip-address`, `js-yaml`, `nanoid`, `postcss`, `sharp`, `source-map-js`,
`systeminformation`, `vite`, `ws`, and `zod`; npm identifies a non-forced fix for
most. Review the dependency paths and test direct upgrades before merging. This is
triage only; no dependency changes were applied. The local audit command remains
blocked by registry DNS, so use a fresh hosted audit after dependency changes.

The 57 skipped tests from the earlier artifact were historical hook/setup cascades,
not explicit skips. The fresh hosted artifact after repairing imports and adding
`School.code` fixtures reports 33 skips; it still has failures and must not be
reported as passing. The fresh total supersedes the prior 178-test count for this
commit only. The fix to test-role grants and schema index declarations is in
`1ed9811`; its fresh run is pending as of this evidence update.

### Final fresh hosted run — PR run 41301456157

Run: [41301456157](https://github.com/pavo-bit/erp/actions/runs/41301456157),
commit `5af170f`. Companion deployment workflow:
[41301456138](https://github.com/pavo-bit/erp/actions/runs/41301456138).

| Job / gate | Result | Fresh evidence |
|---|---|---|
| `Migrate and RLS Tests (restricted role)` | PASS | Clean PostgreSQL migration deploy and Prisma shadow diff exited 0; 205/205 model tables and the unique `payment_transactions(invoiceId, transactionId)` index verified; RLS + ledger DB suite 180/180 passed. Test setup asserted a non-superuser and `rolbypassrls=false`. |
| `backend-type-check` | PASS | `npm run type-check`. |
| `backend-test` | FAIL; 169 tests: 96 passed, 73 failed, 0 skipped | The app test JUnit contains 172 records/76 failures because it includes 3 suite-level failure records in addition to 169 individual test cases/73 failures. There are no `.skip` tests and no skipped cases in this run. `tests/fts_rls.test.ts` passed 3/3, including both search API assertions and the four trigram-index assertion. Tenant authenticated API/security assertions remain failing. |
| `backend-lint` | FAIL; 519 errors, 1 warning | Existing repository-wide lint debt; no rule suppression. |
| `security-scan` | FAIL; 89 advisories | 31 high, 2 critical, 54 moderate, 2 low. Critical direct `handlebars` and transitive `proxy-addr` triage is above; no dependency fix has been applied. |
| Frontend portal builds | PASS; 7/7 | All seven Next.js portal builds completed. |
| Deploy workflow | PASS | Backend install, Prisma generate, and strict type-check passed; image-push job is skipped for PR events. |

The previous **57 skipped** count came from before/after hook setup failures, not
explicitly skipped test cases. The largest cascades were tenant isolation, role
scoping, architecture, messaging, and webhook suites. Their causes included bad
Express bootstrap imports, missing `School.code`, obsolete user `password` fields,
invalid School/Teacher/Student seed properties, and shared-database cleanup racing
fixtures. The final test gate serializes file execution, uses corrected Prisma seed
fields, and now reports **0 skipped**. The 73 remaining failing test assertions are
not skipped; several tenant/authentication expected behaviors remain unresolved.

The final qualitative area score table uses only the current evidence. Numeric area
percentages are not recalculated because this repo has no per-requirement scoring
inventory from which to derive denominators; the prior audit estimate remains
approximately 25–30%, and this work does not establish the >=80% target.

| Area | Weight | Current verified state | Open gate / reason |
|---|---:|---|---|
| DB & migrations | 15 | PASS for clean baseline, schema diff, 205 tables, and payment unique index | Existing database adoption has not been executed. |
| Security/authz | 15 | PARTIAL | Request-transaction wrapper and trusted pre-auth/webhook/worker/super-admin paths are not implemented; authenticated API tests fail. |
| Tenant isolation | 15 | PARTIAL | 180 restricted-role RLS tests pass; the per-request tenant transaction and authenticated API path remain unverified. |
| Finance/payments | 15 | PARTIAL | Posted ledger balance/immutability tests and payment unique index pass; payment-flow vulnerabilities remain. |
| Backend features | 10 | PARTIAL | Search route and trigram index assertions pass; other feature completeness is outside this change. |
| Portals | 15 | BUILD PASS; feature coverage remains partial | 7/7 builds pass; the missing portal modules from the baseline audit remain. |
| Tests/CI/E2E | 10 | PARTIAL | 180 DB/RLS tests pass and full app suite has 0 skips, but 73/169 assertions fail. |
| Ops/docs | 5 | PARTIAL | Deploy lockfile path fixed; adoption plan recorded; 2 critical and 31 high advisories remain. |

The authenticated-API tenant wrapper requirement is still incomplete. Keep the RLS
migration in its separate CI job and do not merge PR #1 until that wrapper and the
trusted role paths pass real authenticated API tests. The existing-database adoption
plan is [EXISTING_DATABASE_ADOPTION.md](../DATABASE/EXISTING_DATABASE_ADOPTION.md),
and this evidence is recorded in `docs/REMEDIATION/TEST_EVIDENCE.md`.

### Fresh baseline CI run — commit `61ae0c6`

Run: [41294950758](https://github.com/pavo-bit/erp/actions/runs/41294950758), on real PostgreSQL 16 and Redis 7 services, commit `cbf1479`.

| Gate | Result | Evidence |
|---|---|---|
| Prisma migration deploy | PASS | Baseline, retained full-text index migration, and fail-closed RLS migration all applied. |
| `prisma migrate diff` against schema | PASS | Shadow DB replay and `--exit-code` check completed successfully with no schema diff. |
| Prisma model table census | PASS; 205/205 | CI query found every generated Prisma model table in `public`. |
| Backend test suite (`test:ci`) | FAIL; 178 tests: 36 passed, 85 failed, 57 skipped, 0 errors | JUnit artifact `backend-test-results` was retrieved. Failures include fixture operations rejected by RLS without tenant context, stale required `School.code` fields, and existing API/server setup failures. No test was skipped or weakened by this change. |
| `test:rls` | PASS; 177/177 | Ran as a role asserted `rolsuper=false`, `rolbypassrls=false`; generated coverage checks cover all 174 tenant models, and behavior tests include fail-closed missing-tenant reads, tenant reads, and cross-tenant write denial. |
| Backend type-check | PASS | CI job `backend-type-check`. |
| Backend full lint | FAIL; 519 errors, 1 warning | Repository-wide errors remain although focused lint for `src/lib/prisma.ts` passes. |
| Frontend builds | PASS; 7/7 | All configured portal build jobs passed. |
| Dependency security scan | FAIL | `npm audit --audit-level=high` found advisories; Trivy did not run. |

This verifies the fresh baseline builds all 205 tables and is schema-equivalent on the CI PostgreSQL database. Database RLS policies pass their dedicated non-bypass suite, but real API requests still fail the broad backend suite because the app does not yet install tenant context in a per-request transaction and pre-auth operations do not have a separate trusted role path. The RLS migration must remain unmerged until those paths are implemented and verified end-to-end.
