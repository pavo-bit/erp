# Phase 11 — Current Repository Baseline

**Audit Date:** November 8, 2026  
**Repository:** `pavo-bit/erp`  
**Working Branch:** `lane/d-portals`  
**Current HEAD SHA:** `9e0533928a0b96206f11cf85402da1a750eeef61` (`9e05339`)  
**Base Target Branch:** `origin/main` (`b3114159d9b895e5986cda41fa8865359cc2dbdd`)  
**Remote Tracking:** `origin/lane/d-portals` (`3b458358eaf34b04ea30a5a066101f2236db82d6`)  
**Auditor Assessment:** Clean Technical Baseline Established  

---

## 1. Git State & Working Tree Audit

- **Current Branch:** `lane/d-portals`
- **Current HEAD:** `9e0533928a0b96206f11cf85402da1a750eeef61`
- **Lineage Verification:**
  - `3b45835` — `feat(academic): implement Phase 3 timetable collision guard, gradebook, report card compilation and promotion engine` (Remote HEAD)
  - `35dda94` — `feat(perf): implement high-performance parallel execution coordinator for Ryzen 7`
  - `eeea97c` — `feat(finance): implement manual cash collection, offline payments, and official PDF receipts`
  - `bfec9cd` — `feat(core): complete core ERP business modules across Phases 2, 3, 4, 5, 6`
  - `6d456bb` — `feat(platform): complete SHFI centre, reliability/DR verification, portal integration, and production readiness (Phases 7-10)`
  - `9e05339` — `docs(release): reconcile authoritative documentation and add final consolidation audit deliverables` (Local HEAD)
- **Local Commits Ahead of Remote:** 5 commits ahead of `origin/lane/d-portals`.
- **Commits Ahead of Main:** 107 commits ahead of `origin/main`.
- **Working Tree Changes:**
  - One bugfix in `ssvm-backend/src/tests/api/cash-collection.test.ts` (timezone-safe local date calculation for daily register test).
  - Trailing newline normalization on 4 documentation files.
  - Phase 11 audit documents in `docs/`.

---

## 2. Repository Structure

```
pavo-bit/erp/
├── ssvm-backend/          # Node.js, Express, TypeScript, Prisma ORM, BullMQ workers
│   ├── prisma/            # Schema (211 models) & 7 active migrations
│   ├── src/
│   │   ├── routes/        # 66 route groups, 380+ API endpoints
│   │   ├── services/      # 34 business logic, finance & SHFI services
│   │   ├── middleware/    # Auth, RBAC, RLS, Quota, Rate Limit, CSRF
│   │   └── tests/         # Unit, API, academic, finance, RLS suites
├── erp-admin/             # Next.js 14 ERP Admin portal (44 pages)
├── super-admin/           # Next.js 14 SaaS Super Admin portal (10 pages)
├── teacher-portal/        # Next.js 14 Teacher Faculty portal (12 pages)
├── student-portal/        # Next.js 14 Enrolled Student portal (12 pages)
├── parent-portal/         # Next.js 14 Guardian portal (15 pages)
├── payment-portal/        # Next.js 14 Public Hosted Checkout (4 pages)
├── saas-frontend/         # Next.js 14 Public Landing & Inquiry (2 pages)
├── scripts/               # Parallel execution coordinator, DR verification harness
├── docs/                  # Architecture, security, gap register, reports
└── docker-compose*.yml    # Database, Redis, PgBouncer, Prometheus, Grafana
```

---

## 3. Package Scripts & Build Tooling

### Backend (`ssvm-backend/package.json`)
- `npm run build`: Compiles TypeScript to `dist/`.
- `npm run type-check`: `tsc --noEmit` (100% passing clean).
- `npm test`: Runs Vitest test suites.
- `npm run test:unit`: Executes isolated unit tests (`src/tests/unit/`).
- `npm run test:rls`: Runs multi-tenancy RLS isolation tests.
- `npm run db:tenant-classification`: Generates and verifies tenant classification artifacts.

### Portals (`npx tsc --noEmit`)
All 7 Next.js portals typecheck cleanly without compilation errors using their respective `tsconfig.json` configurations.

---

## 4. Database Environment & Docker Services

- **Database Engine:** PostgreSQL 16 on container `ssvm-database` (host port `5433`).
- **Redis Cache & Queues:** Redis 7 on container `ssvm-redis` (host port `6379`).
- **Connection Pooler:** PgBouncer on container `ssvm-pgbouncer` (host port `6432`).
- **Active Databases:**
  - `ssvm_test`: Dedicated test database with migrations applied, 181 tables with forced RLS, used by test suites.
  - `ssvm_platform`: Development/demo database with 208 physical tables (177 tenant tables with forced RLS, 31 global platform tables).
- **Database Roles:** `postgres` (admin), `ssvm_app` (restricted runtime app role), `ssvm_auth` (authentication), `ssvm_fixture` (testing).

---

## 5. Security & Zero-Investment Safety Posture

- **Zero Paid Cloud Dependencies:** System operates completely without commercial SaaS subscriptions, paid AWS resources, or paid proprietary LLM APIs.
- **Provider Boundaries:** Payment gateways (Razorpay test keys), SMS (simulated outbox relay), and storage (local disk fallback) are strictly isolated with mock/test adapters. Production credential provisioning is isolated to deployment environment variables.
