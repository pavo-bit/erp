# Lane A request to Lane B — trusted payment webhook database path

**Requested owner:** Lane B (finance/payments)  
**Requested by:** Lane A (DB spine)  
**Status:** API published in Lane A commit `d30a169`; B integration and real DB tests remain OPEN.

When the provider webhook handler is processed, use Lane A's exported
`getTrustedPrisma()` or `runWithTrustedDatabaseTransaction()`
for tenant discovery / provider event lookup before a school context is known. Do
not instantiate a new Prisma client in B and do not add a fallback to the application
database URL. After the verified provider event yields a school and target payment,
perform business writes in the callback of
`runWithTenantDatabaseTransaction(schoolId, callback)`; keep
verification, idempotency, transaction state, and ledger posting atomic as Lane B's
own requirements dictate. Record actor `SYSTEM:WEBHOOK`, provider event ID, request
ID, and outcome through the audited path; do not create an unaudited super-admin
bypass. The helpers and default `prisma` are exported from `src/lib/prisma.ts`;
their callbacks take no transaction argument and must use the imported default
`prisma` facade, which routes calls to the active transaction. Raw JSON bytes are
exposed as `req.rawBody?: Buffer` for provider signature verification.

**Files requested:** B-owned webhook/payment routes and services, tests. A retains
ownership of shared client/context files and schema/migrations.  
**Gate:** real PostgreSQL webhook tests, signature/idempotency tests, tenant scoping,
atomic ledger post; evidence JSON before requesting merge.
