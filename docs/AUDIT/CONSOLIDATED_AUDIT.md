# SSVM ERP Consolidated Audit

Generated: 2026-11-01T12:06:26.741Z
Repository commit: `709b4840cb65fc7f54198d6a85b55728c325dd6b`
Verdict: **FAIL** — overall **0%** (score is floored, never rounded up).

## Thresholds

| Check | Result |
|---|---|
| Overall >= 80 | FAIL |
| Every area >= 70 | FAIL |
| Zero open Critical issues | FAIL |

## Score table

| Area | Weight | Verified / denominator | Denominator | Score | Weighted contribution |
|---|---:|---:|---|---:|---:|
| DB & migrations | 15 | 0/4 | GROUNDED | 0% | 0 |
| Security/authz | 15 | 0/4 | GROUNDED | 0% | 0 |
| Tenant isolation | 15 | 0/6 | GROUNDED | 0% | 0 |
| Finance/payments | 15 | 0/6 | GROUNDED | 0% | 0 |
| Backend features | 10 | 0/1 | GROUNDED | 0% | 0 |
| Portals | 15 | 0/14 | GROUNDED | 0% | 0 |
| Tests/CI/E2E | 10 | 0/5 | GROUNDED | 0% | 0 |
| Ops/docs | 5 | 0/2 | GROUNDED | 0% | 0 |
| **Overall** | **100** |  | **0%** | **0** |

## Per-lane evidence

### Lane A

- Status: **UNVERIFIED**
- Commit: UNVERIFIED
- CI run: UNVERIFIED
- Evidence file missing: `docs/AUDIT/evidence/A.json`
- Jobs: UNVERIFIED

### Lane B

- Status: **UNVERIFIED**
- Commit: UNVERIFIED
- CI run: UNVERIFIED
- Evidence file missing: `docs/AUDIT/evidence/B.json`
- Jobs: UNVERIFIED

### Lane C

- Status: **UNVERIFIED**
- Commit: UNVERIFIED
- CI run: UNVERIFIED
- Evidence file missing: `docs/AUDIT/evidence/C.json`
- Jobs: UNVERIFIED

### Lane D

- Status: **UNVERIFIED**
- Commit: UNVERIFIED
- CI run: UNVERIFIED
- Evidence file missing: `docs/AUDIT/evidence/D.json`
- Jobs: UNVERIFIED

### Lane E

- Status: **UNVERIFIED**
- Commit: UNVERIFIED
- CI run: UNVERIFIED
- Evidence file missing: `docs/AUDIT/evidence/E.json`
- Jobs: UNVERIFIED

### Lane F

- Status: **UNVERIFIED**
- Commit: UNVERIFIED
- CI run: UNVERIFIED
- Evidence file missing: `docs/AUDIT/evidence/F.json`
- Jobs: UNVERIFIED

### Lane G

- Status: **UNVERIFIED**
- Commit: UNVERIFIED
- CI run: UNVERIFIED
- Evidence file missing: `docs/AUDIT/evidence/G.json`
- Jobs: UNVERIFIED

## Drift and conflicts

No evidence conflicts reported.

Missing lane evidence files:

- Lane A: `docs/AUDIT/evidence/A.json` (UNVERIFIED)
- Lane B: `docs/AUDIT/evidence/B.json` (UNVERIFIED)
- Lane C: `docs/AUDIT/evidence/C.json` (UNVERIFIED)
- Lane D: `docs/AUDIT/evidence/D.json` (UNVERIFIED)
- Lane E: `docs/AUDIT/evidence/E.json` (UNVERIFIED)
- Lane F: `docs/AUDIT/evidence/F.json` (UNVERIFIED)
- Lane G: `docs/AUDIT/evidence/G.json` (UNVERIFIED)

## Open issues by severity

### Critical (19)

- `DB-001` — Lane A — UNVERIFIED: A clean PostgreSQL database is built by the committed migration chain, and all 205 model tables exist.
- `DB-002` — Lane A — UNVERIFIED: A clean migrated database has an empty Prisma schema diff.
- `SEC-001` — Lane C — UNVERIFIED: Mounted sensitive endpoints have reviewed authentication, role, tenant, and ownership rules; no route remains REVIEW_REQUIRED.
- `SEC-002` — Lane C — UNVERIFIED: Token validation uses the approved asymmetric algorithm with no insecure fallback.
- `SEC-004` — Lane C — UNVERIFIED — HUMAN ACTION: Credential exposure remediation is complete, including rotation and downstream exposure review.
- `TEN-001` — Lane A — UNVERIFIED: Every Prisma model has a reviewed direct, indirect, or global ownership classification; additions fail CI if unclassified.
- `TEN-002` — Lane A — UNVERIFIED: Tenant RLS covers every classified tenant table and denies access when the tenant setting is absent.
- `TEN-003` — Lane A — UNVERIFIED: Every authenticated request uses a transaction whose first statement sets transaction-local tenant context; authenticated API isolation tests pass.
- `TEN-004` — Lane A — UNVERIFIED: Pre-auth, webhook, worker, and audited super-admin operations use explicit trusted connections with tests and audit records.
- `TEN-006` — Lane A — UNVERIFIED: No application module creates a PrismaClient outside the central Prisma module.
- `FIN-001` — Lane B — UNVERIFIED: Payment creation and verification enforce invoice/student ownership, provider order binding, amount, currency, and outstanding balance.
- `FIN-002` — Lane B — UNVERIFIED: Invalid signatures cannot mutate another user's payment, and partial payments do not mark invoices fully paid.
- `FIN-003` — Lane B — UNVERIFIED: Webhook signatures use raw bytes, constant-time comparison, mandatory secrets, and duplicate-delivery protection in all environments.
- `FIN-004` — Lane B — UNVERIFIED: Payment state and ledger posting are atomic; ledger failure is surfaced and no parallel inconsistent ledger engine remains.
- `FIN-005` — Lane B — UNVERIFIED: Ledger entries balance per posted transaction and posted rows reject UPDATE/DELETE, with database tests.
- `QA-001` — Lane E — UNVERIFIED: The full backend suite passes without skipped tests, weakened assertions, or suite-setup cascades.
- `QA-002` — Lane E — UNVERIFIED: CI provides isolated PostgreSQL and Redis resources per lane, with RLS tests asserting a non-superuser, non-BYPASSRLS role.
- `QA-005` — Lane G — UNVERIFIED: An independent clean-clone audit re-runs required gates and confirms evidence provenance and lane claims.
- `OPS-001` — Lane C — UNVERIFIED: Production database, Redis, dashboards, metrics, and container images have reviewed access and deployment configuration.

### High (23)

- `DB-003` — Lane A — UNVERIFIED: The payment_transactions invoiceId/transactionId unique constraint exists after migration.
- `DB-004` — Lane C — UNVERIFIED: Existing database adoption and migration-history reconciliation are documented and reviewed.
- `SEC-003` — Lane C — UNVERIFIED: Operational endpoints and dashboards require authentication and authorization.
- `TEN-005` — Lane A — UNVERIFIED: All tenant Prisma reads and writes, including nested writes and upserts, are scoped from generated classification data.
- `FIN-006` — Lane B — UNVERIFIED: Financial monetary schema fields use exact decimal arithmetic; unspecified policy defaults are documented for owner approval.
- `BE-001` — Lane B — UNVERIFIED: Bank reconciliation and goods receipt return workflows are schema-backed rather than 501 placeholders.
- `PORT-001` — Lane D — UNVERIFIED: All seven portals build and have authenticated browser smoke coverage against configured API endpoints.
- `QA-003` — Lane D — UNVERIFIED: Browser E2E runs real portal workflows against the API with isolated, reproducible fixtures.
- `QA-004` — Lane F — UNVERIFIED: Backend lint, type-check, and build all pass without weakened rules or suppressed errors.
- `OPS-002` — Lane C — UNVERIFIED: Runtime versions, lockfile paths, and dependency advisories are reviewed; no open high/critical advisory remains.
- `PORT-002` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing procurement workflow.
- `PORT-003` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing inventory workflow.
- `PORT-004` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing ledger workflow.
- `PORT-005` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing payroll workflow.
- `PORT-006` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing CRM workflow.
- `PORT-007` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing scholarships workflow.
- `PORT-008` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing certificates workflow.
- `PORT-009` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing messages workflow.
- `PORT-010` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing branches workflow.
- `PORT-011` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing billing workflow.
- `PORT-012` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing reconciliation workflow.
- `PORT-013` — Lane D — UNVERIFIED: Portals provide the explicitly listed missing reporting workflow.
- `PORT-014` — Lane D — UNVERIFIED: Portal API configuration has no hard-coded localhost URLs and sensitive tokens are not stored in localStorage.

### Medium (0)

None.

### Low (0)

None.

## HUMAN ACTIONS

- `SEC-004` — UNVERIFIED: Credential exposure remediation is complete, including rotation and downstream exposure review.

## Requirement evidence

| ID | Area | Owner | Status | Grounding source | Evidence |
|---|---|---|---|---|---|
| DB-001 | db_migrations | A | UNVERIFIED | baseline_audit.1: Ground-truth defect 1: only 68/205 Prisma models have migrations; RLS references absent tables; migrate deploy cannot build a working DB. | UNVERIFIED: no lane claim |
| DB-002 | db_migrations | A | UNVERIFIED | baseline_audit.1: Ground-truth defect 1: only 68/205 Prisma models have migrations; RLS references absent tables; migrate deploy cannot build a working DB.; followup.payment_unique_constraint.1: Owner clarification: restore payment_transactions(invoiceId, transactionId) unique constraint and confirm on clean DB. | UNVERIFIED: no lane claim |
| DB-003 | db_migrations | A | UNVERIFIED | followup.payment_unique_constraint.1: Owner clarification: restore payment_transactions(invoiceId, transactionId) unique constraint and confirm on clean DB. | UNVERIFIED: no lane claim |
| DB-004 | db_migrations | C | UNVERIFIED | followup.existing_database_adoption.6: Owner clarification: document existing-database adoption using migrate resolve. | UNVERIFIED: no lane claim |
| SEC-001 | security_authz | C | UNVERIFIED | baseline_audit.7: Ground-truth defect 7: 365 endpoints are REVIEW_REQUIRED in ROUTE_AUTHORIZATION_MATRIX.md. | UNVERIFIED: no lane claim |
| SEC-002 | security_authz | C | UNVERIFIED | baseline_audit.10: Ground-truth defect 10: public/duplicate metrics, anonymous Grafana, exposed/default database and Redis, unpinned images, runtime mismatch, HS256 fallback, and repository junk. | UNVERIFIED: no lane claim |
| SEC-003 | security_authz | C | UNVERIFIED | baseline_audit.10: Ground-truth defect 10: public/duplicate metrics, anonymous Grafana, exposed/default database and Redis, unpinned images, runtime mismatch, HS256 fallback, and repository junk. | UNVERIFIED: no lane claim |
| SEC-004 | security_authz | C | UNVERIFIED | baseline_audit.5: Ground-truth defect 5: secrets are present in git history; HUMAN must rotate credentials. | UNVERIFIED: no lane claim |
| TEN-001 | tenant_isolation | A | UNVERIFIED | baseline_audit.2: Ground-truth defect 2: tenant allowlist covers 27 of 124 schoolId models; RLS fails open with NULL tenant; app does not set it; payments.ts constructs a bare client.; orchestration.lane_a: Orchestration instruction: lane A exclusively owns schema, shared Prisma, and tenant request context; RLS waits for authenticated API gate. | UNVERIFIED: no lane claim |
| TEN-002 | tenant_isolation | A | UNVERIFIED | baseline_audit.2: Ground-truth defect 2: tenant allowlist covers 27 of 124 schoolId models; RLS fails open with NULL tenant; app does not set it; payments.ts constructs a bare client.; orchestration.blocked_db_policy: Owner instruction: DB-dependent work without real PostgreSQL is UNVERIFIED and scores zero; RLS setup must assert non-superuser/non-BYPASSRLS. | UNVERIFIED: no lane claim |
| TEN-003 | tenant_isolation | A | UNVERIFIED | followup.tenant_transaction_wrapper.4: Owner request: per-request transaction wrapper sets transaction-local app.current_school_id as first statement.; orchestration.lane_a: Orchestration instruction: lane A exclusively owns schema, shared Prisma, and tenant request context; RLS waits for authenticated API gate. | UNVERIFIED: no lane claim |
| TEN-004 | tenant_isolation | A | UNVERIFIED | followup.trusted_connections.4: Owner request: trusted separate connections for pre-auth, webhooks, workers, and super-admin.; orchestration.lane_a: Orchestration instruction: lane A exclusively owns schema, shared Prisma, and tenant request context; RLS waits for authenticated API gate. | UNVERIFIED: no lane claim |
| TEN-005 | tenant_isolation | A | UNVERIFIED | baseline_audit.2: Ground-truth defect 2: tenant allowlist covers 27 of 124 schoolId models; RLS fails open with NULL tenant; app does not set it; payments.ts constructs a bare client.; followup.tenant_classification.2: Owner request: generate TENANT_CLASSIFICATION.json for all 205 models with direct, indirect relation, or global classification; fail CI on unclassified additions. | UNVERIFIED: no lane claim |
| TEN-006 | tenant_isolation | A | UNVERIFIED | baseline_audit.2: Ground-truth defect 2: tenant allowlist covers 27 of 124 schoolId models; RLS fails open with NULL tenant; app does not set it; payments.ts constructs a bare client.; followup.prisma_client_cleanup: Owner request: remove all new PrismaClient() constructions outside src/lib/prisma.ts. | UNVERIFIED: no lane claim |
| FIN-001 | finance_payments | B | UNVERIFIED | baseline_audit.3: Ground-truth defect 3: payment ownership/signature/partial-payment checks, webhook verification, idempotence, atomic ledger posting, and consistent ledger engines are defective. | UNVERIFIED: no lane claim |
| FIN-002 | finance_payments | B | UNVERIFIED | baseline_audit.3: Ground-truth defect 3: payment ownership/signature/partial-payment checks, webhook verification, idempotence, atomic ledger posting, and consistent ledger engines are defective.; followup.search_ledger.3: Owner clarification: add search regression test; ledger entries balance per transaction and posted rows reject UPDATE/DELETE, with tests. | UNVERIFIED: no lane claim |
| FIN-003 | finance_payments | B | UNVERIFIED | baseline_audit.3: Ground-truth defect 3: payment ownership/signature/partial-payment checks, webhook verification, idempotence, atomic ledger posting, and consistent ledger engines are defective. | UNVERIFIED: no lane claim |
| FIN-004 | finance_payments | B | UNVERIFIED | baseline_audit.3: Ground-truth defect 3: payment ownership/signature/partial-payment checks, webhook verification, idempotence, atomic ledger posting, and consistent ledger engines are defective. | UNVERIFIED: no lane claim |
| FIN-005 | finance_payments | B | UNVERIFIED | followup.search_ledger.3: Owner clarification: add search regression test; ledger entries balance per transaction and posted rows reject UPDATE/DELETE, with tests. | UNVERIFIED: no lane claim |
| FIN-006 | finance_payments | B | UNVERIFIED | baseline_audit.4: Ground-truth defect 4: 71 monetary fields are Float and late fine is hard-coded to 50. | UNVERIFIED: no lane claim |
| BE-001 | backend_features | B | UNVERIFIED | baseline_audit.6: Ground-truth defect 6: bank reconciliation and goods receipt return return 501 because schema fields are missing. | UNVERIFIED: no lane claim |
| PORT-001 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| QA-001 | tests_ci_e2e | E | UNVERIFIED | baseline_audit.9: Ground-truth defect 9: about 120 tests without DB-backed run, placeholder E2E, CI never run, backend lint problems, and removed TS options; correction says TS 5.9.3 tsc passes and tsconfig must not change.; followup.skipped_tests.5: Owner clarification: explain 57 skipped tests, fix School.code fixtures, and rerun the suite. | UNVERIFIED: no lane claim |
| QA-002 | tests_ci_e2e | E | UNVERIFIED | orchestration.isolated_lane_services: Orchestration instruction: each lane gets a unique PostgreSQL database, Redis DB index, and ports.; orchestration.rls_role_assertion: Orchestration instruction: RLS tests run under non-superuser, non-BYPASSRLS role and assert these role flags. | UNVERIFIED: no lane claim |
| QA-003 | tests_ci_e2e | D | UNVERIFIED | baseline_audit.9: Ground-truth defect 9: about 120 tests without DB-backed run, placeholder E2E, CI never run, backend lint problems, and removed TS options; correction says TS 5.9.3 tsc passes and tsconfig must not change. | UNVERIFIED: no lane claim |
| QA-004 | tests_ci_e2e | F | UNVERIFIED | baseline_audit.9: Ground-truth defect 9: about 120 tests without DB-backed run, placeholder E2E, CI never run, backend lint problems, and removed TS options; correction says TS 5.9.3 tsc passes and tsconfig must not change.; ground_truth_corrections.typescript_5_9: Owner correction: tsc passes with TypeScript 5.9.3; do not change tsconfig. | UNVERIFIED: no lane claim |
| QA-005 | tests_ci_e2e | G | UNVERIFIED | orchestration.lane_g_clean_clone_audit: Orchestration instruction: lane G reruns everything from a clean clone and may downgrade lane claims. | UNVERIFIED: no lane claim |
| OPS-001 | ops_docs | C | UNVERIFIED | baseline_audit.10: Ground-truth defect 10: public/duplicate metrics, anonymous Grafana, exposed/default database and Redis, unpinned images, runtime mismatch, HS256 fallback, and repository junk. | UNVERIFIED: no lane claim |
| OPS-002 | ops_docs | C | UNVERIFIED | baseline_audit.9: Ground-truth defect 9: about 120 tests without DB-backed run, placeholder E2E, CI never run, backend lint problems, and removed TS options; correction says TS 5.9.3 tsc passes and tsconfig must not change.; baseline_audit.10: Ground-truth defect 10: public/duplicate metrics, anonymous Grafana, exposed/default database and Redis, unpinned images, runtime mismatch, HS256 fallback, and repository junk.; followup.deploy_lockfile_audit.7: Owner clarification: fix deploy.yml lockfile path and triage npm audit high/critical. | UNVERIFIED: no lane claim |
| PORT-002 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-003 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-004 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-005 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-006 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-007 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-008 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-009 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-010 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-011 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-012 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-013 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
| PORT-014 | portals | D | UNVERIFIED | baseline_audit.8: Ground-truth defect 8: portal coverage gaps, hard-coded localhost URLs, and tokens in localStorage. | UNVERIFIED: no lane claim |
