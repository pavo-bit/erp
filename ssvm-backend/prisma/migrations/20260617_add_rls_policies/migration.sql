-- ═══════════════════════════════════════════
-- GAP 3: PostgreSQL Row Level Security (RLS)
-- ═══════════════════════════════════════════
-- Enforces tenant isolation at the database level.
-- Every row with a schoolId column is filtered by the
-- session variable `app.current_school_id`.
--
-- NOTE: All schoolId columns are TEXT (CUID strings), not integers.
-- The application must SET LOCAL app.current_school_id before every query.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Create bypass role for migrations and super-admin operations
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_superuser') THEN
    CREATE ROLE ssvm_superuser NOLOGIN;
    COMMENT ON ROLE ssvm_superuser IS 'Bypass role for RLS policies — used by migrations and super-admin';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Helper function to get current tenant ID from session
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_school_id', true), '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Enable RLS + Create Policies on Tenant-Scoped Tables
-- ─────────────────────────────────────────────────────────────────────
-- Policy logic:
--   - USING clause: Only return rows where schoolId matches current_tenant_id()
--   - WITH CHECK: Only allow inserts/updates where schoolId matches current_tenant_id()
--   - If current_tenant_id() is NULL (super-admin context), all rows visible
--   - The ssvm_superuser role bypasses all RLS

-- Macro-like function to create consistent policies
CREATE OR REPLACE FUNCTION setup_rls_for_table(table_name TEXT) RETURNS VOID AS $$
BEGIN
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

  -- Force RLS even for table owner (important for security)
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);

  -- Drop existing policy if any (idempotent)
  EXECUTE format('DROP POLICY IF EXISTS school_isolation ON %I', table_name);

  -- Create the isolation policy
  -- NULL tenant_id = super-admin bypass (sees everything)
  EXECUTE format(
    'CREATE POLICY school_isolation ON %I
     FOR ALL
     USING (
       current_tenant_id() IS NULL
       OR "schoolId" = current_tenant_id()
     )
     WITH CHECK (
       current_tenant_id() IS NULL
       OR "schoolId" = current_tenant_id()
     )',
    table_name
  );

  -- Grant bypass to ssvm_superuser
  EXECUTE format('ALTER TABLE %I OWNER TO CURRENT_USER', table_name);

  RAISE NOTICE 'RLS enabled on table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Apply RLS to all tenant-scoped tables
-- ─────────────────────────────────────────────────────────────────────
-- These are tables that have a "schoolId" column and must be isolated

SELECT setup_rls_for_table('students');
SELECT setup_rls_for_table('teachers');
SELECT setup_rls_for_table('invoices');
SELECT setup_rls_for_table('payment_transactions');
SELECT setup_rls_for_table('fee_categories');
SELECT setup_rls_for_table('fee_structures');
SELECT setup_rls_for_table('fine_rules');
SELECT setup_rls_for_table('attendance');
SELECT setup_rls_for_table('events');
SELECT setup_rls_for_table('assignments');
SELECT setup_rls_for_table('study_materials');
SELECT setup_rls_for_table('admissions');
SELECT setup_rls_for_table('salaries');
SELECT setup_rls_for_table('notifications');
SELECT setup_rls_for_table('audit_logs');
SELECT setup_rls_for_table('activity_logs');
SELECT setup_rls_for_table('documents');
SELECT setup_rls_for_table('books');
SELECT setup_rls_for_table('book_issues');
SELECT setup_rls_for_table('bulk_jobs');
SELECT setup_rls_for_table('communication_logs');
SELECT setup_rls_for_table('scholarships');
SELECT setup_rls_for_table('document_repository');

-- ─────────────────────────────────────────────────────────────────────
-- 5. Cleanup helper function (no longer needed after setup)
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS setup_rls_for_table(TEXT);

-- ─────────────────────────────────────────────────────────────────────
-- 6. Grant ssvm_superuser the ability to bypass RLS
-- ─────────────────────────────────────────────────────────────────────
-- The application connects with a normal role that respects RLS.
-- Super-admin operations can SET ROLE ssvm_superuser temporarily.
ALTER ROLE ssvm_superuser BYPASSRLS;
