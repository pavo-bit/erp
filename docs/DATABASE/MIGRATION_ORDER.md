# SSVM ERP — Database Migration Ordering & Upgrade Audit

**Canonical Document:** `docs/DATABASE/MIGRATION_ORDER.md`  
**Target:** Database Engineering & Deployment Architecture  
**Working Branch:** `lane/p1-security`  
**Verification Script:** `ssvm-backend/scripts/test-upgrade-flow.ts`

---

## 1. Context & Identified Migration Chronology Issue

During repository consolidation into `main`, two migrations related to user password setup tokens were introduced:
- `20261101160000_password_setup_tokens`
- `20261101170000_password_setup_token_functions`

These two folders carry timestamps on `2026-11-01` (`16:00:00` and `17:00:00`), which chronologically precede subsequent migrations that were developed in parallel feature branches:
- `20261102160000_security_definer_roles_and_guards`
- `20261103100000_schema_updates_and_decimal`
- `20261104020000_receipt_unique_indexes`
- `20261105120000_b2_finance_followups`
- `20261107160000_cash_collection_and_allocations`
- `20261108173000_library_enterprise_and_borrowing_history`
- `20261112130000_admission_operational_handoff`
- `20261112150000_school_shift_classes`

---

## 2. Invariant Rule on Existing Migration Directories

Per Hard Rule 3 and Prisma ORM migration engine specifications:
1. **Never Rename or Modify Applied Migrations:** Existing migration directory names form the primary key in PostgreSQL table `_prisma_migrations` (`migration_name`). Renaming them on `main` causes checksum mismatches (`P3005`/`P3009` drift errors) on any staging or production database where migrations have already run.
2. **Deterministic Sequence Resolution:** Because Prisma sorts migrations alphabetically/lexicographically by folder name timestamp:
   - On a **fresh database deployment**, `20261101160000` and `20261101170000` apply immediately after `20261101150000_generated_tenant_rls` and prior to `20261102160000`.
   - On an **upgraded database deployment** where `20261102...` through `20261112...` had previously executed, Prisma detects `20261101160000` and `20261101170000` as pending unapplied migrations and executes them cleanly in transaction isolation without schema conflict.

---

## 3. Automated Upgrade Flow Verification

Schema equivalence between fresh and upgraded databases was validated using:
```bash
cd ssvm-backend
npx tsx scripts/test-upgrade-flow.ts
```

### Verification Pipeline:
1. **[1/7] Initializing fresh upgrade database:** Drops and recreates `ssvm_upgrade_test`.
2. **[2/7] Deploying baseline migrations:** Applies the 4 earliest baseline migrations (`20261101130000` through `20261101150000`).
3. **[3/7] Provisioning roles:** Executes `scripts/db/provision-roles.sql` configuring unprivileged runtime role `ssvm_app`.
4. **[4/7] Inserting real tenant fixtures:** Seeds 2 schools, multiple students (with and without user accounts), invoices with legacy float balances, and inventory records with multi-tenant identical SKUs.
5. **[5/7] Executing incremental branch migrations:** Runs `npx prisma migrate deploy` applying all 10 remaining migrations in sequence (including `20261101160000` and `20261101170000`).
6. **[6/7] Verifying data integrity:** Validates zero entity loss, exact Decimal conversions (half-up rounding), and automatic backfill of student user accounts with Argon2id hash and `mustChangePassword=true`.
7. **[7/7] Chart of accounts & RLS enforcement:** Confirms 14 standard accounts per school, idempotent seeding, and strict fail-closed RLS on all tenant tables for `ssvm_app`.

**Result:** `ALL UPGRADE VERIFICATIONS PASSED!` with zero errors.

