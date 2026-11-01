# Wave 0 Evidence and Resume Note

## Status: INCOMPLETE — RLS probe FAILED; do not merge

The earlier `PASSED` statement in this file was inaccurate. This note replaces it. A test-only scratch-database probe found a visible tenant row when the app role had no tenant context. The new API-current-user test is authored but not run.

## RLS probe (real test-only Postgres)

Configuration was read from the main worktree's `.env.test` without printing URLs or passwords. URL preflight showed app role `ssvm_app` and fixture role `ssvm_fixture`, both pointing to localhost port 5433 and a DB name containing `test`; Redis URL used localhost port 6379. Live read-only role query against that configured DB returned:

```json
[
  {"source":"DATABASE_URL_TEST","configured":true,"currentUser":"ssvm_app","databaseName":"ssvm_test","isSuperuser":false,"bypassRls":false,"policyCount":174},
  {"source":"DATABASE_URL_TEST_FIXTURE","configured":true,"currentUser":"ssvm_fixture","databaseName":"ssvm_test","isSuperuser":false,"bypassRls":true,"policyCount":174}
]
```

The source database `ssvm_test` was not modified by the probe. The fixture connection was not used for the app-role read.

Scratch probe steps and results:

1. `docker exec ssvm-database psql -U postgres -d postgres -Atc "SELECT current_user, EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ssvm_test_template') AS template_exists, EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ssvm_test') AS app_test_db_exists;"` returned `postgres|t|t`.
2. `docker exec ssvm-database createdb -U postgres --template=ssvm_test_template ssvm_test_w0_probe_f4bc3a8e` succeeded (exit 0).
3. As postgres, inserted one school and one fee_category in a transaction. Output: `BEGIN`, `INSERT 0 1`, `INSERT 0 1`, `COMMIT`.
4. As `ssvm_app`, with no tenant setting, queried current role, db, tenant setting, role flags, visible fee categories, and policy count. Result:

```json
{"currentUser":"ssvm_app","databaseName":"ssvm_test_w0_probe_f4bc3a8e","tenantSetting":null,"isSuperuser":false,"bypassRls":false,"visibleFeeCategories":1,"policyCount":174}
```

Expected `visibleFeeCategories=0`; actual was `1` (**FAIL**).
5. As postgres, `fee_categories` catalog state in both `ssvm_test_template` and the scratch clone was `relrowsecurity=false`, `relforcerowsecurity=true`, with one policy. Policies existing in `pg_policy` do not prove RLS is enabled. Lane A must diagnose the migration/template state. After the evidence/request was committed, only `ssvm_test_w0_probe_f4bc3a8e` was dropped. The exact database name was re-queried before `dropdb`; a post-drop query returned count `0`. The template and source test DB were left intact.

This also explains how the earlier 173-test run could pass without an authenticated tenant wrapper: the test template had 174 policy records, but RLS was disabled on `fee_categories`, so the restricted app query could still see the seeded row. The separate API identity test will assert the request's DB user, but it cannot turn the failed RLS probe into a pass.

## Test transcript reconciliation

The main worktree's untracked logs are not bound to this clean W0 commit and do not record command exit codes:

- `test-run-heavy-normal.txt`: 25 files, 173 tests passed. Not accepted as Wave 0 gate evidence because the commit and process exit code are absent.
- `test-run-heavy-shuffled.txt`: 10 files failed, 15 passed; 1 test failed, 81 passed, 91 skipped. Not accepted; shuffled gate is **FAIL**.

The Wave 0 normal run must use Vitest's default parallel behavior, with no `--no-file-parallelism`; the shuffled run must also have a recorded command, exit code, file and test counts, and zero skips. Neither current log meets both requirements.

## Remaining Wave 0 work

- Add a backend API test returning `current_user=ssvm_app`, role flags, and policy count. The test has been authored at `src/tests/api/current-user.test.ts`; it has not run.
- CI role/policy logging, coverage thresholds, and config excludes are requested from Lane E in `docs/AUDIT/requests/W0-to-E.md`; no response/CI result yet.
- Student login must not create users. Existing Student→User backfill and user creation semantics are requested from Lane A in `docs/AUDIT/requests/W0-to-A.md`.
- A owns `src/lib/prisma.ts`; flattenWhere compound-unique/relation-filter changes are requested there, not implemented in Wave 0 pending owner response.
- CSRF refresh comment/cross-origin test remains open pending Lane C ownership review; request recorded in `docs/AUDIT/requests/W0-to-C.md`.
- PR #2 CI per-job results remain unavailable: `gh pr view 2` failed DNS resolution for `api.github.com`. Do not claim CI results without the run/job links.

## Environment

Local dependency binaries exist via a node_modules junction, and elevated reachability checks confirmed the test-only Postgres port 5433 and Redis port 6379. Do not use ports 5432 or 5434. The W0 worktree's own `.env.test` has only a DATABASE_URL_TEST with an unexpected role, and lacks fixture/Redis URLs; the main worktree has separate checked app/fixture URLs. Do not copy its secrets into W0. Tests require the restricted app role; postgres is only allowed for scratch DB creation/seeding.

## Resume criteria

Resume after Lane A has fixed RLS enablement and the scratch probe returns zero rows; Lane E has configured the backend job with restricted/trusted roles and log diagnostics; student backfill/API and Prisma owner requests are resolved; the CSRF and coverage/exclude tasks are complete; and full parallel plus shuffled suites pass with process exit codes and zero failed/skipped tests. PR #2 jobs must then be reviewed individually. No merge or score credit before these gates pass.
