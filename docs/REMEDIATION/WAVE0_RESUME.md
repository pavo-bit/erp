# Wave 0 Resume Note

## Status: INCOMPLETE — do not merge

The earlier `PASSED` status in this file was unsupported and is withdrawn. No PR #2 per-job CI result is currently available from this worktree; `gh` cannot reach `api.github.com`. The W0 branch has not passed the newly requested probe/code-task gate.

## Evidence currently found (not bound to this W0 commit)

Untracked logs in the main `remediation/80pct` worktree report:

- `test-run-heavy-normal.txt`: 25 files, 173 tests passed. The transcript does not record an exit code or identify the exact W0 commit.
- `test-run-heavy-shuffled.txt`: 10 files failed, 15 passed; 1 failed test, 81 passed, 91 skipped. Failures include a messaging order assertion and fixture/setup errors, including a restricted-role permission error when terminating a backend process.

These logs are not Wave 0 gate evidence: they were produced in the dirty main worktree, not on a clean W0 checkout, and the shuffled run fails. Do not use them to claim 173/173 twice.

## Required gates still open

1. **RLS probe:** No recorded scratch-database clone/probe that seeds `school` and `fee_category` as postgres, then proves `ssvm_app` gets zero fee-category rows with no tenant context. No API response currently records `current_user=ssvm_app`. A role/policy-count query alone does not prove fail-closed behavior.
2. **CI roles:** No PR #2 backend-test log is available here showing both restricted app and trusted fixture roles, `current_user`, and policy count. CI workflow ownership remains with Lane E; a written request is needed for any workflow changes.
3. **Code tasks:** Student login/user creation and two-school test; `flattenWhere` unique/relation filters; CSRF comment plus cross-origin refresh test; coverage thresholds; and Vitest/TypeScript excludes require separate commits and passing tests. Their status must be verified from the W0 branch, not inferred from uncommitted files in the main worktree. Student backfill requires a written request to Lane A.
4. **Suite runs:** Required commands are one default parallel run (no `--no-file-parallelism`) and one shuffled run. Both need exit code 0, with file/test passed, failed, and skipped counts captured. Current shuffled evidence is failing.
5. **PR #2:** Per-job results are unavailable. `gh pr view 2` failed because this host could not resolve `api.github.com`.

## Environment blockers

- `ssvm-backend/node_modules` is available in the main worktree but is a junction; its presence does not provide a database or service.
- `.env.test` in the main worktree contains test database/Redis connection variables, but no values are recorded here. The configured PostgreSQL port is 5433 and Redis port is 6379; both were unreachable on this host.
- Environment variables `DATABASE_URL_TEST`, `DATABASE_URL_TEST_FIXTURE`, and `REDIS_URL_TEST` were not exported in the current shell.
- Never fall back to the developer DB or run tests as `postgres`. The requested postgres seed step must be separate setup; the actual RLS assertion must connect as the restricted app role.

## Resume criteria

Resume after a reachable isolated PostgreSQL template/scratch database and Redis are available, CI access for PR #2 works, and Lane E has accepted any workflow request. Keep the backend suite blocked until the probe, API current-user assertion, code tasks, and both fresh suite runs pass with exit codes and counts. Do not merge or claim points before then.
