# Phase 1 — Tenant Security

## Status: BLOCKING / NOT VERIFIED

Request-local school context is now populated after successful authentication, with isolated concurrency tests. Targeted CRM, inventory, procurement and finance-governance routes now require authentication and derive ordinary-user school/actor identity from the verified user.

The critical database gap remains confirmed: `20260617_add_rls_policies/migration.sql` permits access when `current_tenant_id()` is NULL. The application request path does not set this variable transaction-locally. Prisma model coverage is a hard-coded subset of the 205-model schema. No PostgreSQL-backed test has run.

Do not change the migration to deny NULL without a verified transaction-context implementation: that would fail closed but may also break all app queries. Required next work is to implement a transaction-safe context strategy, inspect runtime role grants and table owners, inventory direct/indirect tenant ownership, then run real cross-tenant read/write/delete/insert/pool-reuse tests.

Evidence and issue states: `../PHASE_2_TENANT_ISOLATION.md`, `VERIFIED_ISSUE_REGISTER.md`, `TEST_EVIDENCE.md`.
