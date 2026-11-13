# SSVM ERP — Enterprise School Management & Multi-Tenant SaaS Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20RLS-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)](https://www.prisma.io/)
[![Next.js](https://img.shields.io/badge/Next.js-16%20React%2019-black.svg)](https://nextjs.org/)
[![Redis](https://img.shields.io/badge/Redis-7%20BullMQ-red.svg)](https://redis.io/)

---

## 1. Overview & Purpose

SSVM ERP is a production-grade multi-tenant School Enterprise Resource Planning system engineered for educational institutions. It delivers complete administrative control, academic lifecycle management, double-entry financial accounting, biometric attendance, and synchronized communications across administrative staff, educators, students, and guardians.

---

## 2. Core Capabilities

- **Multi-Tenant Row-Level Security (RLS):** True transaction-scoped PostgreSQL 16 RLS enforcing strict isolation across schools and tenant branches.
- **Double-Entry General Ledger:** Automatic balanced journal posting ($\sum \text{Dr} \equiv \sum \text{Cr}$) for fee collections, offline cash receipts, discounts, advance credits, and staff payroll disbursements.
- **Academic Lifecycle & Promotion:** Student admissions, class/section allocations, timetable collision detection (preventing teacher/room/section double-booking), exam scheduling, grading scales, and historical record retention.
- **Operational Modules:** Biometric attendance ingestion, library book cataloguing with overdue fine computation, transport fleet GPS tracking, and procurement with serialized Goods Receipt Notes (GRN).
- **Seven Integrated Portals:** Dedicated web applications for Super Admin, School ERP Admin, Teachers, Students, Parents, Public Fee Payment, and SaaS Onboarding.

---

## 3. High-Level Architecture & Tech Stack

```
                          ┌───────────────────────────────────────┐
                          │   Edge Layer (Cloudflare WAF / SSL)   │
                          └───────────────────┬───────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
        ┌───────────▼───────────┐                           ┌───────────▼───────────┐
        │  7 Next.js Frontends  │                           │  Express REST API     │
        │  (React 19, Ports     │                           │  (ssvm-backend:5000)  │
        │   3000-3008)          │                           │  BullMQ Workers       │
        └───────────────────────┘                           └───────────┬───────────┘
                                                                        │
                                              ┌─────────────────────────┴─────────────────────────┐
                                              │                                                   │
                                  ┌───────────▼───────────┐                           ┌───────────▼───────────┐
                                  │   PgBouncer :6432     │                           │   Redis 7 :6379       │
                                  │   PostgreSQL 16 :5433 │                           │   Queues, Cache, SSE  │
                                  │   (RLS Enforced)      │                           └───────────────────────┘
                                  └───────────────────────┘
```

- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM 6.x, BullMQ, Pino Logger.
- **Database & Cache:** PostgreSQL 16 with native RLS, PgBouncer, Redis 7.
- **Frontends:** Next.js 16 (App Router), React 19, Tailwind CSS, Lucide icons.
- **Monitoring & Metrics:** Prometheus (`:9090`), Alertmanager (`:9093`), Grafana (`:3004`).

---

## 4. Repository Structure

```
.
├── AGENTS.md                  # Authoritative AI agent engineering instructions
├── README.md                  # This file
├── docs/                      # 10 canonical architecture and specification documents
├── erp-admin/                 # School staff and ERP administrator portal (Next.js)
├── super-admin/               # SaaS super-admin platform management portal (Next.js)
├── teacher-portal/            # Faculty grading and roll-call portal (Next.js)
├── student-portal/            # Student portal (Next.js)
├── parent-portal/             # Guardian portal (Next.js)
├── payment-portal/            # Student/Parent payment portal (Next.js)
├── saas-frontend/             # SaaS marketing and school onboarding portal (Next.js)
├── ssvm-backend/              # Express.js REST API backend & BullMQ workers
│   ├── prisma/                # schema.prisma and migrations/
│   ├── src/                   # routes, services, middleware, lib, workers
│   └── src/tests/             # vitest unit, api, security, and db RLS suites
├── scripts/                   # Migration, maintenance, and verification scripts
└── docker-compose.yml         # Container definitions for databases, Redis, apps
```

---

## 5. Prerequisites & Local Setup

### Prerequisites
- **Node.js:** v18.18.0 or later (v20+ recommended)
- **Docker & Docker Compose:** Docker Desktop or Engine with Compose V2
- **PostgreSQL 16 & Redis 7:** Provided via Docker Compose

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/pavo-bit/erp.git
cd erp
cp ssvm-backend/.env.example ssvm-backend/.env
```

### Step 2: Start Infrastructure
```bash
docker compose up -d ssvm-database ssvm-redis ssvm-pgbouncer
```
- PostgreSQL is available at `localhost:5433` (database: `ssvm_platform`).
- Redis is available at `localhost:6379`.

### Step 3: Install Dependencies & Run Migrations
```bash
npm --prefix ssvm-backend install
npx --prefix ssvm-backend prisma migrate deploy
npx --prefix ssvm-backend prisma db seed
```

---

## 6. Development Commands

| Service / App | Dev Server Command | URL |
| :--- | :--- | :--- |
| **Backend REST API** | `npm --prefix ssvm-backend run dev` | http://localhost:5000 |
| **ERP Admin Portal** | `npm --prefix erp-admin run dev` | http://localhost:3000 (or :3005) |
| **Super Admin Portal** | `npm --prefix super-admin run dev` | http://localhost:3001 |
| **Teacher Portal** | `npm --prefix teacher-portal run dev` | http://localhost:3002 |
| **Student Portal** | `npm --prefix student-portal run dev` | http://localhost:3003 |
| **Parent Portal** | `npm --prefix parent-portal run dev` | http://localhost:3006 |
| **Payment Portal** | `npm --prefix payment-portal run dev` | http://localhost:3007 |
| **SaaS Frontend** | `npm --prefix saas-frontend run dev` | http://localhost:3008 |

---

## 7. Testing & Verification Commands

All test suites execute against real PostgreSQL and Redis instances:

```bash
# 1. PostgreSQL Row-Level Security Suites (5 files, 217 tests)
npm --prefix ssvm-backend run test:rls

# 2. Comprehensive Vitest Regression Suites (54 files, 401 tests)
npm --prefix ssvm-backend test

# 3. Backend TypeScript Compilation Check
npm --prefix ssvm-backend run type-check

# 4. Frontend Portals TypeScript Checks
npx --prefix erp-admin tsc --noEmit
npx --prefix super-admin tsc --noEmit
npx --prefix teacher-portal tsc --noEmit
npx --prefix student-portal tsc --noEmit
npx --prefix parent-portal tsc --noEmit
npx --prefix payment-portal tsc --noEmit
npx --prefix saas-frontend tsc --noEmit
```

---

## 8. Canonical Documentation Entry Points

All system documentation is consolidated into 10 canonical specifications in the [`docs/`](docs/README.md) directory:

1. [`docs/README.md`](docs/README.md) — Central documentation index.
2. [`docs/PRODUCT_SCOPE.md`](docs/PRODUCT_SCOPE.md) — Approved requirements, institutional profiles, school types, and scope boundaries.
3. [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) — End-to-end architecture, domain boundaries, data flows, and infrastructure.
4. [`docs/SECURITY_AND_TENANCY.md`](docs/SECURITY_AND_TENANCY.md) — Multi-tenant isolation, RLS rules, RBAC, route security tiers, and audit logging.
5. [`docs/DATABASE_AND_FINANCIAL_INTEGRITY.md`](docs/DATABASE_AND_FINANCIAL_INTEGRITY.md) — 216 Prisma models, double-entry ledger, webhook idempotency, and cash desk concurrency.
6. [`docs/API_AND_INTEGRATIONS.md`](docs/API_AND_INTEGRATIONS.md) — 428 endpoints, security tiering, request/response contracts, and webhook handlers.
7. [`docs/MODULES_AND_PORTALS.md`](docs/MODULES_AND_PORTALS.md) — 7 frontend applications, 35 ERP Admin functional modules, and institutional mappings.
8. [`docs/DEVELOPMENT_AND_TESTING.md`](docs/DEVELOPMENT_AND_TESTING.md) — Development setup, test runner conventions, test database isolation, and QA checklists.
9. [`docs/DEPLOYMENT_AND_OPERATIONS.md`](docs/DEPLOYMENT_AND_OPERATIONS.md) — Docker Compose topology, monitoring, backup/restore, health probes, and incident runbooks.
10. [`docs/RELEASE_STATUS_AND_BLOCKERS.md`](docs/RELEASE_STATUS_AND_BLOCKERS.md) — Authoritative release verification register, 618 passing tests, and external credentials blockers.
