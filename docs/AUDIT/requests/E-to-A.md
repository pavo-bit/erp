# Lane E request to Lane A — test application and fixture API

**Requested owner:** Lane A (DB spine)  
**Requested by:** Lane E (CI/test infrastructure)  
**Status:** OPEN

Lane E is stabilizing the shared backend test harness. Please provide or approve
the following A-owned contracts so tests exercise the real application without
starting production resources during import:

1. Export a side-effect-free `createApp()` (or equivalent) for test imports.
   Importing the app must not call `listen()`, start queues/workers, or schedule
   cleanup jobs; production startup remains owned by `src/index.ts`.
2. Confirm whether Lane E should rebase/stack its harness branch onto the tested
   Lane A migration/API head. The harness requires a clean test schema and two
   explicit connections: restricted app `DATABASE_URL_TEST` and trusted fixture
   `DATABASE_URL_TEST_FIXTURE`. The latter is used only by `src/tests/helpers/world.ts`.
3. Confirm the supported fixture/trusted transaction API for creating isolated
   school worlds without running tenant fixtures through the app-role client.

The default test job will continue to keep the RLS migration separate until the
authenticated-API coverage required by S2 is complete. No test result will be
claimed from mocks as DB evidence.

**Gate:** Lane A response recorded here; clean CI PostgreSQL test setup using the
asserted restricted role; app imports remain side-effect-free; fixture writes use
only the explicit trusted fixture URL.
