# SSVM ERP — Multi-Tenant Database Isolation Report
**Module:** Multi-Tenant Row-Level Security (RLS)  
**Target:** Fail-Closed Tenant Boundaries across Admissions & Student Data

---

## 1. Tenancy Architecture & RLS Invariant

SSVM ERP enforces strict multi-tenancy at the PostgreSQL level:
- Database user `ssvm_app` has `rolsuper=false` and `rolbypassrls=false`.
- PostgreSQL RLS policies enforce `school_id = current_setting('app.current_school_id', true)`.
- If `app.current_school_id` is missing or mismatched, all queries return zero records (fail-closed).
- Cross-tenant reads and mutations are rejected at the database engine level.

---

## 2. Test Verification Evidence

Verified in automated test `strictly isolates School A and School B student records and admission spaces`:
1. **Student Creation in School A:**
   - Admitted student `studentA` into `School A` (`schoolAId`).
2. **Cross-Tenant Query from School B:**
   - Switched PostgreSQL tenant session context to `School B` (`schoolBId`).
   - Executed query for `studentA.id`.
   - Result: Returned `null`. School B context cannot view or access School A students.
3. **Cross-Tenant Mutation Attempt:**
   - Attempted to modify School A student using School B context.
   - Result: Record not found; zero rows modified.
4. **Admission Number Namespace Isolation:**
   - Both School A and School B can allocate `ADM-2026-0001` independently without collision.

