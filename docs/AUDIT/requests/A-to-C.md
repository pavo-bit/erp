# Lane A request to Lane C — trusted auth and worker database paths

**Requested owner:** Lane C (authz/ops)  
**Requested by:** Lane A (DB spine)  
**Status:** API published in Lane A commit `d30a169`; C integration and real DB tests remain OPEN.

Use Lane A's `getTrustedPrisma()` or `runWithTrustedDatabaseTransaction()`
for pre-auth identity/session operations where the tenant is not known yet: login,
refresh, password recovery, and other credential/bootstrap paths. Never instantiate
another Prisma client or fall back to `DATABASE_URL` for this work. After a verified
school identity is established, authenticated middleware must call
`runAuthenticatedTenantRequest(req, res, next, verifiedUser)` exactly once. The
verified user shape is `{ id, schoolId, role, impersonated?, originalUserId? }`.
The wrapper calls `next()` inside the transaction, sets `app.current_school_id` as
the first SQL statement, and holds the transaction through response `finish` or
`close`. It uses tenant scope for assigned users and audited trusted scope for
`SUPER_ADMIN`; errors go to `next(error)` before headers and destroy an already
started response if the transaction fails. Do not independently open a second
request transaction.

Background workers and schedulers that process cross-tenant queues must use the
dedicated trusted client for tenant discovery, then run tenant-specific work in
`runWithTenantDatabaseTransaction(schoolId, callback)`. Use
`runWithTrustedDatabaseTransaction({ purpose, requestId, actorUserId, route,
reason }, callback)` for global work; purpose must be `authentication`,
`payment_webhook`, `worker`, or `super_admin`. The helper requires actor and reason
for super-admin, initializes the tenant setting to empty, and atomically writes a
`TRUSTED_DATABASE_ACCESS` audit before invoking the callback. Both callbacks take
no arguments and use default `prisma` from `src/lib/prisma.ts`. `getTrustedPrisma()`
requires `TRUSTED_DATABASE_URL` and has no app URL fallback. Do not use
`runAsSuperAdmin` as a database privilege mechanism.

**Files requested:** C-owned auth/token/session middleware and worker/runtime files,
tests. A retains ownership of shared client/context files and schema/migrations.  
**Gate:** authenticated API and worker tests against real PostgreSQL with missing or
wrong tenant denied; app role asserts NOSUPERUSER/NOBYPASSRLS and trusted role
asserts distinct NOSUPERUSER/BYPASSRLS. RLS remains out of the main test job until
authenticated API tests pass; evidence JSON before requesting merge.
