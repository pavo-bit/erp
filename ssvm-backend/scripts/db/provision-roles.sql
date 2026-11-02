-- ════════════════════════════════════════════════════════════════════════════════
-- SSVM Database Role & Privilege Provisioning Script
-- ════════════════════════════════════════════════════════════════════════════════
-- Single authoritative, idempotent provisioning script for SSVM database roles:
-- 1. ssvm_app     : Runtime application role (strict RLS, tenant-scoped via current_setting)
-- 2. ssvm_auth    : Login-only least-privilege role (credential lookups, token/session management)
-- 3. ssvm_trusted : Named server-side background tasks (webhook, audit/event logs, super-admin search)
-- 4. ssvm_fixture : Test-only role with BYPASSRLS for cross-tenant test fixture generation
--
-- Passwords may be passed as psql variables:
--   psql -v app_password="..." -v auth_password="..." -v trusted_password="..." -v fixture_password="..." -f provision-roles.sql
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Provision Roles
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

-- 2. Schema USAGE
GRANT USAGE ON SCHEMA public TO ssvm_app, ssvm_auth, ssvm_trusted, ssvm_fixture;

-- 3. Provision ssvm_app (Runtime role, strict RLS enforced)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ssvm_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ssvm_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ssvm_app;

-- 4. Provision ssvm_fixture (Test-only fixture builder, bypasses RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ssvm_fixture;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_fixture;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ssvm_fixture;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ssvm_fixture;

-- 5. Provision ssvm_auth (Least-privilege Login Role)
-- Clear any residual table grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_auth;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ssvm_auth;
-- Lookups needed for staff and student login
GRANT SELECT ON users, schools, students, guardians, alumni TO ssvm_auth;
-- Session and refresh token management
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions, refresh_tokens TO ssvm_auth;

-- Column-level update permissions (password hash upgrades, last login timestamp; NO role/schoolId/isActive alteration)
GRANT UPDATE ("passwordHash", "lastLogin", "twoFactorSecret", "twoFactorEnabled", "twoFactorBackupCodes", "mustChangePassword", "passwordChangedAt", "updatedAt") ON users TO ssvm_auth;
GRANT UPDATE (password, "updatedAt") ON students TO ssvm_auth;

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

-- Narrow RLS Policies for ssvm_auth
CREATE POLICY auth_user_select ON users FOR SELECT TO ssvm_auth
  USING (true);
CREATE POLICY auth_user_update ON users FOR UPDATE TO ssvm_auth
  USING (true)
  WITH CHECK (true);

CREATE POLICY auth_student_select ON students FOR SELECT TO ssvm_auth
  USING (true);
CREATE POLICY auth_student_update ON students FOR UPDATE TO ssvm_auth
  USING (true)
  WITH CHECK (true);

CREATE POLICY auth_sessions ON user_sessions FOR ALL TO ssvm_auth
  USING (true)
  WITH CHECK (true);

CREATE POLICY auth_refresh_tokens ON refresh_tokens FOR ALL TO ssvm_auth
  USING (true)
  WITH CHECK (true);

CREATE POLICY auth_guardians ON guardians FOR SELECT TO ssvm_auth
  USING (true);

CREATE POLICY auth_alumni ON alumni FOR SELECT TO ssvm_auth
  USING (true);

-- 6. Provision ssvm_trusted (Named Server-Side Background Tasks)
-- Clear any residual table grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_trusted;

GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_trusted;

-- Specific Table Grants for Trusted Purposes:
-- - PAYMENTS_WEBHOOK: payment_transactions, invoices, LedgerAccount, SequenceCounter, LedgerTransaction, LedgerEntry
GRANT SELECT, INSERT, UPDATE ON payment_transactions TO ssvm_trusted;
GRANT SELECT, UPDATE ON invoices TO ssvm_trusted;
GRANT SELECT ON "LedgerAccount" TO ssvm_trusted;
GRANT SELECT, INSERT, UPDATE ON "SequenceCounter" TO ssvm_trusted;
GRANT SELECT, INSERT ON "LedgerTransaction" TO ssvm_trusted;
GRANT SELECT, INSERT ON "LedgerEntry" TO ssvm_trusted;

-- - SUPER_ADMIN_SEARCH: 13 search entities + relations
GRANT SELECT ON students, teachers, users, departments, guardians, invoices, assignments, classes, subjects, sections, admissions, events, notices, attendance, student_marks, exam_subjects, exams, alumni, document_repository, communication_logs, schools TO ssvm_trusted;

-- - STUDENT_ENROLLMENT: users (creating linked login user record)
GRANT SELECT, INSERT ON users TO ssvm_trusted;

-- - AUDIT_LOGGING & ADMIN_AUDIT & SECURITY_EVENT_LOGGING: audit_logs, system_logs
GRANT SELECT, INSERT ON audit_logs, system_logs TO ssvm_trusted;

-- - AUTH_EVENT_LOGGING: auth_events
GRANT SELECT, INSERT ON auth_events TO ssvm_trusted;

-- - SESSION_MANAGEMENT: user_sessions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO ssvm_trusted;

-- Drop obsolete trusted policies
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

-- Explicit Named RLS Policies for ssvm_trusted on each required table
CREATE POLICY trusted_payment_tx ON payment_transactions FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_invoices ON invoices FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_ledger_account ON "LedgerAccount" FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_sequence_counter ON "SequenceCounter" FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_ledger_tx ON "LedgerTransaction" FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_ledger_entry ON "LedgerEntry" FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_students ON students FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_teachers ON teachers FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_users ON users FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_departments ON departments FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_guardians ON guardians FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_assignments ON assignments FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_classes ON classes FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_subjects ON subjects FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_sections ON sections FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_admissions ON admissions FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_events ON events FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_notices ON notices FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_attendance ON attendance FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_student_marks ON student_marks FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_exam_subjects ON exam_subjects FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_exams ON exams FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_alumni ON alumni FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_document_repository ON document_repository FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_communication_logs ON communication_logs FOR SELECT TO ssvm_trusted
  USING (true);

CREATE POLICY trusted_audit_logs ON audit_logs FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_system_logs ON system_logs FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_auth_events ON auth_events FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

CREATE POLICY trusted_user_sessions ON user_sessions FOR ALL TO ssvm_trusted
  USING (true) WITH CHECK (true);

