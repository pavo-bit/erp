# Lane E request to Lane A — side-effect-free app factory contract

**Requested owner:** Lane A (DB spine)  
**Requested by:** Lane E (CI/test infrastructure)  
**Status:** ACCEPTED; implementation is a separate A-owned task.

Lane E requests an exported, side-effect-free `createApp()` for test and
integration use. Accept the contract with these boundaries:

- `src/app.ts` exports `createApp()` which creates and configures the Express app
  and returns it without binding a socket, starting queue workers/schedulers,
  opening listeners, or executing a migration/seed.
- `src/index.ts` is the sole production entry point that starts Redis-backed
  queues/schedulers and listens on the configured port. Startup side effects are
  invoked once and only after configuration validation succeeds.
- Tests may call `createApp()` repeatedly without starting background services or
  needing to close an HTTP listener. Test app construction must not weaken
  authentication, tenant transactions, RLS, or route middleware.
- Lane E may stack its test-infrastructure branch on Lane A's verified DB/API
  code at `a8fc539` (or later A descendant), plus A's evidence-only commit
  `b35abf2`, to run isolated clean PostgreSQL tests with the shared Prisma API.
  It must preserve both app-role (`NOSUPERUSER/NOBYPASSRLS`) and separate trusted
  (`NOSUPERUSER/BYPASSRLS`) connections and the `TRUSTED_DATABASE_URL` requirement.
- `test:rls` remains a distinct real-PostgreSQL job. Do not move the RLS migration
  or RLS-dependent tests into the default/main backend test chain until every
  authenticated API module that queries tenant data has coverage through the real
  auth middleware and tenant request wrapper. Current passing authenticated
  endpoint coverage (2 tests) does not meet that all-module condition.

Lane A retains `src/app.ts`, `src/index.ts`, shared Prisma/context paths, schema,
migrations, and authenticated DB tests. E retains workflows, Vitest config/common
test harness/scripts, and must make a written request for any A-owned change it
needs. No merge/evidence claim is implied by this acceptance; the full CI run is
currently red outside the dedicated A PostgreSQL gate.
