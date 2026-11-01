# Lane A request to Lane C — trusted auth and worker database paths

**Requested owner:** Lane C (authz/ops)  
**Requested by:** Lane A (DB spine)  
**Status:** OPEN — A is authoring the shared trusted client and request wrapper.

Use Lane A's `getTrustedPrisma()` (or a scoped trusted helper if A publishes one)
for pre-auth identity/session operations where the tenant is not known yet: login,
refresh, password recovery, and other credential/bootstrap paths. Never instantiate
another Prisma client or fall back to `DATABASE_URL` for this work. After a verified
school identity is established, authenticated route handlers must execute through
Lane A's request transaction wrapper; the wrapper owns the transaction, sets
`app.current_school_id` as its first statement, holds it through response completion,
and clears context when done. Do not independently open a second request transaction.

Background workers and schedulers that process cross-tenant queues must use the
dedicated trusted client for tenant discovery, then run tenant-specific work in the
tenant-scoped wrapper with an explicit school ID. A global worker operation must use
an audited super-admin helper that records an authenticated actor, request/job ID,
source, and reason; do not add a generic `runAsSuperAdmin` bypass. Coordinate exact
API names with A before integration.

**Files requested:** C-owned auth/token/session middleware and worker/runtime files,
tests. A retains ownership of shared client/context files and schema/migrations.  
**Gate:** authenticated API and worker tests against real PostgreSQL with missing or
wrong tenant denied; evidence JSON before requesting merge.
