# SSVM ERP Implementation Master Tracker

Updated: 2026-11-01

This tracker records verified repository work against the five-phase remediation request. A change is not marked verified without an executed, relevant check.

## Current evidence-based status

| Phase | Scope | Status | Evidence / remaining work |
|---|---|---|---|
| 0 Baseline/scope/hygiene | Source-of-truth docs, inventory, install and baseline | IN_PROGRESS | Fetched `origin/main`; it matched local HEAD `8ae14656…` and the working tree was clean at baseline. Baseline inventory had 364 route declarations; the current matrix has 365 after adding the finance-period list. Prisma inventory has 205 models (124 direct `schoolId` fields). Semantic review, full feature approval and DB baseline remain incomplete. |
| 1 Security containment | Route inventory, auth boundaries, CSRF, documents, governance, secrets, configuration | IN_PROGRESS | CSRF/document fixes remain; finance-governance, CRM, inventory and procurement route guards have isolated mock/unit evidence only. Their DB-dependent acceptance is UNVERIFIED (score 0). 365 endpoint rows remain REVIEW_REQUIRED. Secret rotation, full route review and PostgreSQL RLS fail-open behavior remain open. |
| 2 Multi-tenancy and RBAC | Identity, tenant context, Prisma enforcement, RLS, model inventory, ownership tests | IN_PROGRESS | Request-local identity propagation has isolated unit evidence (3/3); actual PostgreSQL tenant isolation is UNVERIFIED (score 0). RLS remains fail-open when tenant is absent, model coverage is incomplete, and the app does not set transaction-local context. |
| 3 Finance and accounting | Payment verification, invoices, ledger, decimals, reconciliation, close and fines | IN_PROGRESS | Finance close route has isolated mock/unit evidence; DB-dependent acceptance is UNVERIFIED (score 0). Fake reconciliation returns 501. Payment, precision, ledger and DB workflows remain unverified. |
| 4 Application workflows | Seven portals, API contract matrix, student/parent/teacher/admin, inventory/procurement, reports | IN_PROGRESS | CRM, inventory and procurement route guards have isolated mock/unit evidence; DB-dependent acceptance is UNVERIFIED (score 0). Unsupported transfer/receipt paths fail closed. Complete portal API/workflow mapping and DB tests remain. |
| 5 Integration and release readiness | Compose, CI, isolated tests, E2E, monitoring, docs and production checks | IN_PROGRESS | Fresh isolated suite passed 6 files/21 tests; this is not DB evidence. All seven portals have historical build/type-check evidence. Backend build/type-check, ERP Admin type check, Prisma validation, full lint, DB integration and E2E need fresh/complete gates. |

## Requirement-level changes this turn

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| P1-CSRF-01 | Enforce CSRF middleware on applicable requests | IMPLEMENTED | Removed unconditional `next()`, removed weak fallback secret, retained explicit login/webhook exclusions and bearer-only exemption. |
| P1-CSRF-02 | Enforce allowed browser Origin and propagate tokens in clients | TESTED | Origin check and token issuance/client handling implemented; isolated middleware suite passed 3/3; frontend/browser integration still untested. |
| P1-DOC-01 | Prevent public direct access to private document files | CODE IMPLEMENTED; DB ACCEPTANCE UNVERIFIED (score 0) | Static `/uploads/documents` returns 404; authenticated download scope checks require real PostgreSQL ownership tests. |
| P1-GOV-01 | Protect retention configuration and execution | CODE IMPLEMENTED; DB ACCEPTANCE UNVERIFIED (score 0) | Authentication/role checks and bounded execution are in code; persistence and school scoping need PostgreSQL tests. |
| P1-FIN-01 | Protect public late-fine mutation trigger | CODE IMPLEMENTED; DB ACCEPTANCE UNVERIFIED (score 0) | Auth and school guards are in code; school-scoped selection/update need PostgreSQL tests. |
| P1-SEED-01 | Remove known privileged defaults and secret-bearing backup | CODE IMPLEMENTED; DB ACCEPTANCE UNVERIFIED (score 0) | Seed opt-in guards are in code; no isolated DB seed run. Credential rotation remains outstanding. |
| P5-TEST-DB-01 | Prevent destructive tests from using implicit database URL | CODE IMPLEMENTED; DB GATE UNVERIFIED (score 0) | Explicit `DATABASE_URL_TEST` guard exists; isolation setup must also assert non-superuser and non-BYPASSRLS on real PostgreSQL. |
| P2-CONTEXT-01 | Propagate verified DB identity into request-local school context | UNIT TESTED; DB GATE UNVERIFIED (score 0) | Authentication updates AsyncLocalStorage after token/account/school checks; isolated middleware tests pass 3/3, including concurrent school requests. Does not prove RLS isolation. |
| P2-RLS-01 | Fail closed for missing RLS tenant and verify DB role privileges | UNVERIFIED (score 0) | Existing policy allows all rows when `current_tenant_id()` is NULL; the request path does not set PostgreSQL transaction-local context. Requires real PostgreSQL behavior tests as a role asserted non-superuser and non-BYPASSRLS. |
| P1-FIN-GOV-01 | Require finance authorization and trusted actor/school for period close | UNIT TESTED; DB GATE UNVERIFIED (score 0) | Mock route checks reject anonymous requests and verify actor/school and 409 behavior; no real PostgreSQL close integration test. |
| P1-FIN-REC-01 | Prevent false-positive bank reconciliation | MITIGATION CODED; FEATURE SCORE 0 | Replaced placeholder zero-balance record creation with authenticated 501 response; real statement-line persistence/matching remains unimplemented. |
| P1-CRM-AUTH-01 | Protect CRM operations and scope leads/campaigns/stages by school | UNVERIFIED (score 0) | Guard/scope code and mocked route checks exist; real PostgreSQL ownership behavior remains unverified. |
| P1-INV-AUTH-01 | Protect inventory reads/movements and scope referenced entities | UNVERIFIED (score 0) | Guard/scope code and mocked route checks exist; real PostgreSQL transaction, ledger and tenant behavior remain unverified. |
| P1-PROC-AUTH-01 | Protect procurement requests, approvals and receipts | UNVERIFIED (score 0) | Guard/scope code and mocked route checks exist; persisted ownership and approval behavior remain unverified in PostgreSQL. |
| P4-FIN-API-01 | Align ERP Admin financial-close consumer with protected backend routes | UNVERIFIED (score 0 for DB-dependent acceptance) | Portal paths and backend contract were updated; mock route/type checks are not PostgreSQL-backed portal/API evidence. |

## Executed verification

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | PASS; 1,167 packages installed and Prisma Client generated by `postinstall`. |
| `npm run type-check` | PASS |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| Isolated security and tenant-context suite | PASS; fresh run 2026-11-01, 6 files and 21 tests across CSRF, retention, tenant-context, finance, CRM, inventory and procurement route cases |
| Portal installs/builds/type checks | PASS; all seven portals |
| Focused ESLint on modified backend security/payment files | PASS |
| Full backend ESLint | FAIL; 549 problems (548 errors, 1 warning) |
| Portal lint | FAIL / PARTIAL; missing flat configs in three portals and existing lint errors in the others |
| Database-backed tests | UNVERIFIED (score 0); no PostgreSQL listener, Docker daemon unavailable |

## Completion score

No defensible percentage is available yet. The approved denominator is not frozen and most requirements remain unimplemented or unverified. Implementation completion and production readiness are therefore **not established**.
