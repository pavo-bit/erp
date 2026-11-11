# SSVM ERP — Development & Testing Specification

**Canonical Document:** `docs/DEVELOPMENT_AND_TESTING.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Development Guide, Test Execution & Quality Assurance

---

## 1. Local Development Environment

### 1.1 Prerequisites
- **Node.js:** v18.18.0 or later (v20+ LTS recommended)
- **Docker & Docker Compose:** Docker Engine v24+ with Compose V2
- **Operating System:** Windows, Linux, or macOS

### 1.2 Local Infrastructure Initialization
Start PostgreSQL 16, Redis 7, and PgBouncer:
```bash
docker compose up -d ssvm-database ssvm-redis ssvm-pgbouncer
```

Verify service ports:
- **PostgreSQL 16:** `localhost:5433` (Database: `ssvm_platform`, User: `postgres`)
- **Redis 7:** `localhost:6379`
- **PgBouncer:** `localhost:6432`

### 1.3 Database Setup & Migrations
```bash
# 1. Install backend dependencies
npm --prefix ssvm-backend install

# 2. Deploy schema migrations
npx --prefix ssvm-backend prisma migrate deploy

# 3. Seed baseline database (school, admin accounts, chart of accounts)
npx --prefix ssvm-backend prisma db seed
```

---

## 2. TypeScript Compilation Verification

All TypeScript configurations must pass with zero errors:

```bash
# 1. Backend REST API
npm --prefix ssvm-backend run type-check

# 2. Root and Scripts Configs
node ./ssvm-backend/node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node ./ssvm-backend/node_modules/typescript/bin/tsc -p scripts/tsconfig.json --noEmit

# 3. Seven Next.js Frontend Portals
npx --prefix erp-admin tsc --noEmit
npx --prefix super-admin tsc --noEmit
npx --prefix teacher-portal tsc --noEmit
npx --prefix student-portal tsc --noEmit
npx --prefix parent-portal tsc --noEmit
npx --prefix payment-portal tsc --noEmit
npx --prefix saas-frontend tsc --noEmit
```

---

## 3. Test Runner & Verification Suites

The repository contains **59 test files** totaling **618 automated tests**, all executing against live PostgreSQL 16 and Redis 7 instances:

### 3.1 PostgreSQL Row-Level Security Suites (5 files, 217 tests)
Executed with thread-pool database isolation:
```bash
npm --prefix ssvm-backend run test:rls
```
- `src/tests/db/tenant-wrapper.test.ts` (9 tests): Transparent tenant filtering and soft-delete queries.
- `src/tests/db/tenant-rls.test.ts` (185 tests): Fail-closed RLS on all 185 tenant tables using unprivileged role `ssvm_app`.
- `src/tests/db/role-privileges.test.ts` (19 tests): Database role privilege audits (`rolsuper=false`, `rolbypassrls=false`).
- `src/tests/db/ledger-integrity.test.ts` (3 tests): Strict double-entry balance invariant ($\sum \text{Dr} \equiv \sum \text{Cr}$).
- `src/tests/db/receipt-uniqueness-precheck.test.ts` (1 test): Sequence counter row-locking and duplicate prevention.

### 3.2 Standard Vitest Regression Suites (54 files, 401 tests)
```bash
npm --prefix ssvm-backend test
```
- **API Suites (`src/tests/api/` - 28 files):** Academic promotions, timetable collisions, fee collections, Razorpay webhooks, library copies, transport telemetry, SHFI incident persistence.
- **Security Suites (`src/tests/security/` - 10 files):** Route boundaries, CSRF token validation, cross-origin refresh protection, role scoping, and tenant isolation.
- **Unit Suites (`src/tests/unit/` - 10 files):** Gradebook GPA, fine calculation, money invariants, circuit breakers, and RBAC permissions.
- **Architecture & System Suites (`src/tests/` - 6 files):** Session management, full-text search RLS, health checks, and thread messaging.

---

## 4. Test Database Safety & Isolation

1. **Dedicated Test Databases:** Tests connect to `ssvm_test` and automatically allocate parallel worker databases (`ssvm_test_worker_<N>`) using template databases.
2. **Fail-Closed Runtime Role:** Tests execute under the non-superuser application role `ssvm_app` to ensure real RLS policy enforcement.
3. **Data Teardown:** Test fixtures run in isolated transactions or execute automated cleanup in `afterEach` / `afterAll` hooks.

