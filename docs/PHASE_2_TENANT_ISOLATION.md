# Phase 2 — Multi-Tenancy, RBAC and Database Isolation

Updated: 2026-11-01

## Status: IN PROGRESS — NOT VERIFIED

The tenant architecture has not received the complete audit required by the implementation program. This report does not infer correctness from existing code or older comments.

### Known inspection lead

`src/app.ts` mounts `schoolContextMiddleware` before route-level `authenticate` middleware. Authentication now updates the existing AsyncLocalStorage context only after token, active-account and token-school checks succeed. Isolated tests verify context propagation and concurrent request isolation (3/3). The existing Prisma extension can therefore apply its school filter to the limited model allowlist after authentication.

This does not close tenant isolation. The Prisma model allowlist is incomplete and unique/read-write operations, nested queries, raw SQL and background jobs are not comprehensively covered. PostgreSQL context is not set in a transaction. The current RLS policy treats a missing tenant as unrestricted access (`current_tenant_id() IS NULL OR ...`), so an unset context is fail-open at the database layer. Owner correction: the RLS migration applies cleanly on an empty database and configures 23 tables; the defect is coverage and fail-open behavior, not migration ordering. PostgreSQL policy behavior and role grants were not tested in this execution.

## New isolation gate (UNVERIFIED; score 0)

Added `npm run test:rls`, a PostgreSQL-backed suite for the existing `fee_categories` RLS policy. Setup requires `DATABASE_URL_TEST`, requires a test-marked database name, and queries `pg_roles` to fail loudly unless `rolsuper = false` and `rolbypassrls = false`. Cases cover missing tenant context, matching-tenant reads, and cross-tenant writes. The test has not run because no PostgreSQL instance is reachable. It is expected to expose the current fail-open policy. Do not count this authored suite as passing evidence.

Rerun after provisioning an isolated database, applying migrations and connecting with the restricted application role: `npm run test:rls`. Until it passes on real PostgreSQL, the tenant-isolation area remains score 0.

## Current score for this open phase

| Area | Weight | Verified area score | Weighted contribution | Reason |
|---|---:|---:|---:|---|
| Tenant isolation | 15 | 0% | 0/15 | No real PostgreSQL gate has passed; the authored test suite is not evidence of runtime isolation. |

This phase remains open. Other areas were not re-scored in this phase.

### Required remaining work

- Extend request-local context tests to actual authenticated routes and every auth mechanism.
- Inventory every Prisma model and classify direct and indirect school ownership.
- Audit Prisma extensions, unique operations, writes, nested relations, aggregates, transactions and raw SQL.
- Design transaction-safe RLS context and explicit super-admin authorization; remove NULL fail-open behavior only with compatible application context and migration rollout.
- Review RLS coverage, database roles, grants, background jobs, WebSockets and exports.
- Add cross-school negative tests for all sensitive data paths.

No database-backed tenant isolation test was run. No completion percentage is claimed.
