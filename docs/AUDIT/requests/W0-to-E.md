# Wave 0 request to Lane E

**Status:** OPEN — workflow/config ownership is Lane E.

Please update the backend-test setup/job so it uses:

- `DATABASE_URL_TEST` for `ssvm_app` (`NOSUPERUSER`, `NOBYPASSRLS`), asserted at startup.
- `DATABASE_URL_TEST_FIXTURE` for a distinct `ssvm_fixture` role (`NOSUPERUSER`; any BYPASSRLS permission is restricted to fixture helpers).
- Redis URL for the isolated test Redis instance.

Add an explicit, secret-free backend-test log line from the app-role connection showing `current_user`, `rolsuper`, `rolbypassrls`, and `pg_policy` count. The current W0 checkout's `.env.test` has only a database URL and no fixture or Redis URL; do not use postgres as the app/test role. Do not print connection URLs/passwords.

Please also own the coverage-config work: ratchet finance/auth/tenant modules to at least 80% without lowering existing thresholds; configure Vitest and TypeScript excludes for `dist/` and the legacy `tests/` tree only after comparing both test trees and preserving/migrating unique stronger tests. Keep all tests that remain in the required suite; do not make `skip`/exclude the mechanism for deleting failing coverage.

**Evidence requested:** fresh backend-test CI job link and log with identity/policy counts; exact coverage summary; explicit counts before/after tree consolidation and `vitest`/`tsc` commands.
