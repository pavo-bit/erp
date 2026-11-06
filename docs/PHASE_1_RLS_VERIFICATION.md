# Phase 1: PostgreSQL Row-Level Security (RLS) Verification

**Document Version:** 1.0.0  
**Phase:** 1 (P0 Security & Multi-Tenancy)  
**Status:** 100% VERIFIED & VALIDATED  
**Coverage:** 208 Prisma Models / 177 Tenant-Classified Models  

---

## 1. Schema Classification Breakdown

Verified against Prisma DMMF via `scripts/generate-tenant-classification.cjs --check`:

- **Total Models in Schema:** **208**
- **Direct Tenant Models:** **127** (contain explicit `"schoolId"` column)
- **Indirect Tenant Models:** **50** (join to tenant parent models, e.g. `InvoiceItem`, `TimetableSlot`)
- **Global Models:** **31** (system-wide models, e.g. `School`, `SubscriptionPlanConfig`, `Permission`)
- **RLS-Enabled Tables:** **177** tables covered by migration `20261101150000_generated_tenant_rls` and `20261103100000_schema_updates_and_decimal`

---

## 2. Table Security Architecture

For every tenant-owned table in PostgreSQL:
1. `relrowsecurity = true`: Row Level Security is explicitly `ENABLED`.
2. `relforcerowsecurity = true`: `FORCE ROW LEVEL SECURITY` is applied. Even table owners and roles with `CREATEROLE` cannot bypass RLS when querying as `ssvm_app`.
3. Standard Tenant Policy:
   ```sql
   CREATE POLICY school_isolation ON <table_name>
     FOR ALL
     TO PUBLIC
     USING ("schoolId" = current_tenant_id())
     WITH CHECK ("schoolId" = current_tenant_id());
   ```
4. `current_tenant_id()` Implementation:
   ```sql
   CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
     SELECT NULLIF(current_setting('app.current_school_id', true), '');
   $$ LANGUAGE sql STABLE;
   ```
   - When `app.current_school_id` is unset or empty string, `current_tenant_id()` returns `NULL`.
   - Any query `USING ("schoolId" = NULL)` evaluates to `FALSE` for all rows.
   - **Fail-Closed Behavior:** In the absence of tenant context, zero rows are returned and zero rows can be inserted, updated, or deleted.

---

## 3. RLS Test Suite Execution & Evidence (`src/tests/db/tenant-rls.test.ts`)

Command executed:
```powershell
powershell -Command ". ..\scripts\test-env.ps1; npx vitest run --config vitest.rls.config.ts src/tests/db/tenant-rls.test.ts"
```

### Verified Test Results (182 Tests, 0 Failed, 0 Skipped):
- **177 Model Coverage Tests:** Iterated over `TENANT_MODEL_NAMES` verifying for each model:
  - Table exists in PostgreSQL (`to_regclass(public.<table_name>) IS NOT NULL`).
  - Table has `relrowsecurity = true`.
  - Table has `relforcerowsecurity = true`.
  - Active policy exists in `pg_policies` containing `current_tenant_id()`.
  - Policy contains no bypass clauses (`IS NULL`).
- **Fail-Closed Test:** `fails closed when a tenant setting is absent` -> returns `[]` (0 rows).
- **Tenant Isolation Test:** `returns only the active tenant's rows` -> returns only School A rows in School A context.
- **Cross-Tenant Write Test:** `rejects a write for a different tenant` -> database throws RLS policy check violation.
- **Connection Reuse Test:** `ensures connection reuse after COMMIT resets tenant context to empty (no leakage)` -> subsequent query on returned pooled connection yields 0 rows.
- **Cross-Tenant Mutation Test:** `prevents updating or deleting rows belonging to another tenant (0 rows affected)` -> `UPDATE` and `DELETE` on School B rows while in School A context return 0 affected rows.

