# Remediation Baseline Report

Baseline captured 2026-10-31 22:11:41 UTC (2026-11-01 03:41:41 Asia/Kolkata).

## Repository state

- Branch: `main`
- Local HEAD: `8ae14656ceb80325022cd4bb27e79f898326b623`
- Fetched `origin/main`: same SHA
- Working tree: clean at baseline capture
- Remote fetch completed; no checkout, reset, commit, push, or deployment performed.

## Inventories

- Baseline route generator extracted 364 mounted endpoint declarations. The current matrix contains 365 after the authenticated finance-period list route was added. It does not prove authorization correctness; every row remains `REVIEW_REQUIRED`.
- Prisma inventory: 205 models, 124 with a direct `schoolId` field. Indirect ownership and policy coverage still require semantic classification.
- Seven Next.js portals are documented. Prior evidence reports successful clean installs, builds and standalone type checks; these were not repeated during this baseline turn.

## Confirmed current defects from source review

| ID | Finding | State at baseline | Evidence |
|---|---|---|---|
| TEN-RLS-01 | RLS predicate explicitly allows all rows when `current_tenant_id()` is NULL. | OPEN | `ssvm-backend/prisma/migrations/20260617_add_rls_policies/migration.sql` |
| TEN-CTX-01 | Authentication context handoff has a focused isolated test, but database RLS context is not set transaction-locally. | PARTIAL | `auth.ts`, `school-context.middleware.ts`, `prisma.ts` |
| FIN-GOV-01 | Period-close and reconciliation handlers lacked authentication. Period close trusted body actor/school and ignored unsuccessful close results. | CODE CHANGED; DB ACCEPTANCE UNVERIFIED (score 0) | `routes/finance-governance.ts`; mock/unit tests do not verify PostgreSQL behavior |
| FIN-REC-01 | Reconciliation wrote a zero ledger balance and made placeholder matches without statement-line persistence. | MITIGATED, FEATURE INCOMPLETE | Placeholder now returns authenticated HTTP 501; real reconciliation remains open. |
| CRM-AUTH-01 | CRM router lacked authentication and relied on caller-provided tenant/actor values. | CODE CHANGED; DB ACCEPTANCE UNVERIFIED (score 0) | `routes/crm.ts`; mock/unit tests do not verify persisted ownership |
| INV-AUTH-01 | Inventory router lacked authentication and accepted caller-provided tenant/actor values; transfer did not update source/destination stocks. | CODE CHANGED; DB ACCEPTANCE UNVERIFIED (score 0) | Auth/scope checks and serializable movements added; transfer is rejected; PostgreSQL verification remains. |
| PROC-AUTH-01 | Procurement routes lacked authentication and trusted caller identity; receipt lacked per-line quantities in the schema. | CODE CHANGED; DB ACCEPTANCE UNVERIFIED (score 0) | Request/approval boundaries added; fake receipt now returns authenticated HTTP 501; no DB gate passed. |
| FIN-PRECISION-01 | Purchase request/PO monetary columns use `Float`; broader finance calculations include JavaScript number arithmetic. | OPEN | Prisma schema and financial services require full precision audit. |

## Environment and verification limits

- Ground-truth correction: the RLS migration applies cleanly to an empty database and configures 23 tables. Its defects are incomplete tenant-policy coverage and NULL-context fail-open behavior, not migration ordering. This correction was supplied by the repository owner; no database run or transcript was produced in this execution.
- No PostgreSQL integration database was available during this execution; Docker Desktop engine access was denied. RLS policy behavior, role grants, finance transactions and tenant-isolation behavior were not tested here.
- Fresh focused security suite run on 2026-11-01 passed 6 files and 21 tests. Fresh backend type check passed with TypeScript 5.9.3. Backend build, Prisma validation and ERP Admin type check passed during earlier work. Full backend lint still fails with repository-wide violations.
- Hosted CI, Playwright, backup/restore, and production deployment were not run.

See `VERIFIED_ISSUE_REGISTER.md`, `TEST_EVIDENCE.md`, and `BLOCKER_REGISTER.md` for current statuses.
