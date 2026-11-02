-- Generated from docs/DATABASE/TENANT_CLASSIFICATION.json; do not edit manually.
-- No NULL-tenant wildcard: missing tenant context denies access.
-- The audited super-admin path must use its separate privileged connection.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT
LANGUAGE sql STABLE
AS $current_tenant$
  SELECT NULLIF(current_setting('app.current_school_id', true), '')
$current_tenant$;
DO $tenant_rls$
BEGIN
  IF to_regclass(format('%I.%I', 'public', 'academic_sessions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'academic_sessions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'academic_sessions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'academic_sessions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'academic_sessions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'access_reviews')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'access_reviews');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'access_reviews');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'access_reviews');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'access_reviews');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'AccountingPeriod')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'AccountingPeriod');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'AccountingPeriod');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'AccountingPeriod');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'AccountingPeriod');
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
  IF to_regclass(format('%I.%I', 'public', 'admission_enquiries')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'admission_enquiries');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'admission_enquiries');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'admission_enquiries');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'admission_enquiries');
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
  IF to_regclass(format('%I.%I', 'public', 'archive_job_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'archive_job_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'archive_job_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'archive_job_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'archive_job_logs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'assets')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assets');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assets');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assets');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'assets');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'asset_assignments')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_assignments');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_assignments');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_assignments');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_assignments"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_assignments"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'asset_assignments');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'asset_categories')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_categories');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_categories');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_categories');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'asset_categories');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'asset_depreciations')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_depreciations');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_depreciations');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_depreciations');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_depreciations"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_depreciations"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'asset_depreciations');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'asset_transfers')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_transfers');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_transfers');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_transfers');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_transfers"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_transfers"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'asset_transfers');
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
  IF to_regclass(format('%I.%I', 'public', 'auth_events')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'auth_events');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'auth_events');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'auth_events');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'auth_events');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'BankReconciliation')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'BankReconciliation');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'BankReconciliation');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'BankReconciliation');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'BankReconciliation');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'BankStatementLine')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'BankStatementLine');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'BankStatementLine');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'BankStatementLine');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'BankStatementLine');
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
  IF to_regclass(format('%I.%I', 'public', 'brand_settings')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'brand_settings');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'brand_settings');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'brand_settings');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'brand_settings');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'Budget')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'Budget');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'Budget');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'Budget');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'Budget');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'BudgetLine')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'BudgetLine');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'BudgetLine');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'BudgetLine');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "BudgetLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "BudgetLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'BudgetLine');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'bulk_jobs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'bulk_jobs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'bulk_jobs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'bulk_jobs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'bulk_jobs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'certificate_templates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'certificate_templates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'certificate_templates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'certificate_templates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'certificate_templates');
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
  IF to_regclass(format('%I.%I', 'public', 'consent_records')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'consent_records');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'consent_records');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'consent_records');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'consent_records');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'contracts')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'contracts');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'contracts');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'contracts');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'contracts');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'contributions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'contributions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'contributions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'contributions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "alumni" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."userId" = "tenant_ref_1"."id" WHERE "contributions"."alumniId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "alumni" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."userId" = "tenant_ref_1"."id" WHERE "contributions"."alumniId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'contributions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'custom_domains')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'custom_domains');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'custom_domains');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'custom_domains');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'custom_domains');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'CustomWorkflow')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'CustomWorkflow');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'CustomWorkflow');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'CustomWorkflow');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'CustomWorkflow');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'DailyRevenueProjection')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DailyRevenueProjection');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DailyRevenueProjection');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DailyRevenueProjection');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DailyRevenueProjection');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'data_classifications')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'data_classifications');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'data_classifications');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'data_classifications');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'data_classifications');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'DataRetentionPolicy')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DataRetentionPolicy');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DataRetentionPolicy');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DataRetentionPolicy');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DataRetentionPolicy');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'DeferredRevenueSchedule')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DeferredRevenueSchedule');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DeferredRevenueSchedule');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DeferredRevenueSchedule');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DeferredRevenueSchedule');
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
  IF to_regclass(format('%I.%I', 'public', 'DocumentVersion')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DocumentVersion');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DocumentVersion');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DocumentVersion');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "document_repository" AS "tenant_ref_0" WHERE "DocumentVersion"."documentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "document_repository" AS "tenant_ref_0" WHERE "DocumentVersion"."documentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'DocumentVersion');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'DomainEvent')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DomainEvent');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DomainEvent');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DomainEvent');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DomainEvent');
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
  IF to_regclass(format('%I.%I', 'public', 'FailedWebhook')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FailedWebhook');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FailedWebhook');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FailedWebhook');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "payment_transactions" AS "tenant_ref_0" WHERE "FailedWebhook"."paymentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "payment_transactions" AS "tenant_ref_0" WHERE "FailedWebhook"."paymentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'FailedWebhook');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'FederatedUser')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FederatedUser');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FederatedUser');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FederatedUser');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "FederatedUser"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "FederatedUser"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'FederatedUser');
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
  IF to_regclass(format('%I.%I', 'public', 'FinancialApprovalPolicy')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialApprovalPolicy');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialApprovalPolicy');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialApprovalPolicy');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialApprovalPolicy');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'FinancialAudit')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialAudit');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialAudit');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialAudit');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialAudit');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'FinancialClose')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialClose');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialClose');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialClose');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialClose');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'FinancialDimension')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialDimension');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialDimension');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialDimension');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialDimension');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'FinancialDimensionValue')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialDimensionValue');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialDimensionValue');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialDimensionValue');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "FinancialDimension" AS "tenant_ref_0" WHERE "FinancialDimensionValue"."dimensionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "FinancialDimension" AS "tenant_ref_0" WHERE "FinancialDimensionValue"."dimensionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'FinancialDimensionValue');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'financial_periods')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'financial_periods');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'financial_periods');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'financial_periods');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'financial_periods');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'FinancialReportCache')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialReportCache');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialReportCache');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialReportCache');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialReportCache');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'fine_rules')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'fine_rules');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'fine_rules');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'fine_rules');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'fine_rules');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'FiscalYear')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FiscalYear');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FiscalYear');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FiscalYear');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FiscalYear');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'gallery_images')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'gallery_images');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'gallery_images');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'gallery_images');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'gallery_images');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'GoodsReceipt')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'GoodsReceipt');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'GoodsReceipt');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'GoodsReceipt');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'GoodsReceipt');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'GoodsReceiptLine')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'GoodsReceiptLine');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'GoodsReceiptLine');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'GoodsReceiptLine');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'GoodsReceiptLine');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'guardians')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'guardians');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'guardians');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'guardians');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'guardians');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'helpdesk_tickets')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'helpdesk_tickets');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'helpdesk_tickets');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'helpdesk_tickets');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'helpdesk_tickets');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'hostel_allocations')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'hostel_allocations');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'hostel_allocations');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'hostel_allocations');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'hostel_allocations');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'hostel_rooms')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'hostel_rooms');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'hostel_rooms');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'hostel_rooms');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'hostel_rooms');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'incident_reports')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'incident_reports');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'incident_reports');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'incident_reports');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'incident_reports');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'InventoryCategory')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'InventoryCategory');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'InventoryCategory');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'InventoryCategory');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'InventoryCategory');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'InventoryItem')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'InventoryItem');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'InventoryItem');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'InventoryItem');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'InventoryItem');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'InventoryLocation')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'InventoryLocation');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'InventoryLocation');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'InventoryLocation');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'InventoryLocation');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'InventoryStock')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'InventoryStock');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'InventoryStock');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'InventoryStock');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'InventoryStock');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'invoices')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'invoices');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'invoices');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'invoices');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'invoices');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'issued_certificates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'issued_certificates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'issued_certificates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'issued_certificates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "issued_certificates"."issuedById" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "issued_certificates"."issuedById" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'issued_certificates');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'JournalTemplate')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'JournalTemplate');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'JournalTemplate');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'JournalTemplate');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'JournalTemplate');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'JournalTemplateLine')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'JournalTemplateLine');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'JournalTemplateLine');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'JournalTemplateLine');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "JournalTemplateLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "JournalTemplateLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'JournalTemplateLine');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LeadInteraction')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LeadInteraction');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LeadInteraction');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LeadInteraction');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "admission_enquiries" AS "tenant_ref_0" WHERE "LeadInteraction"."leadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "admission_enquiries" AS "tenant_ref_0" WHERE "LeadInteraction"."leadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'LeadInteraction');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'leave_requests')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'leave_requests');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'leave_requests');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'leave_requests');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "leave_requests"."requesterId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "leave_requests"."requesterId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'leave_requests');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LedgerAccount')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerAccount');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerAccount');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerAccount');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerAccount');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LedgerEntry')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerEntry');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerEntry');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerEntry');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "LedgerEntry"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "LedgerEntry"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'LedgerEntry');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LedgerEvent')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerEvent');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerEvent');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerEvent');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerEvent');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LedgerIntegrityReport')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerIntegrityReport');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerIntegrityReport');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerIntegrityReport');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerIntegrityReport');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LedgerMerkleRoot')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerMerkleRoot');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerMerkleRoot');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerMerkleRoot');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerMerkleRoot');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LedgerSnapshot')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerSnapshot');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerSnapshot');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerSnapshot');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerSnapshot');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'LedgerTransaction')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerTransaction');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerTransaction');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerTransaction');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerTransaction');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'legal_holds')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'legal_holds');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'legal_holds');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'legal_holds');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'legal_holds');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'maintenance_records')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'maintenance_records');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'maintenance_records');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'maintenance_records');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "maintenance_records"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "maintenance_records"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'maintenance_records');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'MarketingCampaign')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'MarketingCampaign');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'MarketingCampaign');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'MarketingCampaign');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'MarketingCampaign');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'messages')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'messages');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'messages');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'messages');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'messages');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'message_attachments')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_attachments');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_attachments');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_attachments');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_attachments"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_attachments"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'message_attachments');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'message_participants')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_participants');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_participants');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_participants');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "message_threads" AS "tenant_ref_0" WHERE "message_participants"."threadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "message_threads" AS "tenant_ref_0" WHERE "message_participants"."threadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'message_participants');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'message_read_receipts')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_read_receipts');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_read_receipts');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_read_receipts');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_read_receipts"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_read_receipts"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'message_read_receipts');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'message_templates')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_templates');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_templates');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_templates');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'message_templates');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'message_threads')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_threads');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_threads');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_threads');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'message_threads');
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
  IF to_regclass(format('%I.%I', 'public', 'notification_deliveries')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notification_deliveries');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notification_deliveries');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notification_deliveries');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notification_deliveries');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'notification_preferences')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notification_preferences');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notification_preferences');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notification_preferences');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "notification_preferences"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "notification_preferences"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'notification_preferences');
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
  IF to_regclass(format('%I.%I', 'public', 'OutboxMessage')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'OutboxMessage');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'OutboxMessage');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'OutboxMessage');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "DomainEvent" AS "tenant_ref_0" WHERE "OutboxMessage"."domainEventId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "DomainEvent" AS "tenant_ref_0" WHERE "OutboxMessage"."domainEventId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'OutboxMessage');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'payment_transactions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'payment_transactions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'payment_transactions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'payment_transactions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'payment_transactions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'permission_groups')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'permission_groups');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'permission_groups');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'permission_groups');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'permission_groups');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PipelineStage')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PipelineStage');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PipelineStage');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PipelineStage');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PipelineStage');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PolicyDefinition')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PolicyDefinition');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PolicyDefinition');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PolicyDefinition');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PolicyDefinition');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PolicyEvaluationLog')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PolicyEvaluationLog');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PolicyEvaluationLog');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PolicyEvaluationLog');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "PolicyVersion" AS "tenant_ref_0" JOIN "PolicyDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."policyId" = "tenant_ref_1"."id" WHERE "PolicyEvaluationLog"."policyVersionId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "PolicyVersion" AS "tenant_ref_0" JOIN "PolicyDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."policyId" = "tenant_ref_1"."id" WHERE "PolicyEvaluationLog"."policyVersionId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PolicyEvaluationLog');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PolicyVersion')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PolicyVersion');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PolicyVersion');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PolicyVersion');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "PolicyDefinition" AS "tenant_ref_0" WHERE "PolicyVersion"."policyId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "PolicyDefinition" AS "tenant_ref_0" WHERE "PolicyVersion"."policyId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PolicyVersion');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PostingRule')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PostingRule');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PostingRule');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PostingRule');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PostingRule');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PostingRuleLine')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PostingRuleLine');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PostingRuleLine');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PostingRuleLine');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "PostingRuleLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "PostingRuleLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PostingRuleLine');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'purchase_orders')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'purchase_orders');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'purchase_orders');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'purchase_orders');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'purchase_orders');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'purchase_order_items')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'purchase_order_items');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'purchase_order_items');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'purchase_order_items');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "purchase_orders" AS "tenant_ref_0" WHERE "purchase_order_items"."poId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "purchase_orders" AS "tenant_ref_0" WHERE "purchase_order_items"."poId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'purchase_order_items');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PurchaseRequest')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PurchaseRequest');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PurchaseRequest');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PurchaseRequest');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PurchaseRequest');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'PurchaseRequestItem')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PurchaseRequestItem');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PurchaseRequestItem');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PurchaseRequestItem');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "PurchaseRequest" AS "tenant_ref_0" WHERE "PurchaseRequestItem"."purchaseRequestId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "PurchaseRequest" AS "tenant_ref_0" WHERE "PurchaseRequestItem"."purchaseRequestId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PurchaseRequestItem');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'razorpay_reconciliations')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'razorpay_reconciliations');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'razorpay_reconciliations');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'razorpay_reconciliations');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'razorpay_reconciliations');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'reception_call_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'reception_call_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'reception_call_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'reception_call_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'reception_call_logs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'reception_complaints')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'reception_complaints');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'reception_complaints');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'reception_complaints');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'reception_complaints');
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
  IF to_regclass(format('%I.%I', 'public', 'RevenueRecognitionEntry')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'RevenueRecognitionEntry');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'RevenueRecognitionEntry');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'RevenueRecognitionEntry');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "DeferredRevenueSchedule" AS "tenant_ref_0" WHERE "RevenueRecognitionEntry"."scheduleId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "DeferredRevenueSchedule" AS "tenant_ref_0" WHERE "RevenueRecognitionEntry"."scheduleId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'RevenueRecognitionEntry');
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
  IF to_regclass(format('%I.%I', 'public', 'school_archives')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_archives');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_archives');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_archives');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_archives');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'school_features')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_features');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_features');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_features');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_features');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'SchoolIntegration')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'SchoolIntegration');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'SchoolIntegration');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'SchoolIntegration');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'SchoolIntegration');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'school_settings')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_settings');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_settings');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_settings');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_settings');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'school_settings_history')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_settings_history');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_settings_history');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_settings_history');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_settings_history');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'sections')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'sections');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'sections');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'sections');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "sections"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "sections"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'sections');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'SequenceCounter')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'SequenceCounter');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'SequenceCounter');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'SequenceCounter');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'SequenceCounter');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'site_content')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'site_content');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'site_content');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'site_content');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'site_content');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'SSOConfiguration')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'SSOConfiguration');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'SSOConfiguration');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'SSOConfiguration');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'SSOConfiguration');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'StockLedger')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'StockLedger');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'StockLedger');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'StockLedger');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'StockLedger');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'storage_objects')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'storage_objects');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'storage_objects');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'storage_objects');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'storage_objects');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'students')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'students');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'students');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'students');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'students');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'StudentFinancialProjection')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'StudentFinancialProjection');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'StudentFinancialProjection');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'StudentFinancialProjection');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'StudentFinancialProjection');
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
  IF to_regclass(format('%I.%I', 'public', 'support_messages')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'support_messages');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'support_messages');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'support_messages');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "support_messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "support_messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'support_messages');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'support_tickets')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'support_tickets');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'support_tickets');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'support_tickets');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'support_tickets');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'system_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'system_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'system_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'system_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'system_logs');
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
  IF to_regclass(format('%I.%I', 'public', 'transport_allocations')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_allocations');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_allocations');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_allocations');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'transport_allocations');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'transport_routes')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_routes');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_routes');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_routes');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'transport_routes');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'transport_stops')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_stops');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_stops');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_stops');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "transport_routes" AS "tenant_ref_0" WHERE "transport_stops"."routeId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "transport_routes" AS "tenant_ref_0" WHERE "transport_stops"."routeId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'transport_stops');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'transport_vehicles')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_vehicles');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_vehicles');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_vehicles');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'transport_vehicles');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'usage_metrics')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'usage_metrics');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'usage_metrics');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'usage_metrics');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'usage_metrics');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'users')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'users');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'users');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'users');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'users');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'user_consents')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_consents');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_consents');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_consents');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'user_consents');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'user_delegations')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_delegations');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_delegations');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_delegations');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'user_delegations');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'user_devices')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_devices');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_devices');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_devices');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_devices"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_devices"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'user_devices');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'user_sessions')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_sessions');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_sessions');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_sessions');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_sessions"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_sessions"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'user_sessions');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'vendors')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'vendors');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'vendors');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'vendors');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'vendors');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'VendorInvoice')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'VendorInvoice');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'VendorInvoice');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'VendorInvoice');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'VendorInvoice');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'visitor_logs')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'visitor_logs');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'visitor_logs');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'visitor_logs');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'visitor_logs');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'WebhookDelivery')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WebhookDelivery');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WebhookDelivery');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WebhookDelivery');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'WebhookDelivery');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'webhook_endpoints')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'webhook_endpoints');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'webhook_endpoints');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'webhook_endpoints');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'webhook_endpoints');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'WorkflowDefinition')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowDefinition');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowDefinition');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowDefinition');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'WorkflowDefinition');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'WorkflowInstance')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowInstance');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowInstance');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowInstance');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowInstance"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowInstance"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowInstance');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'WorkflowNode')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowNode');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowNode');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowNode');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowNode"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowNode"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowNode');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'WorkflowStep')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowStep');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowStep');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowStep');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "CustomWorkflow" AS "tenant_ref_0" WHERE "WorkflowStep"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "CustomWorkflow" AS "tenant_ref_0" WHERE "WorkflowStep"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowStep');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'WorkflowTask')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowTask');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowTask');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowTask');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowInstance" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTask"."instanceId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowInstance" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTask"."instanceId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowTask');
  END IF;
  IF to_regclass(format('%I.%I', 'public', 'WorkflowTransition')) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowTransition');
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowTransition');
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowTransition');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowNode" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTransition"."fromNodeId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowNode" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTransition"."fromNodeId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowTransition');
  END IF;
END
$tenant_rls$;
