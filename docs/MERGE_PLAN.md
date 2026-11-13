# Merge Plan — SSVM ERP (Lead Dev Integration)

Status: Planning document. No merges executed yet. All verification commands assume a clean checkout and an isolated test DB.

## 1. Branch topology (verified)

Common base: `main` = `b311415` (docs: sync technical decisions).

| Branch | Tip | Contains main? | Contains a? | Contains b? | Role |
|---|---|---|---|---|---|
| `lane/a-db-spine` | `6459943` | yes | self | no | DB spine, tenant RLS, money/decimal, auth user linking |
| `lane/b-finance` | `819d6a3` | yes | no | self | Payment integrity, ledger, reconciliation, goods receipt |
| `lane/b2-followups` | `cd8a606` | yes | ? | ? | Finance follow-ups |
| `lane/c-authz-ops` | `f7fd0d3` | yes | yes | no | Invitation flow, password setup tokens, authz DB tests |
| `lane/d-portals` | `97f2c9c` | yes | yes | yes | **Integration baseline**: admissions, library, SHFI, transport, bulk import, cashier, +a+b+b2 |
| `lane/e-ci` | `98b114a` | yes | no | partial | CI ratchets, receipt uniqueness, finance gates B1-B8 |
| `lane/e-ci-2` | `c72fb7a` | yes | no | no | CI part 2: lint ratchet, world builder, hygiene, docs |
| `remediation/wave-0` | `9ee4337` | yes | (ancestor of a) | no | Wave 0 hardening (already in a) |
| `remediation/lane-a-db-spine` | `fdc93fe` | yes | no (diverged) | no | Extra a-lane hardening + audit evidence |
| `remediation/lane-b-finance` | `77617c6` | yes | no | no (diverged) | Extra b-lane hosted DB results |
| `remediation/lane-c-authz-ops` | `8fae999` | yes | yes | no | Extra c-lane auth hardening (HS256, trusted/tenant DB, duplicate emails, ops secrets) |
| `remediation/lane-d-portals` | `b84e317` | yes | yes | yes | d-lane audit evidence snapshot |
| `remediation/lane-e-ci` | `9376038` | yes | no | partial | e-lane audit snapshot |
| `remediation/80pct` | `37db7b8` | yes | (merge PR #3) | no | 80% remediation wave base |

Key facts:
- `lane/d-portals` is the only branch that already integrates a + b + b2 + all feature modules. Use it as the integration baseline.
- `lane/c-authz-ops`, `lane/e-ci`, `lane/e-ci-2` are NOT ancestors of d-portals and must be merged.
- `remediation/lane-c-authz-ops` contains strictly more auth hardening than `lane/c-authz-ops` (HS256 rejection, trusted/tenant DB routing, duplicate-email rejection, secrets/metrics restriction) and should be preferred over the plain lane branch.
- `remediation/lane-a-db-spine` contains extra hardening (`821201f` flatten compound unique selectors, `92de1a6` tenant/trusted transaction contexts) not in `lane/a-db-spine`.
- `remediation/wave-0` is already an ancestor of `lane/a-db-spine` — no separate merge needed.

## 2. Recommended merge order (into a new integration branch off d-portals)

Create `integration/full-erp` from `origin/lane/d-portals` (`97f2c9c`). Then merge in this order, resolving conflicts per section 3.

1. `git checkout -b integration/full-erp origin/lane/d-portals`
2. Merge `origin/remediation/lane-a-db-spine` (cherry-pick only unique code commits; see 3.1). Prefer merge with `--no-ff` then resolve.
3. Merge `origin/remediation/lane-c-authz-ops` (preferred over `lane/c-authz-ops`).
4. Merge `origin/lane/e-ci`.
5. Merge `origin/lane/e-ci-2`.
6. Merge `origin/remediation/lane-b-finance` (audit evidence + hosted DB results; code delta small).
7. Merge `origin/remediation/lane-d-portals` (audit evidence only — likely no code delta; verify with diff).
8. Merge `origin/remediation/lane-e-ci` (audit evidence only).

Do NOT merge `remediation/80pct` (it is an ancestor of the a-lane and adds nothing). Do NOT merge `lane/a-db-spine`, `lane/b-finance`, `lane/b2-followups` separately — already in d-portals.

## 3. Conflict hotspots and resolution rules

### 3.1 lane-a remediation (`remediation/lane-a-db-spine`)
Files: `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/generated/tenantClassification.ts`, `src/tests/*`.
- `821201f` (flatten only Prisma compound unique selectors) and `92de1a6` (tenant/trusted transaction contexts) are the only code-relevant deltas; everything else is docs/audit/ci.
- Resolution: keep d-portals' newer schema (which already added admissions/library/transport models) and apply the two code fixes if not already present. Check `git log` of the integration branch for equivalent commits before cherry-picking to avoid duplicates.

### 3.2 lane-c authz (`remediation/lane-c-authz-ops` over `lane/c-authz-ops`)
Files (from `lane/c`): `prisma/schema.prisma`, `prisma/migrations/20261101150000_*`, `20261101160000_password_setup_tokens`, `20261101170000_password_setup_token_functions`, `src/middleware/auth.ts`, `src/middleware/csrf.ts`, `src/routes/auth.ts`, `src/routes/users.ts`, `src/services/mail.service.ts`, `src/tests/api/invitations.test.ts`, `src/tests/security/lane-c-authz-db.test.ts`, `docs/DATABASE/TENANT_CLASSIFICATION.json`, `src/generated/tenantClassification.ts`.
Plus remediation extras: `src/lib/authPrisma.ts`, `src/lib/trustedPrisma.ts`, `src/services/*` trusted/tenant routing, `src/middleware/*`.
- Conflict risk: HIGH on `schema.prisma`, `auth.ts`, `csrf.ts`, `users.ts`, `middleware/auth.ts`, tenant classification/generated file.
- Resolution rules:
  - Schema: union of columns/migrations; keep both password-setup-token tables and generated tenant RLS migration. Run `npx prisma validate` + `npx prisma migrate deploy` on a fresh DB after.
  - Auth: keep remediation's HS256 rejection, duplicate-email rejection, student-account binding, two-factor DB work, trusted/tenant DB routing.
  - CSRF: keep remediation's cross-origin refresh cookie rejection.
  - Users: keep remediation's duplicate-email rejection + invitation endpoints + set-password.
  - Prefer remediation versions of `src/lib/authPrisma.ts` / `src/lib/trustedPrisma.ts` (new files; no conflict unless d-portals added them — check).
  - Regenerate `src/generated/tenantClassification.ts` via `scripts/generate-tenant-classification.cjs` rather than hand-merging.

### 3.3 lane-e CI (`lane/e-ci`)
Files: `.github/workflows/ci.yml`, `.gitignore`, `docs/AUDIT/*`, `docs/FINANCE/*`, `lint-baseline.json`, `ssvm-backend/coverage-ratchet.json`, `lint-baseline.json`, `package.json`, `prisma/migrations/20261104020000_receipt_unique_indexes`, `prisma/schema.prisma`, `scripts/check-lint-ratchet.cjs`, `scripts/test-upgrade-flow.ts`, `src/middleware/auth.ts`, `src/routes/finance-governance.ts`, `src/routes/invoices.ts`, `src/routes/payments.ts`, `src/routes/procurement.ts`, `src/services/BankReconciliationService.ts`, `src/services/ledger.service.ts`, plus tests.
- Conflict risk: HIGH on `payments.ts`, `ledger.service.ts`, `invoices.ts`, `procurement.ts`, `BankReconciliationService.ts`, `finance-governance.ts`, `auth middleware`, `schema.prisma`, `ci.yml`.
- Resolution rules:
  - Finance code: d-portals has the newer, more complete implementation (cash collection, receipts, SHFI, cashier routes). Keep d-portals' versions of `payments.ts`, `ledger.service.ts`, `invoices.ts`, `procurement.ts`, `BankReconciliationService.ts`, `finance-governance.ts` and apply e-ci's specific fixes only if not already present: receipt-uniqueness migration, receipt uniqueness precheck test, money-invariants test, late-fines rules, goods-receipt concurrency.
  - Auth middleware: keep remediation/c's hardened version (it supersedes e-ci's).
  - CI: union of both ci.yml changes; keep d-portals' portal coverage + e-ci's ratchets/evidence. Final ci.yml must include all 7 portals, lint ratchet, coverage thresholds, upgrade pre-check.
  - Schema: apply `20261104020000_receipt_unique_indexes` migration on top.
  - Tests: keep both sets; resolve import/path conflicts.

### 3.4 lane-e part 2 (`lane/e-ci-2`)
Files: `.gitattributes`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, ci.yml, deploy.yml, nightly.yml, README.md, docker-compose.e2e.yml, docs/AUDIT/CONSOLIDATED_AUDIT.*, docs/security/*, scripts/*, coverage-ratchet.json, lint-baseline.json, package.json, prisma/phase_12..., src/tests/helpers/world.ts, world-smoke test.
- Conflict risk: MEDIUM (mostly new files; ci.yml and README.md overlap).
- Resolution: accept new files (world builder, audit scripts, security allowlist). For ci.yml/deploy.yml/README.md, merge carefully — keep d-portals' deploy.yml Node 20 (already fixed on main).

### 3.5 remediation lane-b / lane-d / lane-e
- `remediation/lane-b-finance`: only hosted DB audit evidence + small fixes; diff against `lane/b-finance` before merging; likely docs-only.
- `remediation/lane-d-portals`: audit evidence snapshot; verify `git diff origin/lane/d-portals..origin/remediation/lane-d-portals` for code deltas before merging.
- `remediation/lane-e-ci`: audit snapshot; same check.

## 4. Pre-merge verification (run on integration branch before any merge to main)

Backend:
- `cd ssvm-backend && npm ci`
- `npx prisma validate`
- `npx prisma migrate deploy` (against isolated test DB)
- `npm run type-check`
- `npm run build`
- `npm run lint` (record baseline; expect violations but no new ones vs ratchet)
- `DATABASE_URL_TEST=... npm test` (full suite)
- `npx vitest run --config vitest.security.config.ts`
- `npx vitest run --config vitest.rls.config.ts`

Frontends (all seven):
- `npm ci && npm run build && npx tsc --noEmit`

E2E:
- `cd e2e-tests && npm ci && npx playwright test` (requires running stack)

Infra:
- `docker network create ssvm-network` (if missing)
- `docker compose up -d --build` then health checks on backend `/health` and portals.

## 5. Post-merge (to main) plan

- Fast-forward `main` to `integration/full-erp` only after all gates in section 4 pass and review.
- Tag the integration commit.
- Run CI on the PR; do not force-push main.
- Update docs: `KNOWN_LIMITATIONS.md`, `RELEASE_CRITERIA.md`, `BUILD_AND_TEST_REPORT.md` to reflect merged state (many "not run" items become runnable).

## 6. Rollback

- Keep `main` at `b311415` until integration branch is green.
- If a merge introduces regressions, revert the merge commit on the integration branch, not on main.
- Preserve `remediation/*` branches as audit evidence (do not delete).

## 7. Out of scope / deferred

- Git history rewrite for the removed `.env.backup` (requires owner authorization + credential rotation).
- Production deployment and live payment gateway verification (owner authorization required).
- Node version alignment in `deploy.yml` (done: 18 → 20 on main).