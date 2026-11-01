-- Generated from docs/DATABASE/TENANT_CLASSIFICATION.json; do not edit manually.
-- No NULL-tenant wildcard: missing tenant context denies access.
-- The audited super-admin path must use its separate privileged connection.
DO $tenant_rls$
BEGIN
  IF to_regclass(format('%I.%I', 'public', 'academic_sessions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'academic_sessions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'academic_sessions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'academic_sessions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'academic_sessions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'activity_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'activity_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'activity_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'activity_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'activity_logs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'admissions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'admissions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'admissions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'admissions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'admissions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'admission_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'admission_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'admission_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'admission_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "admissions" AS "tenant_ref_0" WHERE "admission_logs"."admissionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "admissions" AS "tenant_ref_0" WHERE "admission_logs"."admissionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'admission_logs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'alumni')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'alumni');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'alumni');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'alumni');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "alumni"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "alumni"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'alumni');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'assignments')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assignments');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assignments');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assignments');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'assignments');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'assignment_attachments')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assignment_attachments');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assignment_attachments');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assignment_attachments');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_attachments"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_attachments"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'assignment_attachments');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'assignment_submissions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assignment_submissions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assignment_submissions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assignment_submissions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_submissions"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_submissions"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'assignment_submissions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'attendance')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'attendance');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'attendance');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'attendance');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'attendance');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'audit_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'audit_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'audit_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'audit_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'audit_logs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'books')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'books');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'books');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'books');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'books');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'book_issues')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'book_issues');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'book_issues');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'book_issues');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'book_issues');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'branches')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'branches');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'branches');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'branches');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'branches');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'bulk_jobs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'bulk_jobs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'bulk_jobs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'bulk_jobs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'bulk_jobs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'classes')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'classes');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'classes');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'classes');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'classes');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'class_subjects')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'class_subjects');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'class_subjects');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'class_subjects');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "class_subjects"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "class_subjects"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'class_subjects');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'class_teachers')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'class_teachers');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'class_teachers');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'class_teachers');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "class_teachers"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "class_teachers"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'class_teachers');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'communication_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'communication_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'communication_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'communication_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'communication_logs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'communication_templates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'communication_templates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'communication_templates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'communication_templates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'communication_templates');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'contributions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'contributions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'contributions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'contributions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "alumni" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."userId" = "tenant_ref_1"."id" WHERE "contributions"."alumniId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "alumni" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."userId" = "tenant_ref_1"."id" WHERE "contributions"."alumniId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'contributions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'departments')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'departments');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'departments');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'departments');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'departments');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'documents')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'documents');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'documents');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'documents');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'documents');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'document_repository')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'document_repository');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'document_repository');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'document_repository');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'document_repository');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'events')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'events');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'events');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'events');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'events');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'exams')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'exams');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'exams');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'exams');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'exams');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'exam_subjects')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'exam_subjects');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'exam_subjects');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'exam_subjects');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "exams" AS "tenant_ref_0" WHERE "exam_subjects"."examId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "exams" AS "tenant_ref_0" WHERE "exam_subjects"."examId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'exam_subjects');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'fee_categories')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'fee_categories');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'fee_categories');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'fee_categories');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'fee_categories');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'fee_structures')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'fee_structures');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'fee_structures');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'fee_structures');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'fee_structures');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'fine_rules')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'fine_rules');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'fine_rules');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'fine_rules');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'fine_rules');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'gallery_images')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'gallery_images');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'gallery_images');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'gallery_images');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'gallery_images');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'guardians')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'guardians');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'guardians');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'guardians');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'guardians');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'invoices')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'invoices');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'invoices');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'invoices');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'invoices');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'leave_requests')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'leave_requests');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'leave_requests');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'leave_requests');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "leave_requests"."requesterId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "leave_requests"."requesterId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'leave_requests');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'message_templates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_templates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_templates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_templates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'message_templates');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'notices')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notices');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notices');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notices');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notices');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'notifications')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notifications');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notifications');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notifications');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notifications');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'notification_templates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notification_templates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notification_templates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notification_templates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notification_templates');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'onboarding_progress')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'onboarding_progress');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'onboarding_progress');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'onboarding_progress');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'onboarding_progress');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'payment_transactions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'payment_transactions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'payment_transactions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'payment_transactions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'payment_transactions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'refresh_tokens')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'refresh_tokens');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'refresh_tokens');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'refresh_tokens');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "refresh_tokens"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "refresh_tokens"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'refresh_tokens');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'report_templates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'report_templates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'report_templates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'report_templates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'report_templates');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'salaries')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'salaries');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'salaries');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'salaries');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'salaries');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'scholarships')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'scholarships');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'scholarships');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'scholarships');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'scholarships');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'sections')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'sections');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'sections');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'sections');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "sections"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "sections"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'sections');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'site_content')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'site_content');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'site_content');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'site_content');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'site_content');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'students')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'students');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'students');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'students');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'students');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'student_marks')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'student_marks');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'student_marks');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'student_marks');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_marks"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_marks"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'student_marks');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'student_timeline')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'student_timeline');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'student_timeline');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'student_timeline');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_timeline"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_timeline"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'student_timeline');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'study_materials')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'study_materials');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'study_materials');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'study_materials');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'study_materials');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'subjects')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'subjects');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'subjects');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'subjects');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'subjects');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'subscriptions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'subscriptions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'subscriptions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'subscriptions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'subscriptions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'subscription_payments')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'subscription_payments');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'subscription_payments');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'subscription_payments');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'subscription_payments');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'teachers')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teachers');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teachers');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teachers');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'teachers');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'teacher_attendance')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teacher_attendance');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teacher_attendance');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teacher_attendance');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "teacher_attendance"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "teacher_attendance"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'teacher_attendance');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'teacher_subjects')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teacher_subjects');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teacher_subjects');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teacher_subjects');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "subjects" AS "tenant_ref_0" WHERE "teacher_subjects"."subjectId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "subjects" AS "tenant_ref_0" WHERE "teacher_subjects"."subjectId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'teacher_subjects');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'teacher_subject_assignments')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teacher_subject_assignments');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teacher_subject_assignments');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teacher_subject_assignments');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'teacher_subject_assignments');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'unified_templates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'unified_templates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'unified_templates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'unified_templates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'unified_templates');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'testimonials')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'testimonials');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'testimonials');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'testimonials');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'testimonials');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'timetables')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'timetables');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'timetables');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'timetables');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'timetables');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'timetable_slots')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'timetable_slots');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'timetable_slots');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'timetable_slots');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teacher_subject_assignments" AS "tenant_ref_0" WHERE "timetable_slots"."teacherSubjectAssignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teacher_subject_assignments" AS "tenant_ref_0" WHERE "timetable_slots"."teacherSubjectAssignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'timetable_slots');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'users')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'users');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'users');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'users');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'users');
  END IF;
END
$tenant_rls$;
