# SSVM ERP — Consolidated Project Status

**Canonical document:** `docs/PROJECT_STATUS.md`  
**Last reviewed:** 2026-11-22  
**Repository:** `pavo-bit/erp`  
**Branch:** `main`  
**Audited HEAD before documentation consolidation:** `93e6ceb0e2671acc0adbad3f02d52395f5976e0a`  
**Latest observed CI:** [Continuous Integration #177](https://github.com/pavo-bit/erp/actions/runs/44938174767)  
**Latest observed production workflow:** [Production CI/CD #133](https://github.com/pavo-bit/erp/actions/runs/44938174777)

> This is the single consolidated project completion and blocker register. It replaces older phase reports, duplicate gap registers and release snapshots. Update this document after every verified task. Never copy historical test totals forward as current evidence.

## 1. Executive status

**Overall: NOT READY FOR PRODUCTION ACCEPTANCE.**

The latest observed CI run passes backend test shards, restricted-role PostgreSQL migration/RLS checks, backend type-check and lint ratchet, security scan, API hooks synchronization and all seven portal builds. The Playwright job executed but failed five tests. The production workflow is blocked because the production `DATABASE_URL` secret is missing. Additional production integrations and operational proof remain outstanding.

The developer workstation previously lacked Docker Desktop/daemon and local PostgreSQL/Redis. That does not prevent hosted CI execution: GitHub Actions provisions its own disposable PostgreSQL and Redis services, and those service-backed CI jobs passed in run #177.

## 2. Repository baseline and latest CI evidence

### Repository snapshot

| Item | Value |
|---|---|
| Branch | `main` |
| Audited commit | `93e6ceb0e2671acc0adbad3f02d52395f5976e0a` |
| Commit subject | `fix(e2e): export ALLOW_DEMO_SEED, support student session cookies & api rewrites, fix parent apiCall GET method, and robustify locators` |
| CI evidence date | 2026-11-21 UTC |

### CI run #177

[Open Continuous Integration run #177](https://github.com/pavo-bit/erp/actions/runs/44938174767)

| Check | Result | Evidence note |
|---|---|---|
| Backend test shard 1 | **PASS** | Job completed successfully |
| Backend test shard 2 | **PASS** | Job completed successfully |
| Backend test shard 3 | **PASS** | Job completed successfully |
| Backend test shard 4 | **PASS** | Job completed successfully |
| PostgreSQL migration and restricted-role RLS | **PASS** | Hosted PostgreSQL service used |
| Backend TypeScript type-check | **PASS** | Job passed |
| Backend lint ratchet | **PASS** | Job passed; historical lint baseline is not zero |
| Security scan | **PASS** | Job passed |
| API hooks synchronization | **PASS** | Job passed |
| ERP Admin build | **PASS** | Production build |
| Super Admin build | **PASS** | Production build |
| Teacher Portal build | **PASS** | Production build |
| Student Portal build | **PASS** | Production build |
| Parent Portal build | **PASS** | Production build |
| Payment Portal build | **PASS** | Production build |
| SaaS Frontend build | **PASS** | Production build |
| Playwright E2E | **FAIL** | Five tests failed |

The E2E job completed seed, backend startup, portal installation/build/start, E2E type-check and its backend readiness preflight. Playwright test execution then failed.

### Current Playwright failures in run #177

Five tests failed. The log evidence includes these scenarios:

1. **Admissions-to-invoicing:** ERP Admin login/create-student/generate-invoice flow timed out waiting for expected UI state.
2. **Security/governance audit:** test expected an initiated audit record for the expected `schoolId`, but lookup returned no matching record.
3. **Add Student selector:** `getByRole('button', { name: 'Add Student' })` matched two controls, causing strict-mode failure.
4. **Timetable selector:** `getByText('My Timetable')` matched two elements; use the intended accessible link or a scoped locator.
5. **Fee/overview visibility:** an expected element did not appear before the assertion timeout.

Use the run's traces and error-context artifacts as the source of truth. Do not weaken assertions or use `.first()` as a blanket workaround.

### Additional E2E service-log observations

- PostgreSQL logs showed permission errors for background cleanup DELETE operations on `refresh_tokens` and `otps`. Identify the job and database role before changing grants. Apply least privilege; do not grant broad permissions to the runtime role or weaken RLS.
- Repeated `role "root" does not exist` messages appear in the service logs. Confirm whether a probe is connecting with the default OS username before classifying this as an application defect.

### Production workflow #133

[Open Production CI/CD run #133](https://github.com/pavo-bit/erp/actions/runs/44938174777)

| Job | Result |
|---|---|
| Receipt duplicate pre-check | **FAIL** — production `DATABASE_URL` secret absent |
| Build & Test Backend | **SKIPPED** |
| Build & Push Docker Image | **SKIPPED** |

The pre-check failed before connecting to a database. This does not establish that duplicate receipts exist. Configure the secret only after a real production database and approved least-privileged connection are available.

## 3. Completed and verified engineering foundation

### CI and security foundation

Verified in CI run #177:

- Four backend test shards pass, including the workflow's coverage and shuffled-suite steps.
- PostgreSQL migration and restricted-role RLS job passes.
- Backend TypeScript check passes.
- Backend lint ratchet passes.
- Security scan passes.
- API hooks synchronization passes.
- All seven portal type-check/build jobs pass.

### E2E environment improvements already present

The recent main-branch implementation includes:

- CI test seeding enabled through a test-only demo-seed guard and configured Super Admin seed identity.
- Health-check response matching corrected.
- Ephemeral RSA key generation for CI backend JWT signing.
- Portal builds run with production build mode to prevent the previously observed React null issue.
- Idempotent Prometheus metric registration.
- Seed-time direct administrative Prisma access to establish fixtures before tenant-scoped test execution.
- Backend readiness preflight before Playwright execution.
- Student session cookie handling, API rewrite support, parent API GET method correction and some locator improvements.

These mechanisms must remain isolated from production.

### Existing product capabilities present in the codebase

The following capabilities exist in the repository and implementation history. This is a source inventory, not a claim that every end-to-end flow is production accepted:

- Seven portals: ERP Admin, Super Admin, Teacher, Student, Parent, Payment and SaaS marketing/onboarding.
- Multi-school data architecture using PostgreSQL, Prisma and transaction-scoped RLS.
- Student directory/profile, class/section/session structures, attendance, examinations, gradebook, homework and academic progression capabilities.
- Finance capabilities including fee configuration, invoices, offline/cash collection, payment integration points and ledger services.
- Staff/HR, payroll, library, inventory/procurement, hostel, transport and campus operations capabilities.
- New admission, re-admission and transfer registration paths.
- Printable A4 admission forms/PDF generation and admission fee snapshot/audit behaviour.
- CSV/XLSX bulk import framework with parsing, validation, duplicate review, preview, transactional commit and job history.
- Admission records for demographics, guardian relationships, academic placement, transfer/TC data, document requirements and facility requests.
- School shift models, admin endpoints and a Super Admin configuration page.
- Manual hostel allocation with room-capacity and compatibility checks.
- Manual transport allocation and fleet/route/stop management.
- Parent child-summary API implementation.
- Prometheus metrics and Grafana monitoring components.

Historical admission-specific documentation recorded 93/93 tests in an earlier real-PostgreSQL verification session. That is historical module evidence, not a replacement for current complete CI/E2E proof.

## 4. Partially implemented and incomplete application work

| Workstream | Current state | Remaining work |
|---|---|---|
| Playwright E2E | **PARTIAL / FAILING** | Diagnose and fix five current failures; inspect traces; run the suite twice against fresh data |
| Platform Settings | **NOT IMPLEMENTED** | Persistent platform settings model/service, strict key allowlist, Super Admin API, audit, cache invalidation and functional UI; keep security invariants read-only |
| School shifts | **PARTIAL** | Verify published/session/effective-date behaviour; reject invalid/ambiguous mappings; test session transitions; migrate safely before removing legacy fallback |
| Guardian identity | **PARTIAL** | Basic phone-based same-school matching exists; add multi-signal ambiguity detection and authorized staff review to prevent unrelated-family merges |
| Admission documents | **PARTIAL** | Generic document repository upload/download exists; admission Document requirements can remain PENDING_UPLOAD. Integrate real file upload, checksum, verify/reject/re-upload history and student-profile controls |
| Transport admissions | **PARTIAL** | Existing fleet/routes/stops/manual allocation exist. Integrate pending FacilityRequest queue, capacity-safe atomic allocation and request reconciliation |
| Hostel admissions | **PARTIAL** | Existing manual room allocation safeguards exist. Integrate pending FacilityRequest queue and atomic request/allocation status transitions |
| Shared operational filters | **NOT IMPLEMENTED AS COMMON CONTRACT** | Shared server-side query/filter/pagination contract and reusable frontend filter bar |
| Maintenance cleanup permissions | **NEEDS INVESTIGATION** | Resolve CI errors for `refresh_tokens` and `otps` cleanup under least privilege |
| Per-school telemetry | **PARTIAL / VERIFY** | Implement real tenant-scoped telemetry for any currently null/unavailable measurements |
| Finance policy | **OWNER APPROVAL REQUIRED** | Approve partial-payment, refund/reversal and chart-of-accounts rules before live collection |

## 5. Production and external blockers

| ID | Dependency | State | Required action |
|---|---|---|---|
| PRD-01 | Production database | **BLOCKED — EXTERNAL** | Provision/confirm production database, approve least-privileged receipt pre-check account and configure GitHub Actions `DATABASE_URL` |
| PRD-02 | Container registry | **NOT VERIFIED** | Confirm GHCR login, package permissions and actual published versioned image |
| PRD-03 | Deployment target | **BLOCKED — OWNER DECISION** | Select/provision hosting; implement deploy, smoke test, health check and rollback |
| PRD-04 | Razorpay live processing | **BLOCKED — CREDENTIALS/POLICY** | Configure production key ID/secret/webhook secret and obtain finance-owner policy approval |
| PRD-05 | SMS delivery | **BLOCKED — CREDENTIALS/COMPLIANCE** | Configure approved provider credentials and DLT entity/template IDs |
| PRD-06 | Document object storage | **BLOCKED — INFRASTRUCTURE** | Configure durable private object storage, IAM and key management |
| PRD-07 | Backup and recovery | **NOT ACCEPTED** | Demonstrate scheduled backup, restore drill, retention and approved RPO/RTO |
| PRD-08 | Monitoring and alert delivery | **PARTIAL / NOT ACCEPTED** | Verify alert rules, Alertmanager delivery/escalation and platform/school telemetry |
| PRD-09 | Student identity backfill | **OWNER DECISION** | Approve student login identifier, credential-reset, activation and legacy-login cutover policy |

## 6. Known quality baseline

- Backend lint baseline was previously reported at approximately 1,150 existing findings and one warning. The latest CI lint-ratchet job passed. This is not proof that the entire repository has zero lint findings.
- Local Docker Desktop/daemon was previously unavailable on the developer workstation. Local database-dependent test execution remains blocked until local services are restored.
- Hosted GitHub Actions jobs successfully provision disposable PostgreSQL/Redis services and passed backend/RLS checks in CI run #177.
- Do not repeat old exact test totals, model counts, endpoint counts or branch names unless regenerated/verified against the current repository.

## 7. Immediate next actions

1. Download and inspect all current Playwright traces/error-context artifacts for CI #177.
2. Fix duplicate Add Student and My Timetable selectors with scoped accessible locators.
3. Investigate admissions-to-invoicing and fee/overview visibility based on actual page and API state.
4. Investigate the missing audit event and confirm authenticated school context/audit persistence.
5. Resolve `refresh_tokens` and `otps` cleanup permissions using least privilege.
6. Run full Playwright twice against fresh seeded data.
7. Run and inspect complete CI on the resulting main commit.
8. Configure production `DATABASE_URL` only after the real production database is ready.
9. Continue with Platform Settings and admission workflows following [PROJECT_PLAN_LOW_LEVEL.md](PROJECT_PLAN_LOW_LEVEL.md).

## 8. Release decision

**NOT READY FOR PRODUCTION ACCEPTANCE.**

Reason: latest CI run passes backend, RLS, static checks, security scanning and all seven portal builds, but Playwright has five failures. The production database pre-check cannot run because its secret is absent. Live external integrations, deployment proof and backup/restore evidence remain incomplete.

Change this decision only when relevant tasks have current, commit-specific evidence.
