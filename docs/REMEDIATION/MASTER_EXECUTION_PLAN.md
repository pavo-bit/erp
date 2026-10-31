# Master Execution Plan

## Active order

| Phase | Scope | Status | Gate |
|---|---|---|---|
| 0 | Baseline, inventories, verified issue register | IN PROGRESS | Route/model classifications and baseline docs complete; DB baseline still blocked. |
| 1 | Authentication, authorization, transaction-safe tenant context, RLS | BLOCKING | RLS must fail closed, runtime role reviewed, cross-tenant PostgreSQL tests pass. |
| 2 | Payments, ledger, reconciliation, close and money precision | IN PROGRESS | DB transaction and financial invariant tests pass. |
| 3 | CRM, inventory, procurement, documents and governance workflows | IN PROGRESS | Positive, negative and cross-tenant workflow tests pass. |
| 4 | Seven-portal API and acceptance matrix | NOT STARTED | Portal-by-portal flows verified, not just compiled. |
| 5 | Integration, E2E, lint, CI quality gates | IN PROGRESS | Required backend/frontend/database/E2E checks pass in CI. |
| 6 | Operations, deployment, monitoring and recovery | NOT STARTED | Fresh install, migration, health, backup and isolated restore demonstrated. |

## Execution policy

Fix P0 security/integrity issues first. Do not mark route controls as complete without database ownership tests. Do not run destructive database tests without explicit isolated test URL. Do not deploy, push or rewrite history. See `VERIFIED_ISSUE_REGISTER.md` for issue-level status.
