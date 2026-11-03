# Prisma Client Inventory & Architecture

## Overview
All database access in SSVM ERP must pass through centralized, controlled database clients. Direct, ad-hoc `new PrismaClient()` instantiations across routes, services, or controllers bypass PostgreSQL Row-Level Security (RLS), connection pooling, PII field encryption, and tenant context propagation.

All 33+ historical ad-hoc `new PrismaClient()` instantiations across feature modules have been removed and replaced with imports from `@/lib/prisma`.

## Centralized Client Inventory

The remaining `new PrismaClient()` instantiations are strictly limited to the following 6 controlled infrastructure locations:

| # | Location | Database Role | Purpose / Justification |
|---|---|---|---|
| 1 | `src/lib/prisma.ts` (`basePrisma`) | `ssvm_app` (restricted runtime) | Primary application runtime database client. Bound to `ssvm_app` (`NOSUPERUSER`, `NOBYPASSRLS`). Extended with PII encryption, audit log tagging, and tenant-scoped transactions with `set_config('app.current_school_id', schoolId, true)`. |
| 2 | `src/lib/authPrisma.ts` (`authPrismaClient`) | `ssvm_auth` (login only) | Dedicated least-privilege client for authentication/login routines. Never touches tenant-scoped tables directly; restricted to credentials and user lookup. |
| 3 | `src/lib/trustedPrisma.ts` (`trustedPrismaClient`) | `ssvm_trusted` (named server jobs) | Dedicated client for authorized server-side tasks (e.g. initial webhook resolution, audit/event logging, super-admin search). Enforces explicit purpose checking. |
| 4 | `src/lib/dbRoleHealthCheck.ts` (`client`) | Target role probe | Ephemeral diagnostic probe used strictly by `/api/v1/health/database-identity` to verify database role privileges and active RLS policy counts. |
| 5 | `src/tests/helpers/testApp.ts` (`fixturePrismaClient`) | `ssvm_fixture` (`BYPASSRLS`) | Test harness fixture client. Used solely in automated test suites to seed cross-tenant test data without interfering with runtime application RLS boundaries. |
| 6 | `src/tests/helpers/workerDatabase.ts` (`client`) | Test worker admin | Test infrastructure harness used during parallel Vitest runs to provision, clone, and tear down isolated worker template databases (`ssvm_test_worker_*`). |

## Architecture Invariant
No file outside `src/lib/` (and test infrastructure in `src/tests/helpers/`) may contain `new PrismaClient()`. This invariant is verified by the automated architecture test gate (`architecture.test.ts`).
