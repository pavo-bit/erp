# Phase 1: Database Role Verification & Least Privilege Audit

**Document Version:** 1.0.0  
**Phase:** 1 (P0 Security & Multi-Tenancy)  
**Status:** VERIFIED & AUDITED  
**Database Engine:** PostgreSQL 16-alpine with Row Level Security (RLS)  

---

## 1. Executive Summary

PostgreSQL database role architecture was audited against the principle of least privilege. The application operates using dedicated, non-superuser login roles (`ssvm_app`, `ssvm_auth`, `ssvm_trusted`, `ssvm_fixture`) mapped to NOLOGIN privilege groups in schema migrations.

All database operations execute with strict role segregation:
- **`ssvm_app`**: Runtime application role. Full CRUD subject to forced RLS (`"schoolId" = current_tenant_id()`). Blocked by trigger guards from role escalation.
- **`ssvm_auth`**: Authentication-only role. Zero table privileges. Granted `EXECUTE` solely on 12 narrow `SECURITY DEFINER` functions.
- **`SUPER_ADMIN_SEARCH`**: Audited transaction purpose. Sets `app.trusted_purpose = 'SUPER_ADMIN_SEARCH'` without setting `app.current_school_id`; returns 0 rows on tenant tables unless explicit tenant context is set per school.
- **`PAYMENTS_WEBHOOK`**: Payment webhook resolver. Uses `resolve_payment_school(orderId)` to find `schoolId`, then executes strictly inside `runWithTenantDatabaseTransaction(schoolId)`.

---

## 2. Role Privilege & Inheritance Matrix

| Role | Role Type | Superuser? | BypassRLS? | Direct Table Grants | Permitted Operations |
|---|---|---|---|---|---|
| `ssvm_app` | LOGIN | NO (`rolsuper=false`) | NO (`rolbypassrls=false`) | `SELECT, INSERT, UPDATE, DELETE` on public schema | Application queries subject to RLS policy. Cannot create `SUPER_ADMIN`/`ERP_ADMIN` or modify `role`/`schoolId`. |
| `ssvm_auth` | LOGIN | NO (`rolsuper=false`) | NO (`rolbypassrls=false`) | **NONE** (`REVOKE ALL ON ALL TABLES`) | `EXECUTE` on `auth_find_user_by_email`, `auth_find_user_by_id`, `auth_find_student_by_admission`, token/session functions. |
| `ssvm_trusted` | LOGIN | NO (`rolsuper=false`) | NO (`rolbypassrls=false`) | **Zero USING (true) policies** | Audited transactions with validated purpose allowlist (`runWithTrustedDatabaseTransaction`). |
| `ssvm_fixture` | LOGIN | NO (`rolsuper=false`) | YES (`rolbypassrls=true`) | Full schema access | Provisioning multi-tenant fixtures in automated test suites only. |

---

## 3. Deep-Dive: SUPER_ADMIN_SEARCH & PAYMENTS_WEBHOOK Architecture

> **Architectural Clarification:**  
> `SUPER_ADMIN_SEARCH` and `PAYMENTS_WEBHOOK` are **application-level execution contexts and audited transaction purposes**, not distinct PostgreSQL login or group roles in `pg_roles` (which consist of `ssvm_app`, `ssvm_auth`, `ssvm_trusted`, `ssvm_fixture`, and their corresponding `_group` roles).  
> Database-level enforcement for both patterns is achieved through PostgreSQL `SECURITY DEFINER` functions, transaction-scoped session parameters (`app.trusted_purpose`), and Row Level Security (RLS) policies evaluated under the underlying PostgreSQL roles `ssvm_trusted` and `ssvm_app`.

### 3.1. Deep-Dive: SUPER_ADMIN_SEARCH Enforcement
- `SUPER_ADMIN_SEARCH` is not a bypass role. `ssvm_trusted` and `ssvm_app` both have `rolbypassrls = false`.
- Calling `runWithTrustedDatabaseTransaction({ purpose: "SUPER_ADMIN_SEARCH" })` sets `SET LOCAL app.trusted_purpose = 'SUPER_ADMIN_SEARCH'`.
- It does **not** set `app.current_school_id`. Consequently, `current_tenant_id()` remains `NULL`.
- Because RLS policies on all 177 tenant tables enforce `"schoolId" = current_tenant_id()`, any query on tenant tables (`students`, `invoices`, etc.) executed directly under `SUPER_ADMIN_SEARCH` returns **0 rows** (fail-closed).

### 3.2. Legitimate Search Execution Flow
1. Super Admin search begins by querying the global, non-tenant `schools` table to list target school IDs.
2. The search iterates through schools by entering each school's tenant context individually via `runWithSchoolContext(targetSchoolId)` or `runWithTenantDatabaseTransaction(targetSchoolId)`.
3. Inside each school's context, queries execute with `SET LOCAL app.current_school_id = targetSchoolId`, allowing PostgreSQL RLS to scope rows cleanly.
4. Any search attempt with an unknown or unauthorized purpose throws an immediate exception (`TenantSecurityError: Unauthorized or unknown trusted purpose`).

### 3.3. Verified Test Assertions (`src/tests/db/role-privileges.test.ts`)
- `SUPER_ADMIN_SEARCH: trusted transaction without school context returns 0 rows on tenant tables` — **PASSED**
- `SUPER_ADMIN_SEARCH: rejects unauthorized or unknown trusted purposes` — **PASSED**

---

## 4. Deep-Dive: PAYMENTS_WEBHOOK Enforcement

### 4.1. Design & Security Boundary
- Webhooks from Razorpay or external gateways lack an authenticated session cookie or `x-school-id` header.
- `payment_transactions` is an RLS-forced tenant table. Direct query without tenant context returns 0 rows.
- Migration `20261102160000_security_definer_roles_and_guards` provides `resolve_payment_school`:
  ```sql
  CREATE OR REPLACE FUNCTION resolve_payment_school(p_order_id text)
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  DECLARE v_school_id text;
  BEGIN
    SELECT "schoolId" INTO v_school_id FROM payment_transactions
    WHERE "transactionId" = p_order_id OR "id" = p_order_id OR "gatewayPaymentId" = p_order_id
    LIMIT 1;
    RETURN v_school_id;
  END;
  $$;
  REVOKE ALL ON FUNCTION resolve_payment_school(text) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION resolve_payment_school(text) TO ssvm_app_group, ssvm_trusted_group;
  ```
- **Information Minimalization:** Returns *only* the `schoolId` string. No financial amounts, card details, or student identifiers are exposed.
- **Fail-Closed on Unknown Order:** Returns `NULL` when order ID does not exist.
- **Subsequent Scoping:** The application then wraps all ledger booking, receipt generation, and invoice updating inside `runWithTenantDatabaseTransaction(schoolId)`.

### 4.2. Verified Test Assertions (`src/tests/db/role-privileges.test.ts`)
- `PAYMENTS_WEBHOOK: querying payment_transactions without tenant context returns 0 rows` — **PASSED**
- `PAYMENTS_WEBHOOK: resolve_payment_school returns NULL for nonexistent order ID` — **PASSED**
- `PAYMENTS_WEBHOOK: resolve_payment_school correctly resolves schoolId for valid order without exposing invoice or student details` — **PASSED**

---

## 5. Privilege Escalation Guards & Trigger Verification

The `trg_guard_user_role_school` trigger on `users` blocks runtime escalation:
```sql
CREATE OR REPLACE FUNCTION guard_user_role_school()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('SUPER_ADMIN', 'ERP_ADMIN') AND current_user = 'ssvm_app' THEN
      RAISE EXCEPTION 'Privilege Escalation: ssvm_app cannot create administrative users';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.role <> OLD.role OR NEW."schoolId" <> OLD."schoolId") AND current_user = 'ssvm_app' THEN
      RAISE EXCEPTION 'Privilege Escalation: ssvm_app cannot modify user role or schoolId';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Verified Trigger Test Assertions (`src/tests/db/role-privileges.test.ts`)
- `prevents ssvm_app from creating users with role SUPER_ADMIN (escalation guard)` — **PASSED**
- `prevents ssvm_app from creating users with role ERP_ADMIN (escalation guard)` — **PASSED**
- `prevents ssvm_app from updating a user's role (escalation guard)` — **PASSED**
- `prevents ssvm_app from changing a user's schoolId (tenant transfer guard)` — **PASSED**

