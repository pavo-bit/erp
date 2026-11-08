# Phase 12 — Baseline and Architecture Audit

**Execution Phase:** Phase 12 of 13  
**Audit Date:** November 8, 2026  
**Repository:** `pavo-bit/erp`  
**Working Branch:** `lane/d-portals`  
**Baseline HEAD SHA:** `9e0533928a0b96206f11cf85402da1a750eeef61` (`9e05339`)  
**Auditor:** Principal Software Architect & SRE Lead  

---

## 1. Git State & Working Tree Audit

- **Current Branch:** `lane/d-portals`
- **Current HEAD SHA:** `9e0533928a0b96206f11cf85402da1a750eeef61`
- **Remote Tracking:** `origin/lane/d-portals` (`3b458358eaf34b04ea30a5a066101f2236db82d6`)
- **Main Branch Target:** `origin/main` (`b3114159d9b895e5986cda41fa8865359cc2dbdd`)
- **Status Relative to Remote:** 5 commits ahead of `origin/lane/d-portals`; 107 commits ahead of `origin/main`.
- **Working Tree Analysis & Reconciled Git State:**
  - `ssvm-backend/src/tests/api/cash-collection.test.ts`: Contains a verified 2-line timezone bugfix (DEF-001) ensuring daily register aggregation queries match local calendar dates across midnight UTC rollovers.
  - `docs/FINAL_*.md` and `docs/MASTER_IMPLEMENTATION_STATUS.md`: Pre-existing newline normalizations and Phase 11 status markers.
  - Untracked files: Seven Phase 11 authoritative audit and verification deliverables (`docs/PHASE_11_*`).
  - No unexpected source code modifications or uncommitted feature drifts exist.

---

## 2. Docker & Service Infrastructure Baseline

Inspection of running containers on host:

| Container Name | Image | Host Port | Internal Port | Service Role | Status |
|---|---|---|---|---|---|
| `ssvm-database` | `postgres:16-alpine` | `5433` | `5432` | Multi-Tenant Relational Store | Healthy (Up 9h) |
| `ssvm-redis` | `redis:7-alpine` | `6379` | `6379` | Queue (BullMQ) & Cache | Healthy (Up 9h) |
| `ssvm-pgbouncer` | `edoburu/pgbouncer:latest` | `6432` | `5432` | Connection Pooler | Up 35m |
| `ssvm-backend` | `erp-backend` | `5000` | `5000` | Express/TypeScript Gateway | Healthy (Up 9h) |
| `ssvm-erp-admin`| `erp-erp-admin` | `3000` | `3000` | ERP Admin Portal | Up 9h |
| `ssvm-prometheus`| `prom/prometheus:latest` | `9090` | `9090` | Telemetry & Metric Scraper | Up 35m |
| `ssvm-grafana` | `grafana/grafana-enterprise` | `3004` | `3000` | Dashboard Visualization | Up 35m |
| `ssvm-alertmanager`| `prom/alertmanager:latest` | `9093` | `9093` | Alert Dispatcher | Up 35m |

---

## 3. Database Schema & Migration Inventory

- **Prisma Schema Models:** **211 models** in `ssvm-backend/prisma/schema.prisma`.
  - 130 Direct Tenant Models (explicit `schoolId`).
  - 50 Indirect Tenant Models (inherited foreign keys).
  - 31 Global Platform Models (`School`, `SubscriptionPlanConfig`, `Permission`, `FeatureFlag`, etc.).
- **Physical PostgreSQL Tables:** **208 tables** in `ssvm_platform` (`public` schema).
  - 205 baseline tables created by `20261101130000_full_schema_baseline/migration.sql`.
  - 3 cash collection tables created by `20261107160000_cash_collection_and_allocations/migration.sql` (`fee_receipts`, `payment_allocations`, `student_advance_credits`).
- **Row Level Security (RLS) Status:**
  - `ssvm_platform`: 177 tenant tables enforce `relrowsecurity = true` and `relforcerowsecurity = true`; 31 global platform tables unconstrained. Total: 208 base tables.
  - `ssvm_test`: 181 tables enforce `relrowsecurity = true` (177 tenant + 4 test fixture tables).
- **Active Migration History:**
  1. `20261101130000_full_schema_baseline`
  2. `20261101140000_enable_pgcrypto`
  3. `20261101150000_generated_tenant_rls`
  4. `20261101160000_security_definer_roles`
  5. `20261101170000_audit_hash_chain`
  6. `20261102000000_decimal_monetary_types`
  7. `20261107160000_cash_collection_and_allocations`

---

## 4. Frontend Application Baseline

- **Portals:** 7 Next.js 14 applications (`erp-admin`, `super-admin`, `teacher-portal`, `student-portal`, `parent-portal`, `payment-portal`, `saas-frontend`).
- **Physical `page.tsx` Files:** **99 files** (90 original inventory routes + 9 specialized route pages added in Phases 2–7).
- **Typecheck Status:** 100% clean across all 7 portals (`npx tsc --noEmit` exits with code 0).
- **API Client:** Unified `fetchWithAuthRetry` with automatic 401 token refresh and double-submit CSRF cookie/header exchange.

---

## 5. Security Audit (Agent 2) Status

- Search for `PHASE_11B_*` reports returned: **NOT_AVAILABLE** (no reports present in `docs/` or repository).
- Per Workstream F instructions: Independent targeted security verification will be executed during Phase 12 for JWT rotation, CSRF, security headers, file upload path traversal/MIME restrictions, and webhook signature verification.

