# Lane E Wave 0 authoring evidence

Status: **UNVERIFIED**. This is a draft in the Lane E worktree and has not been
committed or run in hosted CI.

## Authored checks

- `test:ci` provisions one NOSUPERUSER/NOBYPASSRLS application role and a
  distinct NOSUPERUSER/BYPASSRLS trusted fixture role per lane. The test setup
  asserts both roles and their common worker database before running fixtures.
- Backend matrix logs `current_user`, role flags, and the `public.pg_policy`
  count. The ordinary backend database is expected to have zero RLS policies;
  the dedicated RLS job remains separate.
- Backend workers clone unique databases from a fresh, lane-specific, non-RLS
  schema template. Missing admin credentials, a missing/invalid template, or
  provisioning errors fail the run; there is no base-database fallback.
- The dedicated RLS job validates the classification inventory and every
  classified table's existence, enabled/forced RLS flags, and fail-closed
  policy expressions before making a fresh template and test clone. It logs
  each table's policies. The existing real PostgreSQL `test:rls` suite remains
  the behavioral gate for missing-tenant denial and cross-tenant read/write
  isolation.
- Test fixture creation uses the trusted fixture client. Vitest excludes the
  root legacy `tests/` tree and `dist/`; TypeScript explicitly excludes those
  paths while keeping active `src/tests` type-checked.
- Finance, authentication, and tenant critical modules have per-file coverage
  thresholds of 80% lines, functions, and branches.

## Checks run

- `node --check ssvm-backend/scripts/prepare-rls-test-template.cjs` — PASS.
- `node --check ssvm-backend/scripts/prepare-worker-test-template.cjs` — PASS.
- Node JSON parsing for `ssvm-backend/tsconfig.json` and
  `docs/DATABASE/TENANT_CLASSIFICATION.json` — PASS.
- `git diff --check` — PASS.

## Gates not run

- PostgreSQL/Redis template and per-worker provisioning — UNVERIFIED; isolated
  local database services were not provisioned for this draft.
- Vitest, lint, coverage, and TypeScript checks — UNVERIFIED; `ssvm-backend/node_modules`
  and a local TypeScript executable are absent. Dependency installation was
  not attempted.
- Workflow YAML validation and hosted CI — UNVERIFIED; no local YAML parser was
  identified and no hosted run for this draft is available.
