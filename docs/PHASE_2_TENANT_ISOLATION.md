# Phase 2 — Multi-Tenancy, RBAC and Database Isolation

Updated: 2026-11-01

## Status: IN PROGRESS — NOT VERIFIED

The tenant architecture has not received the complete audit required by the implementation program. This report does not infer correctness from existing code or older comments.

### Known inspection lead

`src/app.ts` mounts `schoolContextMiddleware` before route-level `authenticate` middleware. Authentication now updates the existing AsyncLocalStorage context only after token, active-account and token-school checks succeed. Isolated tests verify context propagation and concurrent request isolation (3/3). The existing Prisma extension can therefore apply its school filter to the limited model allowlist after authentication.

This does not close tenant isolation. The Prisma model allowlist is incomplete and unique/read-write operations, nested queries, raw SQL and background jobs are not comprehensively covered. PostgreSQL context is not set in a transaction. The current RLS policy treats a missing tenant as unrestricted access (`current_tenant_id() IS NULL OR ...`), so an unset context is fail-open at the database layer. Owner correction: the RLS migration applies cleanly on an empty database and configures 23 tables; the defect is coverage and fail-open behavior, not migration ordering. PostgreSQL policy behavior and role grants were not tested in this execution.

### Required remaining work

- Extend request-local context tests to actual authenticated routes and every auth mechanism.
- Inventory every Prisma model and classify direct and indirect school ownership.
- Audit Prisma extensions, unique operations, writes, nested relations, aggregates, transactions and raw SQL.
- Design transaction-safe RLS context and explicit super-admin authorization; remove NULL fail-open behavior only with compatible application context and migration rollout.
- Review RLS coverage, database roles, grants, background jobs, WebSockets and exports.
- Add cross-school negative tests for all sensitive data paths.

No database-backed tenant isolation test was run. No completion percentage is claimed.
