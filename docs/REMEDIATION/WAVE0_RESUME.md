# Wave 0 resume note

## Status

The heavy-job semaphore utility is authored in `scripts/heavy.ps1`. It defaults to
4 concurrent jobs on the reported 16-core machine and accepts `-Limit`, `-Command`,
and `-ArgumentList`. Utility smoke checks passed: a child exiting 0 propagated exit
0, a child exiting 7 propagated exit 7, and a subsequent process reacquired the
same named semaphore. `git diff --check` passed.

The Wave 0 backend suite gate is **BLOCKED**, not passed. No fresh Vitest run was
started from this worktree. `DATABASE_URL_TEST`, `DATABASE_URL_TEST_FIXTURE`, and
`REDIS_URL_TEST` are unset; localhost PostgreSQL/Redis ports 5432/6379 are
unreachable; and this worktree has no `ssvm-backend/node_modules`. Existing
`test-run-*.txt` output is not a Wave 0 gate because it does not bind an exit code
to the tested process. In particular, `test-run-2.txt` displays 25 files and 173
tests passing, but the transcript alone is not re-runnable exit-code evidence.

## Required to resume

1. Install backend dependencies in this worktree using the committed lockfile.
2. Provision an isolated **test-only** PostgreSQL database named
   `ssvm_test_wave0` and isolated Redis endpoint/database/port. PostgreSQL tuning
   (`fsync=off`, `synchronous_commit=off`, `full_page_writes=off`,
   `max_connections=300`) may be used only on that test instance.
3. Set `DATABASE_URL_TEST` to an app role with `NOSUPERUSER` and `NOBYPASSRLS`;
   set `DATABASE_URL_TEST_FIXTURE` to the distinct trusted fixture role, used only
   by test fixture helpers; and set `REDIS_URL_TEST` to the isolated Redis service.
   Do not use `postgres` or any shared/developer/production service.
4. From `ssvm-backend/`, invoke the full suite through the semaphore utility, for
   example:

   ```powershell
   ..\scripts\heavy.ps1 -Command npm -ArgumentList @('run', 'test:ci')
   ```

5. Record the process exit code and Vitest passed/failed/skipped counts. The Wave 0
   gate is not met until the suite is green on the exact commit in both ordinary
   and shuffled runs and the required factory smoke test is green.

No database connection string, credential, or secret is recorded in this note.
