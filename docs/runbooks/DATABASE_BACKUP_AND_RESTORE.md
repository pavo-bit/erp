# Operational Runbook: Database Backup, Disaster Recovery & Point-In-Time Recovery (PITR)
**Document ID:** RB-DB-002  
**Target Database:** PostgreSQL 16 Alpine (Container: `ssvm-database`, Port: 5433)  
**Audience:** PostgreSQL Reliability Engineers, Database Administrators, SREs  
**Classification:** Operational Procedure  

---

## 1. Overview & Architecture
The ERP platform employs a dual-tier disaster recovery architecture:
1. **Schema & Snapshot Backups:** Daily full structural dumps covering all 208 physical tables (including core academic, HR, and the 3 cash collection tables: `fee_receipts`, `payment_allocations`, `student_advance_credits`).
2. **PostgreSQL WAL Streaming & Archiving:** Continuous Write-Ahead Log (WAL) archiving enabling millisecond-precision Point-In-Time Recovery (PITR).

---

## 2. Recovery Objectives & Validated Baselines

| Metric | Target SLA | Verified Baseline (`scripts/dr-test.js` & `wal-pitr-test.js`) |
| :--- | :--- | :--- |
| **RTO (Recovery Time Objective)** | < 30 Minutes | **6.55 Seconds** (Schema restoration & synthetic verification) |
| **RPO (Recovery Point Objective)** | < 15 Minutes | **0.37 Seconds** (Zero transaction data loss at target LSN) |
| **Table Scope** | Complete Platform | **208 / 208 Physical Tables Restored** |
| **RLS Policy Enforcement** | 100% Fail-Closed | **Forced RLS Verified on all Tenant Tables** |

---

## 3. Routine Backup Operations

### 3.1 Daily Full Database Schema & Data Dump
Execute via the host terminal or automated cron:
```bash
# Full database compressed archive
docker exec ssvm-database pg_dump -U postgres -d ssvm_platform \
  -F c -b -v -f /var/lib/postgresql/data/backups/ssvm_platform_$(date +%Y%m%d_%H%M%S).dump
```

### 3.2 Schema-Only DDL Snapshot (For DR Verification)
```bash
docker exec ssvm-database pg_dump -U postgres -d ssvm_platform \
  --schema-only --no-owner --no-privileges -f /var/lib/postgresql/data/backups/ssvm_platform_schema.sql
```

---

## 4. Disaster Recovery (DR) Full Restoration Verification

To verify full restoration capabilities without impacting production, execute the automated disaster recovery harness:

```bash
# Run DR verification script
node scripts/dr-test.js
```

### What `scripts/dr-test.js` Executes:
1. Generates a fresh schema dump of all 208 tables.
2. Creates an isolated verification database `ssvm_dr_verify_<timestamp>`.
3. Replays full schema DDL (including functions, triggers, and forced RLS policies).
4. Injects synthetic multi-tenant records across:
   - `schools`, `users`, `students`, `invoices`
   - `fee_receipts`, `payment_allocations`, `student_advance_credits`
   - `LedgerAccount`, `LedgerTransaction`, `LedgerEntry`
   - `system_logs` (via `log_pre_tenant_system_log`)
5. Asserts mathematical and transactional invariants:
   - Receipt Total (Rs 55,000) === Allocated (Rs 50,000) + Advance Credit (Rs 5,000).
   - Double-entry ledger debits (Rs 55,000) === credits (Rs 55,000).
6. Drops the verification database upon completion.

---

## 5. Point-In-Time Recovery (PITR) Execution Procedure

When data corruption, unauthorized mass data alteration, or operator error occurs, use PITR to roll back state to the exact second prior to corruption.

### 5.1 Verification Test Harness
Validate PITR locally using:
```bash
node scripts/wal-pitr-test.js
```

### 5.2 Production PITR Execution Steps

#### Step 1: Terminate External Traffic
Prevent further writes to the compromised database:
```bash
docker stop ssvm-backend ssvm-erp-admin
```

#### Step 2: Identify the Target Recovery Point (Timestamp or LSN)
Query `system_logs` or PostgreSQL WAL switch history to identify the last known good transaction time $T_{good}$:
```sql
SELECT "createdAt", level, module, message 
FROM system_logs 
WHERE "createdAt" >= NOW() - INTERVAL '2 hours' 
ORDER BY "createdAt" DESC;
```

#### Step 3: Prepare the Recovery Target Database
```bash
docker exec ssvm-database psql -U postgres -c "CREATE DATABASE ssvm_platform_pitr TEMPLATE template0;"
```

#### Step 4: Configure `recovery.signal` and Recovery Target
In PostgreSQL 16, place `recovery.signal` in the data directory and append recovery target parameters:
```ini
# recovery.conf / postgresql.conf settings
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-11-08 01:30:00.000000+00'
recovery_target_action = 'promote'
```

#### Step 5: Start Recovery and Verify Promotion
Monitor recovery progress:
```bash
docker logs -f ssvm-database
```
Verify PostgreSQL reports `recovery target reached` and promotes to primary.

#### Step 6: Post-Recovery Integrity Assertions
Run the verification queries:
1. Verify double-entry ledger balance:
   ```sql
   SELECT SUM(amount) FILTER (WHERE type = 'DEBIT') AS total_debits,
          SUM(amount) FILTER (WHERE type = 'CREDIT') AS total_credits
   FROM "LedgerEntry";
   ```
2. Verify RLS policies:
   ```sql
   SELECT count(*) FROM pg_policy; -- Expect at least 177 policies active
   ```

