-- ════════════════════════════════════════════════════════════════════════════════
-- Migration: 20261102160000_security_definer_roles_and_guards
-- Purpose:
-- 1. Create NOLOGIN group roles (ssvm_app_group, ssvm_auth_group, ssvm_trusted_group, ssvm_fixture_group)
-- 2. Define narrow SECURITY DEFINER functions for authentication, payment school resolution, and logging
-- 3. Install user role & school guard trigger (prevents ssvm_app from creating SUPER_ADMIN/ERP_ADMIN or altering role/schoolId)
-- 4. Drop interim USING (true) policies on ssvm_trusted and ssvm_auth
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Create NOLOGIN Group Roles
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

-- 2. Schema USAGE and Group Grants
GRANT USAGE ON SCHEMA public TO ssvm_app_group, ssvm_auth_group, ssvm_trusted_group, ssvm_fixture_group;

-- ssvm_app_group (runtime data manipulation under strict RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ssvm_app_group;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_app_group;

-- ssvm_fixture_group (test fixture generation)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ssvm_fixture_group;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ssvm_fixture_group;

-- ssvm_auth_group & ssvm_trusted_group: zero table access. Access exclusively through SECURITY DEFINER functions.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ssvm_auth_group, ssvm_trusted_group;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ssvm_auth_group;

-- 3. Payment School Resolution Function
CREATE OR REPLACE FUNCTION resolve_payment_school(p_order_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_school_id text;
BEGIN
  SELECT "schoolId" INTO v_school_id
  FROM payment_transactions
  WHERE "transactionId" = p_order_id
     OR "id" = p_order_id
     OR "gatewayPaymentId" = p_order_id
  LIMIT 1;
  RETURN v_school_id;
END;
$$;
REVOKE ALL ON FUNCTION resolve_payment_school(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_payment_school(text) TO ssvm_app_group, ssvm_trusted_group;

-- 4. User Role & School Guard Trigger
CREATE OR REPLACE FUNCTION check_user_role_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('ssvm_app', 'ssvm_auth') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role::text IN ('SUPER_ADMIN', 'ERP_ADMIN') THEN
        RAISE EXCEPTION 'permission denied: role % cannot be created by %', NEW.role, current_user;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'permission denied: cannot modify users.role as %', current_user;
      END IF;
      IF NEW."schoolId" IS DISTINCT FROM OLD."schoolId" THEN
        RAISE EXCEPTION 'permission denied: cannot modify users.schoolId as %', current_user;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_role_school ON users;
CREATE TRIGGER trg_guard_user_role_school
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_role_guard();

-- 5. Pre-tenant Logging Functions
CREATE OR REPLACE FUNCTION log_pre_tenant_auth_event(
  p_event_type text,
  p_user_id text DEFAULT NULL,
  p_school_id text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_ua text DEFAULT NULL,
  p_success boolean DEFAULT false,
  p_fail_reason text DEFAULT NULL,
  p_metadata text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
BEGIN
  v_id := 'ae_' || md5(random()::text || clock_timestamp()::text);
  INSERT INTO auth_events (id, "eventType", "userId", "schoolId", "ipAddress", "userAgent", success, "failReason", metadata, "createdAt")
  VALUES (v_id, p_event_type::"AuthEventType", p_user_id, p_school_id, p_ip, p_ua, p_success, p_fail_reason, CASE WHEN p_metadata IS NULL THEN NULL ELSE p_metadata::jsonb END, NOW());
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION log_pre_tenant_auth_event(text, text, text, text, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_pre_tenant_auth_event(text, text, text, text, text, boolean, text, text) TO ssvm_app_group, ssvm_auth_group, ssvm_trusted_group;

CREATE OR REPLACE FUNCTION log_pre_tenant_system_log(
  p_level text,
  p_module text,
  p_message text,
  p_metadata text DEFAULT NULL,
  p_school_id text DEFAULT NULL,
  p_user_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
BEGIN
  v_id := 'sl_' || md5(random()::text || clock_timestamp()::text);
  INSERT INTO system_logs (id, level, module, message, metadata, "schoolId", "userId", "createdAt")
  VALUES (v_id, p_level, p_module, p_message, p_metadata, p_school_id, p_user_id, NOW());
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION log_pre_tenant_system_log(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_pre_tenant_system_log(text, text, text, text, text, text) TO ssvm_app_group, ssvm_auth_group, ssvm_trusted_group;

CREATE OR REPLACE FUNCTION log_pre_tenant_audit_log(
  p_action text,
  p_entity text,
  p_school_id text DEFAULT NULL,
  p_user_id text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_details text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_device text DEFAULT NULL,
  p_impersonated_by text DEFAULT NULL,
  p_previous_hash text DEFAULT NULL,
  p_hash text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
BEGIN
  v_id := 'al_' || md5(random()::text || clock_timestamp()::text);
  INSERT INTO audit_logs (id, action, entity, "schoolId", "userId", "entityId", details, reason, "ipAddress", device, "impersonatedBy", "previousHash", hash, "createdAt")
  VALUES (v_id, p_action, p_entity, p_school_id, p_user_id, p_entity_id, p_details, p_reason, p_ip, p_device, p_impersonated_by, p_previous_hash, p_hash, NOW());
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION log_pre_tenant_audit_log(text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_pre_tenant_audit_log(text, text, text, text, text, text, text, text, text, text, text, text) TO ssvm_app_group, ssvm_trusted_group;

-- 6. Narrow Authentication SECURITY DEFINER Functions
CREATE OR REPLACE FUNCTION auth_find_user_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'passwordHash', u."passwordHash",
    'name', u.name,
    'role', u.role::text,
    'phone', u.phone,
    'avatar', u.avatar,
    'schoolId', u."schoolId",
    'branchId', u."branchId",
    'isActive', u."isActive",
    'mustChangePassword', u."mustChangePassword",
    'twoFactorEnabled', u."twoFactorEnabled",
    'twoFactorSecret', u."twoFactorSecret",
    'twoFactorBackupCodes', u."twoFactorBackupCodes",
    'lastLogin', u."lastLogin",
    'guardian', (
      SELECT jsonb_build_object(
        'id', g.id,
        'students', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'schoolId', s."schoolId"))
          FROM students s WHERE s."guardianId" = g.id
        ), '[]'::jsonb)
      )
      FROM guardians g WHERE g."userId" = u.id LIMIT 1
    ),
    'alumni', (
      SELECT jsonb_build_object('id', a.id, 'batch', a.batch)
      FROM alumni a WHERE a."userId" = u.id LIMIT 1
    )
  ) INTO v_result
  FROM users u
  WHERE LOWER(u.email) = LOWER(p_email);

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_user_by_id(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'passwordHash', u."passwordHash",
    'name', u.name,
    'role', u.role::text,
    'phone', u.phone,
    'avatar', u.avatar,
    'schoolId', u."schoolId",
    'branchId', u."branchId",
    'isActive', u."isActive",
    'mustChangePassword', u."mustChangePassword",
    'twoFactorEnabled', u."twoFactorEnabled",
    'lastLogin', u."lastLogin",
    'createdAt', u."createdAt"
  ) INTO v_result
  FROM users u
  WHERE u.id = p_user_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_student_by_admission(p_admission_no text, p_school_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'admissionNo', s."admissionNo",
    'password', s.password,
    'schoolId', s."schoolId",
    'userId', s."userId",
    'isActive', s."isActive",
    'school', (SELECT jsonb_build_object('id', sc.id, 'name', sc.name, 'code', sc.code) FROM schools sc WHERE sc.id = s."schoolId"),
    'user', (SELECT jsonb_build_object('id', u.id, 'email', u.email, 'name', u.name, 'role', u.role::text, 'isActive', u."isActive", 'schoolId', u."schoolId", 'branchId', u."branchId") FROM users u WHERE u.id = s."userId")
  )) INTO v_result
  FROM students s
  WHERE s."admissionNo" = p_admission_no
    AND (p_school_id IS NULL OR s."schoolId" = p_school_id);

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_student_by_user_id(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'admissionNo', s."admissionNo",
    'schoolId', s."schoolId",
    'isActive', s."isActive"
  ) INTO v_result
  FROM students s
  WHERE s."userId" = p_user_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_student_by_id(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'admissionNo', s."admissionNo",
    'schoolId', s."schoolId",
    'isActive', s."isActive",
    'createdAt', s."createdAt"
  ) INTO v_result
  FROM students s
  WHERE s.id = p_student_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_school_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', sc.id,
    'code', sc.code,
    'name', sc.name,
    'isActive', sc."isActive"
  ) INTO v_result
  FROM schools sc
  WHERE sc.code = p_code;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_update_password_hash(p_id text, p_type text, p_new_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_type = 'USER' THEN
    UPDATE users
    SET "passwordHash" = p_new_hash, "updatedAt" = NOW()
    WHERE id = p_id;
  ELSIF p_type = 'STUDENT' THEN
    UPDATE students
    SET password = p_new_hash, "updatedAt" = NOW()
    WHERE id = p_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION auth_create_refresh_token(
  p_token text,
  p_user_id text,
  p_expires_at timestamptz,
  p_ip text,
  p_ua text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
BEGIN
  v_id := 'rt_' || md5(random()::text || clock_timestamp()::text);
  INSERT INTO refresh_tokens (id, token, "userId", "expiresAt", "ipAddress", "userAgent", "createdAt")
  VALUES (v_id, p_token, p_user_id, p_expires_at, p_ip, p_ua, NOW());

  RETURN jsonb_build_object('id', v_id, 'token', p_token, 'userId', p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_refresh_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', rt.id,
    'token', rt.token,
    'userId', rt."userId",
    'expiresAt', rt."expiresAt",
    'revokedAt', rt."revokedAt",
    'user', (
      SELECT jsonb_build_object(
        'id', u.id, 'email', u.email, 'name', u.name, 'role', u.role::text,
        'isActive', u."isActive", 'schoolId', u."schoolId", 'branchId', u."branchId"
      )
      FROM users u WHERE u.id = rt."userId"
    )
  ) INTO v_result
  FROM refresh_tokens rt
  WHERE rt.token = p_token;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_revoke_user_tokens(p_user_id text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE refresh_tokens
  SET "revokedAt" = NOW()
  WHERE "userId" = p_user_id AND "revokedAt" IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_session(p_user_id text, p_fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'sessionId', s."sessionId",
    'userId', s."userId",
    'refreshFamily', s."refreshFamily",
    'deviceFingerprint', s."deviceFingerprint",
    'ipAddress', s."ipAddress",
    'lastSeen', s."lastSeen",
    'isActive', s."isActive",
    'expiresAt', s."expiresAt"
  ) INTO v_result
  FROM user_sessions s
  WHERE s."userId" = p_user_id AND s."deviceFingerprint" = p_fingerprint
  LIMIT 1;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION auth_create_session(
  p_user_id text,
  p_session_id text,
  p_family text,
  p_fingerprint text,
  p_ip text,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
BEGIN
  v_id := 'sess_' || md5(random()::text || clock_timestamp()::text);
  INSERT INTO user_sessions (id, "userId", "sessionId", "refreshFamily", "deviceFingerprint", "ipAddress", "lastSeen", "isActive", "expiresAt", "createdAt")
  VALUES (v_id, p_user_id, p_session_id, p_family, p_fingerprint, p_ip, NOW(), true, p_expires_at, NOW());

  RETURN jsonb_build_object('id', v_id, 'sessionId', p_session_id, 'userId', p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION auth_update_session(
  p_id text,
  p_family text,
  p_ip text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_sessions
  SET "lastSeen" = NOW(),
      "ipAddress" = p_ip,
      "isActive" = true,
      "refreshFamily" = p_family,
      "expiresAt" = p_expires_at
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION auth_revoke_session(p_session_id text, p_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_sessions
  SET "isActive" = false
  WHERE ("sessionId" = p_session_id OR id = p_session_id)
    AND "userId" = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION auth_revoke_all_sessions(p_user_id text, p_except_session_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_sessions
  SET "isActive" = false
  WHERE "userId" = p_user_id
    AND "isActive" = true
    AND (p_except_session_id IS NULL OR "sessionId" <> p_except_session_id);
END;
$$;

CREATE OR REPLACE FUNCTION auth_update_user_last_login(p_id text, p_last_login timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE users
  SET "lastLogin" = p_last_login
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION auth_revoke_refresh_token(p_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE refresh_tokens
  SET "revokedAt" = NOW()
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_active_sessions(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'userId', s."userId",
        'sessionId', s."sessionId",
        'lastSeen', s."lastSeen",
        'isActive', s."isActive",
        'deviceFingerprint', s."deviceFingerprint",
        'refreshFamily', s."refreshFamily"
      ) ORDER BY s."lastSeen" ASC
    ),
    '[]'::jsonb
  ) INTO v_res
  FROM user_sessions s
  WHERE s."userId" = p_user_id AND s."isActive" = true;

  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION auth_deactivate_sessions(p_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_sessions
  SET "isActive" = false
  WHERE id = ANY(p_ids);
END;
$$;

CREATE OR REPLACE FUNCTION auth_find_school_admin(p_school_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'name', u.name,
    'role', u.role::text,
    'schoolId', u."schoolId"
  ) INTO v_admin
  FROM users u
  WHERE u."schoolId" = p_school_id
    AND u.role = 'ERP_ADMIN'
    AND u."isActive" = true
  LIMIT 1;

  RETURN v_admin;
END;
$$;

REVOKE ALL ON FUNCTION auth_find_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_user_by_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_school_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_update_user_last_login(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_student_by_admission(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_student_by_user_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_student_by_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_school_by_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_update_password_hash(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_create_refresh_token(text, text, timestamptz, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_refresh_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_revoke_refresh_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_revoke_user_tokens(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_session(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_active_sessions(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_create_session(text, text, text, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_update_session(text, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_deactivate_sessions(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_revoke_session(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_revoke_all_sessions(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION auth_find_user_by_email(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_user_by_id(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_school_admin(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_update_user_last_login(text, timestamptz) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_student_by_admission(text, text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_student_by_user_id(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_student_by_id(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_school_by_code(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_update_password_hash(text, text, text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_create_refresh_token(text, text, timestamptz, text, text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_refresh_token(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_revoke_refresh_token(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_revoke_user_tokens(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_session(text, text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_find_active_sessions(text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_create_session(text, text, text, text, text, timestamptz) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_update_session(text, text, text, timestamptz) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_deactivate_sessions(text[]) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_revoke_session(text, text) TO ssvm_auth_group;
GRANT EXECUTE ON FUNCTION auth_revoke_all_sessions(text, text) TO ssvm_auth_group;

-- 7. Drop Obsolete Interim Policies (Eliminating USING (true) policies)
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
