# Database Roles and Permissions Specification

**Authoritative Specification for SSVM ERP Database Roles**  
**Lane A (Database Spine)**

---

## 1. Role Architecture Overview

The SSVM database security model enforces least privilege across four functional tiers:

| Role Name | Type | Superuser? | BypassRLS? | Primary Purpose | Privilege Boundary |
|-----------|------|------------|------------|-----------------|-------------------|
| `ssvm_app` | LOGIN | NO | NO | Core application runtime | Full CRUD on tables, strictly filtered by tenant RLS (`"schoolId" = current_tenant_id()`). Restricted from creating `SUPER_ADMIN`/`ERP_ADMIN` users or changing `role`/`schoolId`. |
| `ssvm_auth` | LOGIN | NO | NO | Authentication & Session Management | **Zero table privileges.** Granted `EXECUTE` exclusively on narrow `SECURITY DEFINER` functions (`auth_find_user_by_email`, `auth_find_student_by_admission`, session/token functions). |
| `ssvm_trusted` | LOGIN | NO | NO | Server-Side Audited Tasks | **Zero USING (true) policies.** Operations execute via audited transactions (`runWithTrustedDatabaseTransaction`) with strict purpose allowlists or via the tenant wrapper. |
| `ssvm_fixture` | LOGIN | NO | YES | Test Suite Fixture Generation | Full table privileges with `BYPASSRLS` for provisioning cross-school multi-tenant fixture state in automated test suites. |

---

## 2. NOLOGIN Group Roles

To decouple role permissions from deployment-specific login credentials and passwords, privileges are assigned to NOLOGIN group roles in database migrations:

```
[ ssvm_app_group ]     <-- Granted to ssvm_app
[ ssvm_auth_group ]    <-- Granted to ssvm_auth
[ ssvm_trusted_group ] <-- Granted to ssvm_trusted
[ ssvm_fixture_group ] <-- Granted to ssvm_fixture
```

- Schema migrations (`prisma/migrations`) manage:
  - Role definition (NOLOGIN group roles)
  - Table grants and sequence grants
  - Row Level Security policies
  - `SECURITY DEFINER` functions and trigger guards
- Provisioning script (`scripts/db/provision-roles.sql`) manages:
  - Creation of LOGIN roles (`WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`)
  - Assignment of passwords from environment/variables
  - Assignment of group role memberships (`GRANT ssvm_*_group TO ssvm_*`)

---

## 3. Least Privilege Enforcement Details

### 3.1 `ssvm_app` (Application Runtime)
- **Tenant Isolation**: Row Level Security is `ENABLED` and `FORCED` on all 174 tenant tables. The standard policy enforces:
  ```sql
  CREATE POLICY school_isolation ON <table>
    FOR ALL
    USING ("schoolId" = current_tenant_id())
    WITH CHECK ("schoolId" = current_tenant_id());
  ```
- **Privilege Escalation Guard**: The `trg_guard_user_role_school` trigger on `users` blocks `ssvm_app` from:
  1. Creating users with `role IN ('SUPER_ADMIN', 'ERP_ADMIN')`
  2. Modifying `users.role` on UPDATE
  3. Modifying `users.schoolId` on UPDATE
- **Student Enrollment**: Enrolling a student generates a login `User` record inside `runWithTenantDatabaseTransaction(schoolId, ...)` with `role = 'STUDENT'`.

### 3.2 `ssvm_auth` (Login & Token Management)
- **Zero Table Access**: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_auth, ssvm_auth_group;`
- **Zero Interim Policies**: All interim `USING (true)` table policies (`auth_user_select`, `auth_user_update`, etc.) are removed.
- **SECURITY DEFINER Functions**:
  - `auth_find_user_by_email(p_email text) RETURNS jsonb`: Resolves user credentials, guardian, and alumni records.
  - `auth_find_user_by_id(p_user_id text) RETURNS jsonb`: Resolves user profile by ID for session validation.
  - `auth_find_student_by_admission(p_admission_no text, p_school_id text) RETURNS jsonb`: Resolves student records matching admission number.
  - `auth_find_student_by_user_id(p_user_id text) RETURNS jsonb`: Resolves student profile linked to a user.
  - `auth_find_student_by_id(p_student_id text) RETURNS jsonb`: Resolves student record by student ID.
  - `auth_find_school_by_code(p_code text) RETURNS jsonb`: Resolves school code during multi-school student login.
  - `auth_update_password_hash(p_id text, p_type text, p_new_hash text)`: Performs in-place Argon2id password hash upgrades.
  - `auth_create_refresh_token(...)`, `auth_find_refresh_token(...)`, `auth_revoke_user_tokens(...)`: Refresh token lifecycle.
  - `auth_find_session(...)`, `auth_create_session(...)`, `auth_update_session(...)`, `auth_revoke_session(...)`, `auth_revoke_all_sessions(...)`: User session lifecycle.
  - `log_pre_tenant_auth_event(...)`: Logs pre-tenant login failures and authentication events.

### 3.3 `ssvm_trusted` (Audited System Operations)
- **Zero USING (true) Policies**: All 31 interim `trusted_*` table policies with `USING (true)` have been dropped.
- **Replacement Purpose Mapping**:
  1. **Payment Webhook**: Replaced by `resolve_payment_school(orderId)` function (returns `schoolId`), and subsequent execution runs inside `runWithTenantDatabaseTransaction(schoolId)`.
  2. **Student Enrollment User Creation**: Replaced by standard `prisma.user.create({ ... role: "STUDENT" })` inside the tenant wrapper as `ssvm_app`.
  3. **Super-Admin Cross-School Search**: Replaced by iterating schools through the tenant wrapper `runWithSchoolContext(school.id)`.
  4. **Session Management**: Replaced by `prisma.userSession` under authenticated tenant context.
  5. **Admin Audit Viewer**: Runs via audited `runWithTrustedDatabaseTransaction({ purpose: "ADMIN_AUDIT", actorId })`.
  6. **Logging**: Callers with known `schoolId` use the tenant wrapper; pre-tenant events use `log_pre_tenant_*` functions.

### 3.4 Database-Level Enforcement of Special Operations

#### 3.4.1 `PAYMENTS_WEBHOOK` Database-Level Enforcement
Payment webhooks arrive from external gateways (e.g. Razorpay) without a tenant identifier header (`x-school-id`), containing only transaction IDs (`orderId` or `paymentId`).
1. **RLS Denial on Raw Table Access**:
   - `payment_transactions` is a tenant table with `ROW LEVEL SECURITY ENABLED` and `FORCED`.
   - The RLS policy enforces `"schoolId" = current_tenant_id()`.
   - When a webhook request arrives without tenant context (`current_tenant_id()` is `NULL`), any direct `SELECT`, `UPDATE`, or `DELETE` on `payment_transactions` executed as `ssvm_app` returns **0 rows** (fail-closed).
2. **Narrow SECURITY DEFINER Function (`resolve_payment_school`)**:
   - In migration `20261102160000_security_definer_roles_and_guards`, access is controlled via:
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
   - **Information Boundary**: The function exposes *only* the `schoolId` string. No monetary values, student IDs, invoice numbers, or payment payloads are revealed.
   - **Post-Resolution Scoping**: After resolving `schoolId`, the application executes all payment processing inside `runWithTenantDatabaseTransaction(schoolId)` under `SET LOCAL app.current_school_id = schoolId`. If the order ID is invalid or nonexistent, `resolve_payment_school` returns `NULL` and execution terminates without exposing any database records.

#### 3.4.2 `SUPER_ADMIN_SEARCH` Database-Level Enforcement
A user with `SUPER_ADMIN` role may search across schools, but database-level security strictly prevents unbounded cross-tenant data access:
1. **Zero Database-Level Bypass**:
   - Neither `ssvm_app` nor `ssvm_trusted` has `rolbypassrls` (`rolbypassrls = false`).
   - Tenant tables (`students`, `teachers`, `invoices`, etc.) have no wildcard policy for super-admins in `pg_policy`.
   - Calling `runWithTrustedDatabaseTransaction({ purpose: "SUPER_ADMIN_SEARCH" })` sets `app.trusted_purpose = 'SUPER_ADMIN_SEARCH'`, but does **NOT** set `app.current_school_id`. Because `current_tenant_id()` remains `NULL`, executing a `SELECT` on any tenant table returns **0 rows**.
2. **Mandatory Explicit School Iteration**:
   - To query multiple schools, the application is required to query the global non-tenant `schools` table for active school IDs, and then iterate through them sequentially or concurrently by entering each school's tenant context individually via `runWithSchoolContext(targetSchoolId, ...)` or `runWithTenantDatabaseTransaction(targetSchoolId, ...)`.
   - Each individual query sets `app.current_school_id = targetSchoolId`, allowing the database RLS engine to restrict rows exclusively to that specific target school.
   - Any query executed without this explicit context or with an unauthorized purpose throws an exception or returns 0 rows.

---

## 4. Security Invariants Verified by Automated Tests

1. `ssvm_app` query without tenant context returns 0 rows (fail-closed).
2. `ssvm_app` in tenant context A cannot read or write rows belonging to tenant context B.
3. `ssvm_app` cannot create users with `SUPER_ADMIN` or `ERP_ADMIN` role.
4. `ssvm_app` cannot update `users.role` or `users.schoolId`.
5. `ssvm_auth` has no table permissions and cannot query `invoices` or any application table directly.
6. `ssvm_trusted` has zero `USING (true)` policies in `pg_policy` and zero total policies.
7. `PAYMENTS_WEBHOOK`: Querying `payment_transactions` without tenant context returns 0 rows; calling `resolve_payment_school('invalid')` returns `NULL`.
8. `SUPER_ADMIN_SEARCH`: Querying tenant tables under `SUPER_ADMIN_SEARCH` without tenant context returns 0 rows; calling with invalid purpose throws.
