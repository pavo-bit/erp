# SSVM ERP — Low-Level Implementation Plan

**Canonical document:** `docs/PROJECT_PLAN_LOW_LEVEL.md`  
**Source branch:** `main`  
**Last reviewed:** 2026-11-22  
**Planning baseline:** `93e6ceb0e2671acc0adbad3f02d52395f5976e0a`

## 1. Execution protocol

Work one task at a time directly on `main`. Before each task, refresh `origin/main`, inspect the working tree and record the starting SHA. Never create/switch branches, open pull requests, force-push, reset history or discard user changes.

For each task:

1. Inspect current code, migrations, API contracts and existing tests.
2. Classify the requirement as missing, partial, already implemented or broken.
3. Define expected behaviour and failure cases.
4. Implement the smallest safe change using existing services/components.
5. Add tests at the correct level.
6. Run targeted tests, then the relevant broader suite.
7. Review tenant isolation, authorization, transaction and concurrency behaviour.
8. Review the diff and run `git diff --check`.
9. Update [PROJECT_STATUS.md](PROJECT_STATUS.md) and relevant technical documentation.
10. Commit to `main`, push and record the exact SHA and CI run.

A test that is skipped, queued, blocked or only type-checked is not a passing test.

## 2. Status vocabulary

- **VERIFIED:** implementation and required tests executed successfully on a named commit.
- **IMPLEMENTED / UNVERIFIED:** code exists but runtime evidence is absent.
- **PARTIAL:** some parts exist; an integration or acceptance requirement remains.
- **NOT IMPLEMENTED:** no production implementation is present.
- **BLOCKED — EXTERNAL:** requires owner-provided credentials, policy, infrastructure or deployment target.
- **DEFERRED:** explicitly outside the current work sequence.

## 3. Work package REL — CI and Playwright stabilization

### REL-01 — Freeze and classify the current E2E baseline

**Priority:** P0

- Inspect the latest CI run and download Playwright reports, traces and error-context artifacts.
- Record each failing test, title, locator/assertion, actual page/API state and stack trace.
- Separate fixture/setup errors, authentication/authorization errors, locator ambiguity, timing problems and genuine application defects.
- Prefer current traces over historical failure summaries.

**Acceptance:** every current failure has a reproducible case and a documented root-cause classification.

### REL-02 — Backend lifecycle and address readiness

Relevant areas: `.github/workflows/ci.yml`, backend server entry point, health route, portal API configuration and Playwright config.

- Verify the backend PID remains alive after initial health check and through Playwright execution.
- Preserve startup logs and PID in runner temporary storage.
- Verify the listening address and use one consistent API base URL across backend, portal build/runtime and Playwright.
- Poll readiness until the expected health payload is returned.
- Fail clearly and upload logs if the server exits or readiness is not achieved.
- Distinguish transient startup connection failures from actual test-time outages.

**Acceptance:** backend remains reachable throughout the browser run and its logs are available on failure.

### REL-03 — Authoritative seed and authentication contract

Relevant areas: seed scripts, CI workflow, E2E global setup/auth helpers and login tests.

- Define one source of truth for ERP Admin, Super Admin and any other required E2E identities.
- Seed each identity with the intended role, school/tenant relationship and active state.
- Keep seeding idempotent.
- Restrict demo-seed flags to disposable CI/test databases and fail closed for production-like configuration.
- Do not print passwords, JWT signing keys or other secrets.
- Keep ephemeral CI JWT signing keys isolated from production.

**Acceptance:** each E2E login uses the same seeded account contract and has only the intended permissions.

### REL-04 — Dynamic test database fixtures

- Remove hardcoded generated school, tenant, user and session IDs from tests.
- Generate a typed run-scoped fixture manifest or equivalent provider during seeding.
- Make required non-secret IDs available to the Playwright job.
- Validate the manifest and fail early if required fixtures are absent.
- Ensure fixtures cannot leak across separate database runs.

**Acceptance:** all tests use IDs created by their current run.

### REL-05 — Repair ambiguous UI selectors

Observed examples include:
- `getByRole('button', { name: 'Add Student' })` matching two buttons.
- `getByText('My Timetable')` matching two elements.
- Visibility assertions timing out in admissions/invoicing and fee-overview flows.

Use accessible role/name locators, exact names and scope to the intended dialog, page heading, navigation region or form. Add stable test IDs only where semantic selectors cannot express the requirement. Fix accessibility labels when the interface itself is ambiguous.

Do not use `.first()` merely to suppress strict-mode failures.

**Acceptance:** every locator identifies the intended UI element uniquely and its behaviour is verified.

### REL-06 — Repair admissions, invoicing and audit expectations

- Inspect the intended seeded school, role permissions, endpoint response, rendered UI and audit write path.
- Determine whether the test assumption is stale or the application workflow is defective.
- Audit events must derive school context from the authenticated actor; do not trust arbitrary client-supplied school IDs.
- Do not fabricate audit entries in test-only response code.
- Add a regression test for each corrected scenario.

**Acceptance:** an ERP Admin can execute the intended admission/invoicing scenario and the audit record is persisted with correct school context.

### REL-07 — Resolve test maintenance permissions

CI service logs showed permission errors for cleanup `DELETE` operations on `refresh_tokens` and `otps`.

- Identify the background job issuing the queries and the database role it uses.
- Review ownership, grants, RLS and whether cleanup should use a dedicated maintenance role.
- Apply least privilege; do not grant broad privileges to the normal runtime role as a shortcut.
- Add a focused test proving the cleanup job can perform only its intended operation.
- Investigate repeated `role "root" does not exist` service messages; confirm whether they originate from a health probe using the default OS username.

**Acceptance:** no recurring cleanup permission errors and no weakening of tenant isolation.

### REL-08 — Repeatability and release verification

- Run each corrected test independently.
- Run the complete Chromium E2E suite.
- Repeat the complete suite against fresh test data.
- Verify all CI jobs on the same commit: backend shards/shuffle, RLS, type-check, lint, security, seven portal builds and E2E.
- Preserve Playwright report, traces and service logs.

**Acceptance:** both E2E executions pass and every required CI job passes on the same commit.

## 4. Work package PLT — Platform Settings persistence

**Priority:** P1  
**Current state:** Super Admin settings surface is read-only; persistent global settings contract/store is not implemented.

### PLT-01 — Inventory and contract

- Inventory settings UI, SaaS configuration models and services.
- Separate editable settings from immutable cluster/security invariants.
- Define typed setting keys, validation, defaults and ownership.
- Keep MFA enforcement, RLS and security-critical invariants read-only unless separately approved by an explicit security design.

### PLT-02 — Durable backend configuration

- Use a database-backed durable store; Redis may be a cache, not the sole source of truth.
- Model global platform scope explicitly; do not attach global configuration accidentally to a school tenant.
- Implement authenticated read/update routes and strict allowlist validation.
- Restrict writes to Super Admin with platform context/audience.
- Persist updates transactionally.
- Record actor, changed keys, timestamp and safe before/after metadata in an audit event. Never log secrets.

### PLT-03 — Cache and UI integration

- Invalidate or refresh affected caches after commit.
- Ensure failed updates cannot leave stale cache values appearing as persisted state.
- Connect Save/Reset controls to real API behaviour.
- Display validation, permission and persistence errors.
- Add optimistic-concurrency/version protection if concurrent edits are possible.

### PLT-04 — Tests

Test defaults, valid writes, unknown keys, invalid values, non-Super Admin denial, school-audience denial, rollback, audit event, cache invalidation/read-after-write and attempts to modify immutable security settings.

**Acceptance:** settings survive process restart and updates are authorized, validated, persisted and audited.

## 5. Work package ADM — Admission foundations

### ADM-01 — School shift hardening

Relevant areas: `SchoolShift`, `SchoolShiftClass`, shift admin routes, admission shift resolution and Super Admin shifts page.

- Validate school/session/class ownership.
- Ensure new admission resolution uses valid published configuration.
- Reject inactive, draft, archived, expired or ambiguous assignments.
- Verify effective-date and configuration-version behaviour.
- Inventory legacy comma-separated `applicableClasses` values.
- Migrate records safely before removing legacy fallback.
- Test session transitions, multi-school isolation and ambiguous mappings.

**Acceptance:** one valid published shift resolves from school + session + class; invalid/cross-school mappings fail closed.

### ADM-02 — Guardian identity review

Relevant areas: admission registration service, Guardian, StudentGuardian and ERP Admin guardian interface.

- Preserve existing sibling linking behaviour.
- Do not auto-merge unrelated guardians solely because primary phone matches.
- Use multiple available signals: normalized name, phone, email and address/locality.
- Record ambiguous candidate matches and provide an authorized staff review queue.
- Support link-to-existing, create-separate and secondary-contact decisions.
- Record reviewer, timestamp, decision and justification.
- Enforce school isolation and idempotent imports.

**Acceptance:** legitimate siblings can share a verified guardian; unrelated families sharing contact details are not silently merged.

### ADM-03 — Admission document lifecycle

Relevant areas: Prisma `Document` and `DocumentRepository`, document routes, admission registration and Student Profile Documents tab.

- Reconcile the two current document pathways and define one canonical lifecycle or a maintained adapter.
- Support `PENDING_UPLOAD → UPLOADED → VERIFIED` and `UPLOADED → REJECTED → RE-UPLOADED`.
- Require a rejection reason and preserve version/history.
- Validate actual file signature, MIME, extension and size.
- Calculate/store SHA-256 checksums.
- Use private durable storage for production; do not rely on ephemeral container disk.
- Enforce authenticated download and school ownership.
- Add student-profile upload, verify, reject and download/preview controls.
- Test path traversal, oversize files, MIME spoofing, duplicates, unauthorized and cross-school access.

**Acceptance:** every verified admission document points to an actual private file and has auditable decisions.

### ADM-04 — Shared operational filters

- Define one typed server-side query contract for search, session, class, section, shift, locality, PIN code, status and pagination.
- Reuse it in Student Directory, Admissions, Hostel and Transport where fields apply.
- Enforce school scope before applying user filters.
- Use stable sorting and bounded page sizes.
- Add composite indexes only after query-plan review.
- Provide a reusable ERP Admin filter bar with consistent reset and pagination behaviour.

**Acceptance:** filters behave consistently and do not require loading the entire school dataset into the browser.

## 6. Work package OPS — Hostel and transport integration

### OPS-01 — Transport FacilityRequest queue

Relevant area: existing transport routes and ERP Admin transport page.

- Add a pending transport request queue sourced from `FacilityRequest`.
- Filter by locality, PIN, class, section, shift and status.
- Reuse existing route, stop, vehicle and manual allocation models.
- Check route compatibility and seating capacity.
- Lock the correct capacity-bearing row inside the allocation transaction.
- Atomically create/update TransportAllocation and set the corresponding FacilityRequest to `ALLOCATED`.
- Record reviewer, timestamp and notes.
- Reconcile cancellation/deletion without leaving a false allocated state.

**Acceptance:** no request is marked allocated without a valid allocation; concurrency cannot exceed vehicle capacity.

### OPS-02 — Hostel FacilityRequest queue

Relevant area: existing hostel endpoints and ERP Admin hostel page.

- Add pending hostel requests sourced from `FacilityRequest`.
- Filter by locality, PIN, class, gender, room type and status.
- Reuse the existing manual allocation and room row-lock/capacity checks.
- Preserve maintenance, gender and duplicate-allocation rules.
- Atomically create HostelAllocation and update the matching request.
- Reconcile transfer, checkout and cancellation.

**Acceptance:** request state and room allocation remain consistent through success, failure, retry and concurrency.

## 7. Work package PRD — Production and external operations

### PRD-01 — Production database pre-check

- Configure the actual production `DATABASE_URL` as a GitHub Actions secret only after the production database exists.
- Use an approved least-privileged account for duplicate-receipt reads.
- Verify TLS/network access and secret redaction.
- Keep the pre-check fail-closed when the secret is absent.
- Never substitute CI/local database or fake a passing result.

### PRD-02 — Image publication and deployment

- Implement GHCR login and package write permissions.
- Build and publish versioned images.
- Select and configure the actual hosting/deployment target with owner approval.
- Add migration strategy, health checks, smoke tests and rollback.
- Distinguish local build, registry push and live deployment.

### PRD-03 — External services and operations

- Razorpay live credentials, webhook secret, reconciliation and finance-policy approval.
- SMS provider credentials and approved DLT entity/templates.
- Durable private object storage and key-management ownership.
- Automated backups, successful restore drill and approved RPO/RTO.
- Grafana/Prometheus/Alertmanager and verified alert delivery.
- Real platform/school telemetry and alert thresholds.

**Acceptance:** every production dependency is verified in the real environment or explicitly excluded from release.

## 8. Documentation maintenance

Keep exactly the canonical files listed in [docs/README.md](README.md). Update [PROJECT_STATUS.md](PROJECT_STATUS.md) after each accepted task. Do not create temporary phase reports, duplicate trackers or standalone audit snapshots.

## 9. Required task completion record

For each task, record task ID, starting/final SHA, files changed, migration identifiers, exact commands and exit codes, test counts (passed/failed/skipped/blocked), CI run URL, outstanding risk and next dependency.

Do not mark a task VERIFIED until its required evidence exists.
