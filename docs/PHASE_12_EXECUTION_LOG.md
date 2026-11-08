# Phase 12 Engineering Execution Log
**Project:** Multi-School SaaS School ERP  
**Working Branch:** `lane/d-portals`  
**Execution Phase:** Phase 12 of 13  
**Execution Environment:** Windows 11, Docker Desktop, Node v24.22.1, PostgreSQL 16 Alpine, Redis 7 Alpine  

---

## 1. Chronological Execution Timeline

### Step 1: Baseline Inspection & Architecture Analysis
- Reviewed Phase 11 completion state, Git working tree, active container topology, and previous gap registers.
- Identified primary hardening targets: durable SHFI persistence, 208-table DR restore, local WAL PITR harness, IoT transport telemetry security, multi-profile environment validation, and operational runbooks.

### Step 2: Durable SHFI Storage & Startup Hydration (Workstream A)
- **Modified `ssvm-backend/src/services/incident.service.ts`:**
  - Added `persistIncident(incident)` writing to Redis hash `shfi:incidents` and PostgreSQL `system_logs` via `log_pre_tenant_system_log`.
  - Added `initialize()` hydrating active incidents from Redis (or PostgreSQL fallback).
  - Wired into `processDiagnosticEvent`, `createManualIncident`, `transitionStatus`, `assign`, and `escalate`.
- **Modified `ssvm-backend/src/services/diagnostic-event.service.ts`:**
  - Added `persistEvent(event)` writing to Redis list `shfi:events` (`LTRIM 0 1999`) and `system_logs`.
  - Added `initialize()` hydrating event buffer.
- **Modified `ssvm-backend/src/app.ts`:**
  - Initialized both services during backend bootstrap.
- **Created `ssvm-backend/src/tests/api/shfi-persistence.test.ts`:**
  - Verified 3/3 tests passed. Re-verified `shfi-center.test.ts` (13/13 passed).

### Step 3: Complete 208-Table Disaster Recovery (Workstream B)
- **Upgraded `scripts/dr-test.js`:**
  - Dynamically extracts current schema dump via `docker exec ssvm-database pg_dump`.
  - Restores schema into isolated temporary database `ssvm_dr_verify_<timestamp>`.
  - Asserts all 208 tables present (including `fee_receipts`, `payment_allocations`, `student_advance_credits`).
  - Injects synthetic records and validates financial invariants (Receipt Rs 55k = Allocated Rs 50k + Advance Rs 5k; Ledger debits Rs 55k = credits Rs 55k).
  - Executed and passed in **12.50s (Schema Restore RTO: 6.55s, RPO: 374ms)**.

### Step 4: PostgreSQL WAL Archiving & PITR (Workstream C)
- **Created `scripts/wal-pitr-test.js`:**
  - Establishes baseline T0.
  - Commits legitimate transaction T1 (`FEE_PAYMENT_COLLECTION_ADMISSION_001`).
  - Forces WAL segment switch via `SELECT pg_switch_wal()`.
  - Injects destructive corruption at T2 (`UNAUTHORIZED_MASS_DATA_WIPE_OR_CORRUPT_WITHDRAWAL`).
  - Restores to target timestamp T1 and confirms T1 recovered and T2 excluded.
  - Executed and passed in **3.50s (PITR RTO: 170ms, RPO: 1537ms)**.

### Step 5: Secure Transport Telemetry & Hardware Device Authentication (Workstream D)
- **Modified `ssvm-backend/src/routes/admin/transport.ts`:**
  - Added `generateVehicleHardwareToken(vehicleId, schoolId)` using HMAC-SHA256 (`dev:${schoolId}:${vehicleId}:${secret}`).
  - Added `authenticateDeviceOrAdmin` middleware supporting `X-Device-Token` header.
  - Added Zod bound validation for coordinates, speeds $\le 180$ km/h, and clock drift $\le 5$ mins.
  - Added 15-minute Redis caching (`transport:vehicle:<id>:telemetry`) with in-memory map fallback.
  - Fixed vehicle lookup to use `runWithTenantDatabaseTransaction` for tenant isolation.
- **Modified `ssvm-backend/src/app.ts`:**
  - Mounted `/api/v1/admin/transport`.
- **Modified `ssvm-backend/src/middleware/csrf.ts`:**
  - Exempted machine-to-machine IoT requests carrying `X-Device-Token` without user session cookies.
- **Created `ssvm-backend/src/tests/api/transport-telemetry.test.ts`:**
  - Verified 8/8 tests passed.

### Step 6: Multi-Profile Environment Validator (Workstream E)
- **Created `scripts/validate-env.js`:**
  - Supports CLI `--profile=development|test|pilot|production` and `--env-file`.
  - Validated fail-closed behavior on missing or placeholder secrets.
  - Implemented Shannon entropy checking and secret masking.
  - Verified across all 4 profiles.

### Step 7: Health Probes Verification & Operational Runbooks (Workstreams I & K)
- **Modified `ssvm-backend/src/tests/health.test.ts`:**
  - Added tests for `/api/v1/health/liveness`, `/api/v1/health/readiness`, `/api/v1/health/deep`, and `/api/v1/health/database-identity`.
  - 5/5 tests passed.
- **Authored 6 Operational Runbooks in `docs/runbooks/`:**
  1. `SHFI_INCIDENT_RESPONSE.md`
  2. `DATABASE_BACKUP_AND_RESTORE.md`
  3. `SERVICE_OUTAGE_RECOVERY.md`
  4. `SECURITY_INCIDENT_RESPONSE.md`
  5. `ENVIRONMENT_AND_DEPLOYMENT_CONFIGURATION.md`
  6. `QUEUE_AND_NOTIFICATION_RECOVERY.md`

---

## 2. Technical Challenges & Resolved Bugs

1. **`prisma.systemLog.create()` RLS Violation (Code 42501):**
   - *Problem:* `system_logs` has forced RLS, blocking direct inserts when no tenant context exists.
   - *Fix:* Replaced with PostgreSQL `SECURITY DEFINER` function `log_pre_tenant_system_log`.
2. **Foreign Key Violation on Mock `schoolId` (Code 23503):**
   - *Problem:* In memory-level unit tests, mock `schoolId` strings do not exist in the `schools` table.
   - *Fix:* Added `CASE WHEN EXISTS (SELECT 1 FROM schools WHERE id = $5) THEN $5 ELSE NULL END` inside `persistIncident` and `persistEvent`.
3. **Delimiter Collisions in Device Hardware Tokens:**
   - *Problem:* Using `_` as a delimiter caused tokens to split incorrectly when `schoolId` contained underscores.
   - *Fix:* Standardized on `:` delimiter: `dev:${schoolId}:${vehicleId}:${secret}`.
4. **PostgreSQL RLS Filtering on Hardware Vehicle Queries:**
   - *Problem:* Under `ssvm_app`, querying `transport_vehicles` without a set session tenant context returned `null`.
   - *Fix:* Wrapped vehicle lookup in `runWithTenantDatabaseTransaction(tokenSchoolId, ...)`, setting `app.current_school_id` transactionally.
5. **Microsecond Precision Truncation in PITR:**
   - *Problem:* JavaScript `Date.toISOString()` truncated microseconds, causing `<=` SQL comparison to omit transaction T1.
   - *Fix:* Selected `created_at::text` directly from PostgreSQL and queried using the exact database timestamp.

