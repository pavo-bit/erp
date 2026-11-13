# Documentation Audit — SSVM ERP

Audit date: 2026-11-13. Scope: root + `docs/` + per-app instruction files on `main` (`b311415`), cross-checked against executable sources (package.json, CI workflows, compose, code). The authoritative, up-to-date documentation lives in `lane/d-portals` and will land on `main` via the merge plan (`docs/MERGE_PLAN.md`).

## Verified correct (keep)

- `docs/ARCHITECTURE.md` — component list, request flow, tenant isolation caveats match code (`app.ts`, `school-context.middleware.ts`, Prisma extension).
- `docs/KNOWN_LIMITATIONS.md` — backend lint 567 violations matches `eslint` output; CI not run; no default creds; RLS unverified. Accurate.
- `docs/TESTING_MASTER_PLAN.md` — test DB guard, truncation, mock list match `src/tests/setup.ts` and `vitest.config.ts`.
- `docs/BUILD_AND_TEST_REPORT.md` — matches CI config and observed results.
- `docs/CLEAN_INSTALLATION_GUIDE.md` — prerequisites accurate (Node, env files, `DATABASE_URL_TEST` with `test` in name, demo seed opt-in, `npm ci` per app).
- `docs/TECHNICAL_DECISIONS.md` / `docs/REMEDIATION_DECISIONS.md` — decisions traceable to code (CSRF before auth, fail-closed payments, etc.).
- Sub-portal `AGENTS.md` (Next.js 16 breaking-changes notice) — matches installed Next 16.2.x.
- `.github/workflows/ci.yml` — matches documented portal list and backend commands.

## Stale / incorrect (fixed or to fix)

1. `README.md` (main) — claimed `admin@ssvm-cuttack.org / admin123` defaults in `start.sh`/`start.bat`/`start-docker` flows; contradicts clean-install guide. **Fixed**: README now states no default creds and bootstrap requirements. `start*.bat/sh` still print stale creds — update or delete those scripts (they also reference a non-existent `ssvm-platform` frontend).
2. `README.md` (main) — "Frontend: http://localhost:3000" is misleading; seven portals run on different ports. **Fixed**: replaced with per-portal port list.
3. `run-without-docker.sh` / `run-without-docker.bat` — reference non-existent `ssvm-platform` directory and stale creds. **Action**: delete or rewrite; do not use for onboarding.
4. `.github/workflows/deploy.yml` — `node-version: 18` while CI and Docker use 20. **Fixed**: changed to 20.
5. `.gitignore` — `prisma/migrations/` only matches a root-level path, so `ssvm-backend/prisma/migrations/` is tracked (intentional but undocumented). Noted in `AGENTS.md`. Either anchor the rule (`/prisma/migrations/` at root only, which is current) or document; no code change needed.
6. `docs/README.md`-style cross refs — `README.md` points to `SSVM-PROJECT-DOCUMENTATION.md` which is not present in the tree on `main`. Verify on merge; d-portals has a fuller `docs/README.md`.
7. `docs/PHASE_*` / `docs/IMPLEMENTATION_MASTER_TRACKER.md` — claim completion percentages; `RELEASE_CRITERIA.md` says release BLOCKED. Reconcile wording to avoid overstating readiness. Defer to d-portals' updated docs on merge.
8. `docs/ARCHITECTURE.md` says "Seven Next.js applications" — correct count, but ports/roles list should match `docker-compose.yml` (student portal maps host 3003 → container 3000). Documented in `AGENTS.md`.
9. `ssvm-backend/.env.example` — uses pgbouncer URL (`pgbouncer:6432`) and `database:5432` hostnames that only resolve inside compose; local dev must override. `CLEAN_INSTALLATION_GUIDE` covers this but example could add a local override comment. Low priority.
10. `docs/E2E_EXECUTION_REPORT.md` / `FINANCIAL_INTEGRITY_TEST_REPORT.md` / `TENANT_ISOLATION_TEST_REPORT.md` — one-line reports claiming status; verify against `BUILD_AND_TEST_REPORT.md` (E2E not run). Treat as unverified.

## Missing / to add (deferred to d-portals merge)

- `docs/MODULES_AND_PORTALS.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/DEPLOYMENT_AND_OPERATIONS.md`, `docs/DEVELOPMENT_AND_TESTING.md`, `docs/PRODUCT_SCOPE.md`, `docs/SHARED_DATA_ENTRY_STANDARD.md`, `docs/SECURITY_AND_TENANCY.md` — present in d-portals, absent on main. Will arrive on merge.
- Per-module acceptance matrices under `docs/admissions/*` — present in d-portals only.
- `AGENTS.md` at root — created on main (this audit's companion) and will be superseded/enriched by d-portals' version if any (d-portals diff shows `AGENTS.md` +141 lines, so it adds content; reconcile on merge).

## Verification performed

- Confirmed `ssvm-backend/package.json` scripts match documented commands.
- Confirmed portal `package.json` dev ports match `AGENTS.md` table.
- Confirmed `docker-compose.yml` external network requirement.
- Confirmed test DB guard in `src/tests/setup.ts`.
- Confirmed Next.js version 16.2.6 in portal manifests.
- Confirmed no root `package.json` / workspaces.

## Action items

- [x] Fix README creds and URLs.
- [x] Fix deploy.yml Node version.
- [x] Create root AGENTS.md.
- [x] Create MERGE_PLAN.md.
- [ ] Rewrite or delete `run-without-docker.*` and stale `start.*` scripts.
- [ ] Reconcile PHASE_* completion wording with RELEASE_CRITERIA on merge.
- [ ] Execute merge plan (separate task; requires DB + CI).