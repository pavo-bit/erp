# Lane A request to Lane B — trusted payment webhook database path

**Requested owner:** Lane B (finance/payments)  
**Requested by:** Lane A (DB spine)  
**Status:** OPEN — A is authoring the shared trusted client API.

When the provider webhook handler is processed, use Lane A's exported
`getTrustedPrisma()` (or a scoped trusted transaction helper if A publishes one)
for tenant discovery / provider event lookup before a school context is known. Do
not instantiate a new Prisma client in B and do not add a fallback to the application
database URL. After the verified provider event yields a school and target payment,
perform business writes in the callback of
`runAuthenticatedTenantRequest({ schoolId, callback })` where possible; keep
verification, idempotency, transaction state, and ledger posting atomic as Lane B's
own requirements dictate. Record actor `SYSTEM:WEBHOOK`, provider event ID, request
ID, and outcome through the audited path; do not create an unaudited super-admin
bypass. Coordinate exact API names with A before integration.

**Files requested:** B-owned webhook/payment routes and services, tests. A retains
ownership of shared client/context files and schema/migrations.  
**Gate:** real PostgreSQL webhook tests, signature/idempotency tests, tenant scoping,
atomic ledger post; evidence JSON before requesting merge.
