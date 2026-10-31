# Blocker Register

| ID | Blocker | Impact | Work possible locally | Exit condition |
|---|---|---|---|---|
| BLK-DB-01 | No isolated PostgreSQL test service available; Docker engine was unavailable in earlier checks. | Prevents RLS migration verification, transaction tests, tenant isolation and financial workflow tests. | Continue source-level safeguards, test design and local unit tests. | Provide isolated PostgreSQL and Redis; apply migrations; run cross-tenant and finance integration suites. |
| BLK-RLS-01 | Safe RLS rollout needs transaction-scoped context across Prisma operations while preserving interactive transactions. | Existing NULL policy is fail-open; changing policy alone would break application access. | Design/implement with a disposable PostgreSQL validation path before rollout. | Integration tests prove request, transaction, pool reuse and background-job isolation. |
| BLK-SECRETS-01 | Previously populated secrets may remain in Git history, clones and backups; owners control rotation. | Production credential safety cannot be confirmed. | Document affected categories without printing secret values. | Owner rotates DB/JWT/payment webhook secrets and reviews history/backups. |
| BLK-FIN-RULES-01 | Reconciliation matching, currency/rounding, close/reopen and approval segregation rules are not fully specified. | Do not invent financial policy or create ledger outcomes without approved rules. | Fail closed on placeholder operations; document schema/design gaps. | School finance owner approves invariants and workflows. |
| BLK-OPS-01 | No fresh environment/restore drill or hosted CI result. | Operational recovery and deployment readiness unverified. | Maintain runbook/checklist. | Authorized isolated infrastructure and restore evidence. |
