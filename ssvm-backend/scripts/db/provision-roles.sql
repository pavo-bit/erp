-- ════════════════════════════════════════════════════════════════════════════════
-- SSVM Database Role & Privilege Provisioning Script
-- ════════════════════════════════════════════════════════════════════════════════
-- Single authoritative, idempotent provisioning script for SSVM database roles:
-- 1. ssvm_app     : Runtime application role (strict RLS, tenant-scoped via current_tenant_id())
-- 2. ssvm_auth    : Login-only least-privilege role (credential lookups via SECURITY DEFINER functions)
-- 3. ssvm_trusted : Named server-side background tasks (audited functions, no USING (true) policies)
-- 4. ssvm_fixture : Test-only role with BYPASSRLS for cross-tenant test fixture generation
--
-- Passwords may be passed as psql variables:
--   psql -v app_password="..." -v auth_password="..." -v trusted_password="..." -v fixture_password="..." -f provision-roles.sql
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Provision NOLOGIN Group Roles (if not already created by migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_app_group') THEN
    CREATE ROLE ssvm_app_group NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_auth_group') THEN
    CREATE ROLE ssvm_auth_group NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_trusted_group') THEN
    CREATE ROLE ssvm_trusted_group NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_fixture_group') THEN
    CREATE ROLE ssvm_fixture_group NOLOGIN;
  END IF;
END $$;

-- 2. Provision LOGIN Roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_app') THEN
    CREATE ROLE ssvm_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ssvm_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_auth') THEN
    CREATE ROLE ssvm_auth WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ssvm_auth WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_trusted') THEN
    CREATE ROLE ssvm_trusted WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ssvm_trusted WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssvm_fixture') THEN
    CREATE ROLE ssvm_fixture WITH LOGIN NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ssvm_fixture WITH LOGIN NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- Set passwords if provided via psql variables
\if :{?app_password}
  ALTER ROLE ssvm_app WITH PASSWORD :'app_password';
\endif

\if :{?auth_password}
  ALTER ROLE ssvm_auth WITH PASSWORD :'auth_password';
\endif

\if :{?trusted_password}
  ALTER ROLE ssvm_trusted WITH PASSWORD :'trusted_password';
\endif

\if :{?fixture_password}
  ALTER ROLE ssvm_fixture WITH PASSWORD :'fixture_password';
\endif

-- 3. Assign Group Memberships
GRANT ssvm_app_group TO ssvm_app;
GRANT ssvm_auth_group TO ssvm_auth;
GRANT ssvm_trusted_group TO ssvm_trusted;
GRANT ssvm_fixture_group TO ssvm_fixture;

-- 4. Schema USAGE
GRANT USAGE ON SCHEMA public TO ssvm_app, ssvm_auth, ssvm_trusted, ssvm_fixture;
GRANT USAGE ON SCHEMA public TO ssvm_app_group, ssvm_auth_group, ssvm_trusted_group, ssvm_fixture_group;

-- 5. ssvm_app Grants (Runtime role, strict RLS enforced)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ssvm_app, ssvm_app_group;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_app, ssvm_app_group;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ssvm_app_group;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ssvm_app_group;

-- 6. ssvm_fixture Grants (Test-only fixture builder, bypasses RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ssvm_fixture, ssvm_fixture_group;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_fixture, ssvm_fixture_group;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ssvm_fixture_group;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ssvm_fixture_group;

-- 7. ssvm_auth Grants (Least-privilege Login Role)
-- Revoke all table access: access exclusively via SECURITY DEFINER functions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_auth, ssvm_auth_group;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ssvm_auth, ssvm_auth_group;

-- Drop obsolete auth policies
DROP POLICY IF EXISTS auth_user_login ON users;
DROP POLICY IF EXISTS auth_user_select ON users;
DROP POLICY IF EXISTS auth_user_update ON users;
DROP POLICY IF EXISTS auth_students ON students;
DROP POLICY IF EXISTS auth_student_select ON students;
DROP POLICY IF EXISTS auth_student_update ON students;
DROP POLICY IF EXISTS auth_sessions ON user_sessions;
DROP POLICY IF EXISTS auth_refresh_tokens ON refresh_tokens;
DROP POLICY IF EXISTS auth_guardians ON guardians;
DROP POLICY IF EXISTS auth_alumni ON alumni;
DROP POLICY IF EXISTS auth_teachers ON teachers;
DROP POLICY IF EXISTS auth_audit_logs ON audit_logs;
DROP POLICY IF EXISTS auth_system_logs ON system_logs;
DROP POLICY IF EXISTS auth_role_events ON auth_events;

-- 8. ssvm_trusted Grants (Zero USING (true) policies)
-- Revoke all table access: operations go through tenant wrapper or SECURITY DEFINER functions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_trusted, ssvm_trusted_group;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_trusted, ssvm_trusted_group;

-- Drop obsolete trusted policies
DROP POLICY IF EXISTS trusted_academic_sessions ON academic_sessions;
DROP POLICY IF EXISTS trusted_fee_structures ON fee_structures;
DROP POLICY IF EXISTS trusted_payment_tx ON payment_transactions;
DROP POLICY IF EXISTS trusted_invoices ON invoices;
DROP POLICY IF EXISTS trusted_ledger_account ON "LedgerAccount";
DROP POLICY IF EXISTS trusted_sequence_counter ON "SequenceCounter";
DROP POLICY IF EXISTS trusted_ledger_tx ON "LedgerTransaction";
DROP POLICY IF EXISTS trusted_ledger_entry ON "LedgerEntry";
DROP POLICY IF EXISTS trusted_students ON students;
DROP POLICY IF EXISTS trusted_teachers ON teachers;
DROP POLICY IF EXISTS trusted_users ON users;
DROP POLICY IF EXISTS trusted_departments ON departments;
DROP POLICY IF EXISTS trusted_guardians ON guardians;
DROP POLICY IF EXISTS trusted_assignments ON assignments;
DROP POLICY IF EXISTS trusted_classes ON classes;
DROP POLICY IF EXISTS trusted_subjects ON subjects;
DROP POLICY IF EXISTS trusted_sections ON sections;
DROP POLICY IF EXISTS trusted_admissions ON admissions;
DROP POLICY IF EXISTS trusted_events ON events;
DROP POLICY IF EXISTS trusted_notices ON notices;
DROP POLICY IF EXISTS trusted_attendance ON attendance;
DROP POLICY IF EXISTS trusted_student_marks ON student_marks;
DROP POLICY IF EXISTS trusted_exam_subjects ON exam_subjects;
DROP POLICY IF EXISTS trusted_exams ON exams;
DROP POLICY IF EXISTS trusted_alumni ON alumni;
DROP POLICY IF EXISTS trusted_document_repository ON document_repository;
DROP POLICY IF EXISTS trusted_communication_logs ON communication_logs;
DROP POLICY IF EXISTS trusted_audit_logs ON audit_logs;
DROP POLICY IF EXISTS trusted_system_logs ON system_logs;
DROP POLICY IF EXISTS trusted_auth_events ON auth_events;
DROP POLICY IF EXISTS trusted_user_sessions ON user_sessions;
