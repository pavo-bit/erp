# SSVM ERP Architecture (Observed Baseline)

Updated: 2026-10-31  
Status: Descriptive baseline; tenant and production behavior not verified.

## Main components

- Seven Next.js applications: ERP admin, super-admin, teacher, parent, payment, student and SaaS frontend.
- Express backend mounted primarily at `/api/v1`, with compatibility and `/api/v2` routes.
- PostgreSQL accessed via Prisma; Prisma Client extensions currently attempt encryption, tenant scoping and soft-delete interception.
- Redis and BullMQ are used for queue/background work.
- Docker Compose files separate main app, API, portals, infrastructure and monitoring concerns.
- Prometheus/Grafana, GitHub Actions and Playwright configuration exist.

## Request flow observed

`helmet → global rate limit → metrics/CORS/body parsing/cookies → CSRF → schoolContextMiddleware → compatibility rewrite → route mounts`.

Route-level authentication occurs inside mounted routers, after `schoolContextMiddleware`. The initial context is provisional; successful `authenticate` now replaces it with the active database-backed user's school and role. Isolated tests verify context handoff and concurrent request isolation. Requests that never authenticate keep a null context, which still means the Prisma extension applies no school filter.

## Data isolation observations

The Prisma extension has a hard-coded subset of model names, conditionally injects `schoolId` only when a context exists, converts some unique lookups to first lookups, and does not visibly enforce every nested/raw SQL/indirect relation path. The existing PostgreSQL RLS policy explicitly permits all rows when its tenant setting is unset, and the request path does not set that transaction-local value. PostgreSQL RLS migrations and database role privileges need separate verification. No isolation guarantee is claimed.

## Current assurance status

- Local source boundaries: partially inspected.
- Multi-school isolation: unverified.
- Financial consistency: unverified.
- Clean install/backup restore: unverified.
- Production operational posture: not ready.
