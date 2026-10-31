# SSVM ERP Implementation Master Tracker

Updated: 2026-11-01

This tracker records verified repository work against the five-phase remediation request. A change is not marked verified without an executed, relevant check.

## Current evidence-based status

| Phase | Scope | Status | Evidence / remaining work |
|---|---|---|---|
| 0 Baseline/scope/hygiene | Source-of-truth docs, inventory, install and baseline | IN_PROGRESS | Fetched `origin/main`; it matched local HEAD `8ae14656…` and the working tree was clean at baseline. Regenerated 365 route declarations and 205 model inventory (124 direct `schoolId` fields). Semantic review, full feature approval and DB baseline remain incomplete. |
| 1 Security containment | Route inventory, auth boundaries, CSRF, documents, governance, secrets, configuration | IN_PROGRESS | CSRF/document fixes remain; finance-governance and CRM/inventory routes now require authenticated roles and derive school/actor from server identity. 365 endpoint rows remain REVIEW_REQUIRED. Exposed-secret rotation, full route review and PostgreSQL RLS fail-open behavior remain open. |
| 2 Multi-tenancy and RBAC | Identity, tenant context, Prisma enforcement, RLS, model inventory, ownership tests | IN_PROGRESS | Successful route authentication now updates request-local school context; isolated tests verify propagation and concurrent request isolation (3/3). This activates the existing Prisma tenant filter for its limited allowlist. RLS remains fail-open when no tenant is set, model coverage is incomplete, and database-backed isolation is not verified. |
| 3 Finance and accounting | Payment verification, invoices, ledger, decimals, reconciliation, close and fines | IN_PROGRESS | Late-fine HTTP trigger is authenticated and school scoped; removed Razorpay placeholder credentials and made signatures timing-safe. Remaining payment and accounting requirements have not been verified. |
| 4 Application workflows | Seven portals, API contract matrix, student/parent/teacher/admin, inventory/procurement, reports | NOT_STARTED | No comprehensive portal or API inventory performed. |
| 5 Integration and release readiness | Compose, CI, isolated tests, E2E, monitoring, docs and production checks | IN_PROGRESS | Clean installs, builds and standalone type checks pass for all seven portals. Backend build/type-check and isolated CSRF, retention and tenant-context tests pass. Backend and frontend lint remain failing overall. DB integration and E2E were not run. User edits to Dockerfile and upload-directory initialization remain preserved. |

## Requirement-level changes this turn

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| P1-CSRF-01 | Enforce CSRF middleware on applicable requests | IMPLEMENTED | Removed unconditional `next()`, removed weak fallback secret, retained explicit login/webhook exclusions and bearer-only exemption. |
| P1-CSRF-02 | Enforce allowed browser Origin and propagate tokens in clients | TESTED | Origin check and token issuance/client handling implemented; isolated middleware suite passed 3/3; frontend/browser integration still untested. |
| P1-DOC-01 | Prevent public direct access to private document files | IMPLEMENTED | Static `/uploads/documents` now returns 404; authenticated `/:id/download` validates school/student scope and confines the resolved path to the document directory. |
| P1-GOV-01 | Protect retention configuration and execution | IMPLEMENTED | Retention policy and workflow routes require authentication and admin role; policy input and school scope are validated; global execution is super-admin-only. |
| P1-FIN-01 | Protect public late-fine mutation trigger | IMPLEMENTED | Requires authenticated finance/admin role, school-scoped selection and guarded update. |
| P1-SEED-01 | Remove known privileged defaults and secret-bearing backup | IMPLEMENTED | Removed tracked backup and old seeder; demo seed requires explicit opt-in, non-production mode and supplied credentials. Credential rotation remains outstanding. |
| P5-TEST-DB-01 | Prevent destructive tests from using implicit database URL | IMPLEMENTED | Tests require explicit `DATABASE_URL_TEST` with a test-marked database name; CI config updated. |
| P2-CONTEXT-01 | Propagate verified DB identity into request-local school context | TESTED | Authentication updates AsyncLocalStorage after token/account/school checks; isolated middleware tests pass 3/3, including concurrent school requests. |
| P2-RLS-01 | Fail closed for missing RLS tenant and verify DB role privileges | NOT_STARTED | Existing policy allows all rows when `current_tenant_id()` is NULL; the request path does not set PostgreSQL transaction-local context. Requires transaction-safe enforcement design and isolated PostgreSQL verification. |
| P1-FIN-GOV-01 | Require finance authorization and trusted actor/school for period close | TESTED | Unauthenticated close rejected; close service receives authenticated school/user and its validation failures return 409; route tests pass. |
| P1-FIN-REC-01 | Prevent false-positive bank reconciliation | IMPLEMENTED | Replaced placeholder zero-balance record creation with authenticated 501 response; real statement-line persistence/matching remains unimplemented. |
| P1-CRM-AUTH-01 | Protect CRM operations and scope leads/campaigns/stages by school | IMPLEMENTED | Router now requires admissions/admin role; non-super-admin school scope and interaction actor come from authenticated identity; no DB-backed ownership test yet. |
| P1-INV-AUTH-01 | Protect inventory reads/movements and scope referenced entities | IMPLEMENTED | Router requires operations-admin role; server derives school/actor; item and location are checked in school; transfer explicitly rejected until destination workflow exists. DB-backed movement test remains. |

## Executed verification

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | PASS; 1,167 packages installed and Prisma Client generated by `postinstall`. |
| `npm run type-check` | PASS |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| Isolated security and tenant-context suite | PASS; 15 tests across CSRF, retention, tenant-context, finance authorization and governance route cases |
| Portal installs/builds/type checks | PASS; all seven portals |
| Focused ESLint on modified backend security/payment files | PASS |
| Full backend ESLint | FAIL; 567 problems (566 errors, 1 warning) |
| Portal lint | FAIL / PARTIAL; missing flat configs in three portals and existing lint errors in the others |
| Database-backed tests | NOT RUN; no PostgreSQL listener, Docker daemon unavailable |

## Completion score

No defensible percentage is available yet. The approved denominator is not frozen and most requirements remain unimplemented or unverified. Implementation completion and production readiness are therefore **not established**.
