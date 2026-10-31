# Remediation Baseline Report

Baseline captured 2026-10-31 22:11:41 UTC (2026-11-01 03:41:41 Asia/Kolkata).

## Repository state

- Branch: `main`
- Local HEAD: `8ae14656ceb80325022cd4bb27e79f898326b623`
- Fetched `origin/main`: same SHA
- Working tree: clean at baseline capture
- Remote fetch completed; no checkout, reset, commit, push, or deployment performed.

## Inventories

- Route generator extracted 365 mounted endpoint declarations. It does not prove authorization correctness; the generated matrix keeps every row `REVIEW_REQUIRED`.
- Prisma inventory: 205 models, 124 with a direct `schoolId` field. Indirect ownership and policy coverage still require semantic classification.
- Seven Next.js portals are documented. Prior evidence reports successful clean installs, builds and standalone type checks; these were not repeated during this baseline turn.

## Confirmed current defects from source review

| ID | Finding | State at baseline | Evidence |
|---|---|---|---|
| TEN-RLS-01 | RLS predicate explicitly allows all rows when `current_tenant_id()` is NULL. | OPEN | `ssvm-backend/prisma/migrations/20260617_add_rls_policies/migration.sql` |
| TEN-CTX-01 | Authentication context handoff has a focused isolated test, but database RLS context is not set transaction-locally. | PARTIAL | `auth.ts`, `school-context.middleware.ts`, `prisma.ts` |
| FIN-GOV-01 | Period-close and reconciliation handlers lacked authentication. Period close trusted body actor/school and ignored unsuccessful close results. | FIXED IN THIS EXECUTION | `routes/finance-governance.ts` and focused tests |
| FIN-REC-01 | Reconciliation wrote a zero ledger balance and made placeholder matches without statement-line persistence. | MITIGATED, FEATURE INCOMPLETE | Placeholder now returns authenticated HTTP 501; real reconciliation remains open. |
| CRM-AUTH-01 | CRM router lacked authentication and relied on caller-provided tenant/actor values. | FIXED IN THIS EXECUTION, DB TEST OPEN | `routes/crm.ts` |
| INV-AUTH-01 | Inventory router lacked authentication and accepted caller-provided tenant/actor values; transfer did not update source/destination stocks. | PARTIALLY FIXED | Auth/scope checks and serializable movements added; transfer is rejected; PostgreSQL verification remains. |
| PROC-AUTH-01 | Procurement routes lacked authentication and trusted caller identity; receipt lacked per-line quantities in the schema. | PARTIALLY FIXED | Request/approval boundaries secured; fake receipt now returns authenticated HTTP 501. |
| FIN-PRECISION-01 | Purchase request/PO monetary columns use `Float`; broader finance calculations include JavaScript number arithmetic. | OPEN | Prisma schema and financial services require full precision audit. |

## Environment and verification limits

- No PostgreSQL integration database was available during prior work; Docker Desktop engine access was denied. No RLS, migration, finance transaction or tenant-isolation integration test is claimed.
- The focused security suite currently passes 16 tests across five files. Backend type-check, build and Prisma validation passed during this execution. Full backend lint still fails with repository-wide violations.
- Hosted CI, Playwright, backup/restore, and production deployment were not run.

See `VERIFIED_ISSUE_REGISTER.md`, `TEST_EVIDENCE.md`, and `BLOCKER_REGISTER.md` for current statuses.
