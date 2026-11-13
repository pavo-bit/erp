# SSVM College Square — School Management Platform

ERP monorepo: an Express/Prisma/PostgreSQL backend (`ssvm-backend`) plus seven Next.js portals and Playwright E2E tests. **Status: under security/tenant/finance remediation; NOT production ready and NOT verified for real school data.** See `docs/KNOWN_LIMITATIONS.md`, `docs/RELEASE_CRITERIA.md`.

## Layout (no root package.json / workspaces — each app is independent)

- `ssvm-backend/` — Express 5 + Prisma 6 + PostgreSQL, BullMQ/Redis, Vitest. Entry `src/index.ts` → `src/app.ts`.
- Portals (Next.js 16.2, React 19): `erp-admin` (3005), `super-admin` (3003), `teacher-portal` (3004), `student-portal` (3000), `parent-portal` (3006), `payment-portal` (3007), `saas-frontend` (3000).
- `e2e-tests/` — Playwright, `baseURL` http://localhost:3005.
- `docs/` — architecture, remediation decisions, security matrix, testing plan.
- Each portal has its own `AGENTS.md` (Next.js 16 breaking-changes notice) and `CLAUDE.md` → `@AGENTS.md`.

## Toolchain

- Node 20 (CI uses 20; the `deploy.yml` Node 18 step is stale — use 20).
- TypeScript strict; backend is CommonJS (`"type": "commonjs"`); path alias `@/*` → `./src/*`.
- Backend `postinstall` runs `prisma generate`.

## Commands

Backend (run from `ssvm-backend/`):
- Install: `npm ci` (generates Prisma client)
- Dev: `npm run dev` (tsx watch `src/index.ts`)
- Build: `npm run build` (tsc) → `npm start` (node dist/index.js)
- Type check: `npm run type-check` (`tsc --noEmit`)
- Lint: `npm run lint` (eslint src/, `--max-warnings 0`) — currently ~567 violations; focused lint on changed files is the realistic gate
- Tests: `npm test` / `npm run test:unit` / `npm run test:api` / `npm run test:ci`
- Security suite: `npx vitest run --config vitest.security.config.ts` (CSRF, retention, tenant-context)
- DB: `npm run db:generate|migrate|push|seed|studio`; OpenAPI: `npm run generate:openapi`

Frontends (each portal dir): `npm ci`, `npm run dev`, `npm run build`, `npm run lint`; type check via `npx tsc --noEmit` (no script). Three portals lack an ESLint 9 flat config.

E2E (from `e2e-tests/`): `npm ci` then `npx playwright test`.

Docker: `docker network create ssvm-network` first (compose declares it `external: true`), then `docker compose up -d --build`. Services: Postgres 16, pgbouncer (6432), Redis, backend (5000), portals, Grafana/Prometheus/Alertmanager.

## Testing gotchas (high signal)

- `DATABASE_URL_TEST` must be explicitly set to a DB whose name contains `test` (e.g. `ssvm_test`); setup in `src/tests/setup.ts` throws otherwise and truncates ALL public tables. Never point it at a shared/dev/prod DB. Migrations must be applied first (`npx prisma migrate deploy`).
- `.env.test` sets `DATABASE_URL` only; tests read `DATABASE_URL_TEST`.
- Vitest global setup mocks Redis, BullMQ, Razorpay, Sentry, Bull Board. Backend tests do not need those services.
- Isolated security suite uses `vitest.security.config.ts` (separate setup files).

## Environment / secrets

- Copy root `.env.example` → `.env` and `ssvm-backend/.env.example` → `ssvm-backend/.env`; generate `JWT_SECRET` (64-byte hex). Backend also needs `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`.
- Demo seeding is disabled unless `ALLOW_DEMO_SEED=true`, `NODE_ENV` non-production, and `SEED_SUPER_ADMIN_EMAIL` + a ≥16-char password are set. No default login credentials are provided (README's admin@…/admin123 are stale).
- A tracked `ssvm-backend/.env.backup` with real creds was removed from the tree but remains in git history — rotate Postgres/JWT/Razorpay webhook secrets; do not rewrite history without approval.
- Production bootstrap fetches secrets from AWS Secrets Manager before importing the app (see `src/index.ts`); dev uses dotenv.

## Architecture notes that differ from defaults

- Request flow: `helmet → global rate limit → metrics/CORS/body/cookies → CSRF → schoolContextMiddleware → compat rewrite → route mounts`. Auth runs inside routers, after context middleware; successful `authenticate` replaces the provisional context with the DB-backed user's school/role. Unauthenticated requests keep a **null** context, so the Prisma tenant extension applies **no** school filter.
- Prisma extension hard-codes a subset of models for `schoolId` injection; unique lookups may become first-lookups; nested/raw SQL paths are not all covered. PostgreSQL RLS policy permits all rows when the tenant setting is unset and the request path does not set it. **No isolation guarantee is claimed — do not assert multi-tenant safety.**
- CSRF is double-submit with a stable browser context (runs before auth, so `req.user` is unavailable). Portals capture and send `X-CSRF-Token`. Login and payment webhooks are exempt.
- Document bytes are served only through authenticated, school/owner-scoped download routes (not a static path).
- Retention: entity allowlist, dry-run, 250-row bounded deletes, audit summary.

## Quirks / stale artifacts (verified)

- `run-without-docker.sh`/`.bat` reference a non-existent `ssvm-platform` frontend and stale default creds — do not rely on them.
- `docker-compose.yml` `ssvm-network` is `external: true`; create it before compose up.
- Docker backend entrypoint uses `prisma db push` (not migrate) and seeds when the `users` table is empty.
- `.gitignore` contains `prisma/migrations/` but it only matches a root-level path, so `ssvm-backend/prisma/migrations/` is actually tracked.
- Backend lint reports 567 violations; portal lint partially broken (missing flat configs).
- `ssvm_openapi_documentation.*` / `openapi.json` are generated (`npm run generate:openapi`); don't hand-edit.
- Next.js 16 differs significantly from training-data versions — read `node_modules/next/dist/docs/` (after `npm ci`) before writing portal code. Student and saas frontends both default to port 3000 (conflict if run together).
- CI workflows have not actually run; treat "passes" claims in docs as unverified.

## References

- `docs/ARCHITECTURE.md`, `docs/CLEAN_INSTALLATION_GUIDE.md`, `docs/KNOWN_LIMITATIONS.md`
- `docs/TESTING_MASTER_PLAN.md`, `docs/BUILD_AND_TEST_REPORT.md`
- `docs/TECHNICAL_DECISIONS.md`, `docs/REMEDIATION_DECISIONS.md`
- `docs/security/ROUTE_AUTHORIZATION_MATRIX.md`
- Per-portal `AGENTS.md` for Next.js 16 rules.