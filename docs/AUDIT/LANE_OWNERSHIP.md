# Remediation lane ownership

Lanes operate in separate Git worktrees and branches from the `remediation/80pct`
head captured at dispatch. Each lane writes its own evidence JSON to
`docs/AUDIT/evidence/<lane>.json` and may open a PR to `remediation/80pct` only when
its lane gate is green on CI. Integrate one lane at a time, rebase it onto the latest
target, rerun CI, and merge only after reviewing the exact evidence.

| Lane | Exclusive ownership | Dependencies / gate |
|---|---|---|
| A — DB spine | `ssvm-backend/prisma/**`; `ssvm-backend/src/lib/prisma.ts`; `ssvm-backend/src/middleware/school-context.middleware.ts`; request transaction composition in app middleware; tenant-specific DB integration tests and DB provisioning for A | First integration lane. Real PostgreSQL; non-superuser and `rolbypassrls=false` assertion. Authenticated API tenant tests must pass before RLS migration enters main test job. |
| B — Finance/payments | Payment/finance routes and services, finance API/unit tests, finance-specific docs. No Prisma schema, shared Prisma client, tenant middleware, workflows, or global test setup. | Rebase after A; real PostgreSQL payment/ledger gates using its own DB/Redis allocation. Schema additions require a written request to A. |
| C — Authz/ops | Authorization policy/middleware except A-owned tenant context; token/session/security hardening; runtime/infra/deploy configuration except E-owned CI workflows; security tests. | Rebase after A and B; authenticated API/security tests and operations checks. Tenant transaction requests go to A. |
| D — Portals/E2E | Seven portal trees and `e2e-tests/**`; portal-specific test/config files. No backend routes/schema, shared CI workflows, or shared backend test setup. | Rebase after A–C; builds and meaningful E2E against isolated lane services. |
| E — CI/test infrastructure | `.github/workflows/**`; backend Vitest configurations and common test harness/provisioning/scripts; audit combiner and evidence schema; `package.json` scripts only where test/audit tooling is concerned. | Coordinate shared setup changes through written requests. CI job must provision per-lane PostgreSQL/Redis and assert restricted role for RLS. Keep RLS separate pending A gate. |
| F — Lint cleanup | Backend ESLint findings and lint-only scripts/configuration. | Starts only after A–E are integrated. No lint-rule weakening; full lint gate must pass. |
| G — Independent auditor | Read-only clean clone; reruns required commands and audits evidence and lane claims. No code edits. | Last lane after all merges; may downgrade claims. |

## Collision protocol

Changes outside the lane's exclusive paths are rejected from that lane's branch.
The requesting lane records a concise path/reason/test request in its PR and waits
for the path owner to accept or decline it. Lane A owns all schema and tenant
transaction changes; other lanes must not work around those boundaries.

## Service allocation

Every lane uses its own database named `ssvm_test_<lane>`, Redis DB index, and ports.
Credentials are run-scoped CI secrets or generated values and must never be printed
or committed. No lane may point destructive fixtures at a developer or shared DB.
