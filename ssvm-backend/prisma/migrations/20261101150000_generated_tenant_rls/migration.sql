-- Generated from docs/DATABASE/TENANT_CLASSIFICATION.json; do not edit manually.
-- No NULL-tenant wildcard: missing tenant context denies access.
-- The audited super-admin path must use its separate privileged connection.
DO $tenant_rls$
BEGIN
  IF to_regclass(format('%I.%I', 'public', 'academic_sessions')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.academic_sessions is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'academic_sessions');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'academic_sessions');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'academic_sessions');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'academic_sessions');
  IF to_regclass(format('%I.%I', 'public', 'access_reviews')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.access_reviews is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'access_reviews');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'access_reviews');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'access_reviews');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'access_reviews');
  IF to_regclass(format('%I.%I', 'public', 'AccountingPeriod')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.AccountingPeriod is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'AccountingPeriod');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'AccountingPeriod');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'AccountingPeriod');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'AccountingPeriod');
  IF to_regclass(format('%I.%I', 'public', 'activity_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.activity_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'activity_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'activity_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'activity_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'activity_logs');
  IF to_regclass(format('%I.%I', 'public', 'admissions')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.admissions is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'admissions');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'admissions');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'admissions');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'admissions');
  IF to_regclass(format('%I.%I', 'public', 'admission_enquiries')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.admission_enquiries is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'admission_enquiries');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'admission_enquiries');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'admission_enquiries');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'admission_enquiries');
  IF to_regclass(format('%I.%I', 'public', 'admission_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.admission_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'admission_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'admission_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'admission_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "admissions" AS "tenant_ref_0" WHERE "admission_logs"."admissionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "admissions" AS "tenant_ref_0" WHERE "admission_logs"."admissionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'admission_logs');
  IF to_regclass(format('%I.%I', 'public', 'alumni')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.alumni is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'alumni');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'alumni');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'alumni');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "alumni"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "alumni"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'alumni');
  IF to_regclass(format('%I.%I', 'public', 'archive_job_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.archive_job_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'archive_job_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'archive_job_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'archive_job_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'archive_job_logs');
  IF to_regclass(format('%I.%I', 'public', 'assets')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.assets is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assets');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assets');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assets');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'assets');
  IF to_regclass(format('%I.%I', 'public', 'asset_assignments')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.asset_assignments is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_assignments');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_assignments');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_assignments');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_assignments"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_assignments"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'asset_assignments');
  IF to_regclass(format('%I.%I', 'public', 'asset_categories')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.asset_categories is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_categories');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_categories');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_categories');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'asset_categories');
  IF to_regclass(format('%I.%I', 'public', 'asset_depreciations')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.asset_depreciations is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_depreciations');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_depreciations');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_depreciations');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_depreciations"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_depreciations"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'asset_depreciations');
  IF to_regclass(format('%I.%I', 'public', 'asset_transfers')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.asset_transfers is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'asset_transfers');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'asset_transfers');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'asset_transfers');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_transfers"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "asset_transfers"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'asset_transfers');
  IF to_regclass(format('%I.%I', 'public', 'assignments')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.assignments is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assignments');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assignments');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assignments');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'assignments');
  IF to_regclass(format('%I.%I', 'public', 'assignment_attachments')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.assignment_attachments is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assignment_attachments');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assignment_attachments');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assignment_attachments');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_attachments"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_attachments"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'assignment_attachments');
  IF to_regclass(format('%I.%I', 'public', 'assignment_submissions')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.assignment_submissions is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'assignment_submissions');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'assignment_submissions');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'assignment_submissions');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_submissions"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assignments" AS "tenant_ref_0" WHERE "assignment_submissions"."assignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'assignment_submissions');
  IF to_regclass(format('%I.%I', 'public', 'attendance')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.attendance is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'attendance');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'attendance');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'attendance');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'attendance');
  IF to_regclass(format('%I.%I', 'public', 'audit_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.audit_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'audit_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'audit_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'audit_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'audit_logs');
  IF to_regclass(format('%I.%I', 'public', 'auth_events')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.auth_events is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'auth_events');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'auth_events');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'auth_events');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'auth_events');
  IF to_regclass(format('%I.%I', 'public', 'BankReconciliation')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.BankReconciliation is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'BankReconciliation');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'BankReconciliation');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'BankReconciliation');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'BankReconciliation');
  IF to_regclass(format('%I.%I', 'public', 'books')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.books is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'books');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'books');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'books');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'books');
  IF to_regclass(format('%I.%I', 'public', 'book_issues')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.book_issues is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'book_issues');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'book_issues');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'book_issues');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'book_issues');
  IF to_regclass(format('%I.%I', 'public', 'branches')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.branches is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'branches');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'branches');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'branches');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'branches');
  IF to_regclass(format('%I.%I', 'public', 'brand_settings')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.brand_settings is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'brand_settings');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'brand_settings');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'brand_settings');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'brand_settings');
  IF to_regclass(format('%I.%I', 'public', 'Budget')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.Budget is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'Budget');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'Budget');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'Budget');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'Budget');
  IF to_regclass(format('%I.%I', 'public', 'BudgetLine')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.BudgetLine is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'BudgetLine');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'BudgetLine');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'BudgetLine');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "BudgetLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "BudgetLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'BudgetLine');
  IF to_regclass(format('%I.%I', 'public', 'bulk_jobs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.bulk_jobs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'bulk_jobs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'bulk_jobs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'bulk_jobs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'bulk_jobs');
  IF to_regclass(format('%I.%I', 'public', 'certificate_templates')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.certificate_templates is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'certificate_templates');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'certificate_templates');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'certificate_templates');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'certificate_templates');
  IF to_regclass(format('%I.%I', 'public', 'classes')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.classes is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'classes');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'classes');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'classes');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'classes');
  IF to_regclass(format('%I.%I', 'public', 'class_subjects')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.class_subjects is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'class_subjects');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'class_subjects');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'class_subjects');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "class_subjects"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "class_subjects"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'class_subjects');
  IF to_regclass(format('%I.%I', 'public', 'class_teachers')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.class_teachers is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'class_teachers');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'class_teachers');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'class_teachers');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "class_teachers"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "class_teachers"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'class_teachers');
  IF to_regclass(format('%I.%I', 'public', 'communication_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.communication_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'communication_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'communication_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'communication_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'communication_logs');
  IF to_regclass(format('%I.%I', 'public', 'communication_templates')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.communication_templates is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'communication_templates');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'communication_templates');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'communication_templates');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'communication_templates');
  IF to_regclass(format('%I.%I', 'public', 'consent_records')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.consent_records is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'consent_records');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'consent_records');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'consent_records');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'consent_records');
  IF to_regclass(format('%I.%I', 'public', 'contracts')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.contracts is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'contracts');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'contracts');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'contracts');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'contracts');
  IF to_regclass(format('%I.%I', 'public', 'contributions')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.contributions is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'contributions');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'contributions');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'contributions');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "alumni" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."userId" = "tenant_ref_1"."id" WHERE "contributions"."alumniId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "alumni" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."userId" = "tenant_ref_1"."id" WHERE "contributions"."alumniId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'contributions');
  IF to_regclass(format('%I.%I', 'public', 'custom_domains')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.custom_domains is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'custom_domains');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'custom_domains');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'custom_domains');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'custom_domains');
  IF to_regclass(format('%I.%I', 'public', 'CustomWorkflow')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.CustomWorkflow is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'CustomWorkflow');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'CustomWorkflow');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'CustomWorkflow');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'CustomWorkflow');
  IF to_regclass(format('%I.%I', 'public', 'DailyRevenueProjection')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.DailyRevenueProjection is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DailyRevenueProjection');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DailyRevenueProjection');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DailyRevenueProjection');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DailyRevenueProjection');
  IF to_regclass(format('%I.%I', 'public', 'data_classifications')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.data_classifications is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'data_classifications');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'data_classifications');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'data_classifications');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'data_classifications');
  IF to_regclass(format('%I.%I', 'public', 'DataRetentionPolicy')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.DataRetentionPolicy is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DataRetentionPolicy');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DataRetentionPolicy');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DataRetentionPolicy');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DataRetentionPolicy');
  IF to_regclass(format('%I.%I', 'public', 'DeferredRevenueSchedule')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.DeferredRevenueSchedule is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DeferredRevenueSchedule');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DeferredRevenueSchedule');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DeferredRevenueSchedule');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DeferredRevenueSchedule');
  IF to_regclass(format('%I.%I', 'public', 'departments')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.departments is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'departments');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'departments');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'departments');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'departments');
  IF to_regclass(format('%I.%I', 'public', 'documents')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.documents is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'documents');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'documents');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'documents');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'documents');
  IF to_regclass(format('%I.%I', 'public', 'document_repository')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.document_repository is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'document_repository');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'document_repository');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'document_repository');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'document_repository');
  IF to_regclass(format('%I.%I', 'public', 'DocumentVersion')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.DocumentVersion is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DocumentVersion');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DocumentVersion');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DocumentVersion');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "document_repository" AS "tenant_ref_0" WHERE "DocumentVersion"."documentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "document_repository" AS "tenant_ref_0" WHERE "DocumentVersion"."documentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'DocumentVersion');
  IF to_regclass(format('%I.%I', 'public', 'DomainEvent')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.DomainEvent is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'DomainEvent');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'DomainEvent');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'DomainEvent');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'DomainEvent');
  IF to_regclass(format('%I.%I', 'public', 'events')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.events is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'events');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'events');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'events');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'events');
  IF to_regclass(format('%I.%I', 'public', 'exams')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.exams is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'exams');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'exams');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'exams');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'exams');
  IF to_regclass(format('%I.%I', 'public', 'exam_subjects')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.exam_subjects is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'exam_subjects');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'exam_subjects');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'exam_subjects');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "exams" AS "tenant_ref_0" WHERE "exam_subjects"."examId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "exams" AS "tenant_ref_0" WHERE "exam_subjects"."examId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'exam_subjects');
  IF to_regclass(format('%I.%I', 'public', 'FailedWebhook')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FailedWebhook is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FailedWebhook');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FailedWebhook');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FailedWebhook');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "payment_transactions" AS "tenant_ref_0" WHERE "FailedWebhook"."paymentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "payment_transactions" AS "tenant_ref_0" WHERE "FailedWebhook"."paymentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'FailedWebhook');
  IF to_regclass(format('%I.%I', 'public', 'FederatedUser')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FederatedUser is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FederatedUser');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FederatedUser');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FederatedUser');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "FederatedUser"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "FederatedUser"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'FederatedUser');
  IF to_regclass(format('%I.%I', 'public', 'fee_categories')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.fee_categories is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'fee_categories');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'fee_categories');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'fee_categories');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'fee_categories');
  IF to_regclass(format('%I.%I', 'public', 'fee_structures')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.fee_structures is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'fee_structures');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'fee_structures');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'fee_structures');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'fee_structures');
  IF to_regclass(format('%I.%I', 'public', 'FinancialApprovalPolicy')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FinancialApprovalPolicy is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialApprovalPolicy');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialApprovalPolicy');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialApprovalPolicy');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialApprovalPolicy');
  IF to_regclass(format('%I.%I', 'public', 'FinancialAudit')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FinancialAudit is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialAudit');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialAudit');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialAudit');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialAudit');
  IF to_regclass(format('%I.%I', 'public', 'FinancialClose')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FinancialClose is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialClose');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialClose');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialClose');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialClose');
  IF to_regclass(format('%I.%I', 'public', 'FinancialDimension')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FinancialDimension is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialDimension');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialDimension');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialDimension');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialDimension');
  IF to_regclass(format('%I.%I', 'public', 'FinancialDimensionValue')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FinancialDimensionValue is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialDimensionValue');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialDimensionValue');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialDimensionValue');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "FinancialDimension" AS "tenant_ref_0" WHERE "FinancialDimensionValue"."dimensionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "FinancialDimension" AS "tenant_ref_0" WHERE "FinancialDimensionValue"."dimensionId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'FinancialDimensionValue');
  IF to_regclass(format('%I.%I', 'public', 'financial_periods')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.financial_periods is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'financial_periods');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'financial_periods');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'financial_periods');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'financial_periods');
  IF to_regclass(format('%I.%I', 'public', 'FinancialReportCache')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FinancialReportCache is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FinancialReportCache');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FinancialReportCache');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FinancialReportCache');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FinancialReportCache');
  IF to_regclass(format('%I.%I', 'public', 'fine_rules')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.fine_rules is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'fine_rules');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'fine_rules');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'fine_rules');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'fine_rules');
  IF to_regclass(format('%I.%I', 'public', 'FiscalYear')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.FiscalYear is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'FiscalYear');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'FiscalYear');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'FiscalYear');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'FiscalYear');
  IF to_regclass(format('%I.%I', 'public', 'gallery_images')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.gallery_images is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'gallery_images');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'gallery_images');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'gallery_images');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'gallery_images');
  IF to_regclass(format('%I.%I', 'public', 'GoodsReceipt')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.GoodsReceipt is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'GoodsReceipt');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'GoodsReceipt');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'GoodsReceipt');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'GoodsReceipt');
  IF to_regclass(format('%I.%I', 'public', 'guardians')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.guardians is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'guardians');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'guardians');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'guardians');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'guardians');
  IF to_regclass(format('%I.%I', 'public', 'helpdesk_tickets')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.helpdesk_tickets is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'helpdesk_tickets');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'helpdesk_tickets');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'helpdesk_tickets');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'helpdesk_tickets');
  IF to_regclass(format('%I.%I', 'public', 'hostel_allocations')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.hostel_allocations is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'hostel_allocations');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'hostel_allocations');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'hostel_allocations');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'hostel_allocations');
  IF to_regclass(format('%I.%I', 'public', 'hostel_rooms')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.hostel_rooms is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'hostel_rooms');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'hostel_rooms');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'hostel_rooms');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'hostel_rooms');
  IF to_regclass(format('%I.%I', 'public', 'incident_reports')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.incident_reports is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'incident_reports');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'incident_reports');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'incident_reports');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'incident_reports');
  IF to_regclass(format('%I.%I', 'public', 'InventoryItem')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.InventoryItem is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'InventoryItem');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'InventoryItem');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'InventoryItem');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'InventoryItem');
  IF to_regclass(format('%I.%I', 'public', 'InventoryLocation')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.InventoryLocation is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'InventoryLocation');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'InventoryLocation');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'InventoryLocation');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'InventoryLocation');
  IF to_regclass(format('%I.%I', 'public', 'InventoryStock')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.InventoryStock is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'InventoryStock');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'InventoryStock');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'InventoryStock');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'InventoryStock');
  IF to_regclass(format('%I.%I', 'public', 'invoices')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.invoices is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'invoices');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'invoices');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'invoices');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'invoices');
  IF to_regclass(format('%I.%I', 'public', 'issued_certificates')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.issued_certificates is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'issued_certificates');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'issued_certificates');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'issued_certificates');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "issued_certificates"."issuedById" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "issued_certificates"."issuedById" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'issued_certificates');
  IF to_regclass(format('%I.%I', 'public', 'JournalTemplate')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.JournalTemplate is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'JournalTemplate');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'JournalTemplate');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'JournalTemplate');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'JournalTemplate');
  IF to_regclass(format('%I.%I', 'public', 'JournalTemplateLine')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.JournalTemplateLine is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'JournalTemplateLine');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'JournalTemplateLine');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'JournalTemplateLine');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "JournalTemplateLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "JournalTemplateLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'JournalTemplateLine');
  IF to_regclass(format('%I.%I', 'public', 'LeadInteraction')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LeadInteraction is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LeadInteraction');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LeadInteraction');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LeadInteraction');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "admission_enquiries" AS "tenant_ref_0" WHERE "LeadInteraction"."leadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "admission_enquiries" AS "tenant_ref_0" WHERE "LeadInteraction"."leadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'LeadInteraction');
  IF to_regclass(format('%I.%I', 'public', 'leave_requests')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.leave_requests is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'leave_requests');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'leave_requests');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'leave_requests');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "leave_requests"."requesterId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "leave_requests"."requesterId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'leave_requests');
  IF to_regclass(format('%I.%I', 'public', 'LedgerAccount')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LedgerAccount is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerAccount');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerAccount');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerAccount');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerAccount');
  IF to_regclass(format('%I.%I', 'public', 'LedgerEntry')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LedgerEntry is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerEntry');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerEntry');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerEntry');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "LedgerEntry"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "LedgerEntry"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'LedgerEntry');
  IF to_regclass(format('%I.%I', 'public', 'LedgerEvent')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LedgerEvent is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerEvent');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerEvent');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerEvent');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerEvent');
  IF to_regclass(format('%I.%I', 'public', 'LedgerIntegrityReport')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LedgerIntegrityReport is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerIntegrityReport');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerIntegrityReport');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerIntegrityReport');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerIntegrityReport');
  IF to_regclass(format('%I.%I', 'public', 'LedgerMerkleRoot')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LedgerMerkleRoot is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerMerkleRoot');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerMerkleRoot');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerMerkleRoot');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerMerkleRoot');
  IF to_regclass(format('%I.%I', 'public', 'LedgerSnapshot')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LedgerSnapshot is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerSnapshot');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerSnapshot');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerSnapshot');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerSnapshot');
  IF to_regclass(format('%I.%I', 'public', 'LedgerTransaction')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.LedgerTransaction is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'LedgerTransaction');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'LedgerTransaction');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'LedgerTransaction');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'LedgerTransaction');
  IF to_regclass(format('%I.%I', 'public', 'legal_holds')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.legal_holds is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'legal_holds');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'legal_holds');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'legal_holds');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'legal_holds');
  IF to_regclass(format('%I.%I', 'public', 'maintenance_records')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.maintenance_records is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'maintenance_records');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'maintenance_records');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'maintenance_records');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "maintenance_records"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "assets" AS "tenant_ref_0" WHERE "maintenance_records"."assetId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'maintenance_records');
  IF to_regclass(format('%I.%I', 'public', 'MarketingCampaign')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.MarketingCampaign is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'MarketingCampaign');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'MarketingCampaign');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'MarketingCampaign');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'MarketingCampaign');
  IF to_regclass(format('%I.%I', 'public', 'messages')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.messages is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'messages');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'messages');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'messages');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'messages');
  IF to_regclass(format('%I.%I', 'public', 'message_attachments')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.message_attachments is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_attachments');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_attachments');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_attachments');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_attachments"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_attachments"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'message_attachments');
  IF to_regclass(format('%I.%I', 'public', 'message_participants')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.message_participants is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_participants');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_participants');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_participants');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "message_threads" AS "tenant_ref_0" WHERE "message_participants"."threadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "message_threads" AS "tenant_ref_0" WHERE "message_participants"."threadId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'message_participants');
  IF to_regclass(format('%I.%I', 'public', 'message_read_receipts')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.message_read_receipts is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_read_receipts');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_read_receipts');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_read_receipts');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_read_receipts"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "messages" AS "tenant_ref_0" JOIN "users" AS "tenant_ref_1" ON "tenant_ref_0"."senderId" = "tenant_ref_1"."id" WHERE "message_read_receipts"."messageId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'message_read_receipts');
  IF to_regclass(format('%I.%I', 'public', 'message_templates')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.message_templates is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_templates');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_templates');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_templates');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'message_templates');
  IF to_regclass(format('%I.%I', 'public', 'message_threads')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.message_threads is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'message_threads');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'message_threads');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'message_threads');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'message_threads');
  IF to_regclass(format('%I.%I', 'public', 'notices')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.notices is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notices');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notices');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notices');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notices');
  IF to_regclass(format('%I.%I', 'public', 'notifications')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.notifications is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notifications');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notifications');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notifications');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notifications');
  IF to_regclass(format('%I.%I', 'public', 'notification_deliveries')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.notification_deliveries is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notification_deliveries');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notification_deliveries');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notification_deliveries');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notification_deliveries');
  IF to_regclass(format('%I.%I', 'public', 'notification_preferences')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.notification_preferences is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notification_preferences');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notification_preferences');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notification_preferences');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "notification_preferences"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "notification_preferences"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'notification_preferences');
  IF to_regclass(format('%I.%I', 'public', 'notification_templates')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.notification_templates is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'notification_templates');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'notification_templates');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'notification_templates');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'notification_templates');
  IF to_regclass(format('%I.%I', 'public', 'onboarding_progress')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.onboarding_progress is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'onboarding_progress');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'onboarding_progress');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'onboarding_progress');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'onboarding_progress');
  IF to_regclass(format('%I.%I', 'public', 'OutboxMessage')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.OutboxMessage is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'OutboxMessage');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'OutboxMessage');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'OutboxMessage');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "DomainEvent" AS "tenant_ref_0" WHERE "OutboxMessage"."domainEventId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "DomainEvent" AS "tenant_ref_0" WHERE "OutboxMessage"."domainEventId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'OutboxMessage');
  IF to_regclass(format('%I.%I', 'public', 'payment_transactions')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.payment_transactions is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'payment_transactions');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'payment_transactions');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'payment_transactions');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'payment_transactions');
  IF to_regclass(format('%I.%I', 'public', 'permission_groups')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.permission_groups is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'permission_groups');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'permission_groups');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'permission_groups');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'permission_groups');
  IF to_regclass(format('%I.%I', 'public', 'PipelineStage')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PipelineStage is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PipelineStage');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PipelineStage');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PipelineStage');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PipelineStage');
  IF to_regclass(format('%I.%I', 'public', 'PolicyDefinition')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PolicyDefinition is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PolicyDefinition');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PolicyDefinition');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PolicyDefinition');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PolicyDefinition');
  IF to_regclass(format('%I.%I', 'public', 'PolicyEvaluationLog')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PolicyEvaluationLog is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PolicyEvaluationLog');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PolicyEvaluationLog');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PolicyEvaluationLog');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "PolicyVersion" AS "tenant_ref_0" JOIN "PolicyDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."policyId" = "tenant_ref_1"."id" WHERE "PolicyEvaluationLog"."policyVersionId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "PolicyVersion" AS "tenant_ref_0" JOIN "PolicyDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."policyId" = "tenant_ref_1"."id" WHERE "PolicyEvaluationLog"."policyVersionId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PolicyEvaluationLog');
  IF to_regclass(format('%I.%I', 'public', 'PolicyVersion')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PolicyVersion is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PolicyVersion');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PolicyVersion');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PolicyVersion');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "PolicyDefinition" AS "tenant_ref_0" WHERE "PolicyVersion"."policyId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "PolicyDefinition" AS "tenant_ref_0" WHERE "PolicyVersion"."policyId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PolicyVersion');
  IF to_regclass(format('%I.%I', 'public', 'PostingRule')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PostingRule is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PostingRule');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PostingRule');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PostingRule');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PostingRule');
  IF to_regclass(format('%I.%I', 'public', 'PostingRuleLine')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PostingRuleLine is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PostingRuleLine');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PostingRuleLine');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PostingRuleLine');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "PostingRuleLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "LedgerAccount" AS "tenant_ref_0" WHERE "PostingRuleLine"."accountId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PostingRuleLine');
  IF to_regclass(format('%I.%I', 'public', 'purchase_orders')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.purchase_orders is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'purchase_orders');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'purchase_orders');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'purchase_orders');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'purchase_orders');
  IF to_regclass(format('%I.%I', 'public', 'purchase_order_items')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.purchase_order_items is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'purchase_order_items');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'purchase_order_items');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'purchase_order_items');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "purchase_orders" AS "tenant_ref_0" WHERE "purchase_order_items"."poId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "purchase_orders" AS "tenant_ref_0" WHERE "purchase_order_items"."poId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'purchase_order_items');
  IF to_regclass(format('%I.%I', 'public', 'PurchaseRequest')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PurchaseRequest is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PurchaseRequest');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PurchaseRequest');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PurchaseRequest');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'PurchaseRequest');
  IF to_regclass(format('%I.%I', 'public', 'PurchaseRequestItem')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.PurchaseRequestItem is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'PurchaseRequestItem');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'PurchaseRequestItem');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'PurchaseRequestItem');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "PurchaseRequest" AS "tenant_ref_0" WHERE "PurchaseRequestItem"."purchaseRequestId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "PurchaseRequest" AS "tenant_ref_0" WHERE "PurchaseRequestItem"."purchaseRequestId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'PurchaseRequestItem');
  IF to_regclass(format('%I.%I', 'public', 'razorpay_reconciliations')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.razorpay_reconciliations is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'razorpay_reconciliations');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'razorpay_reconciliations');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'razorpay_reconciliations');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'razorpay_reconciliations');
  IF to_regclass(format('%I.%I', 'public', 'reception_call_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.reception_call_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'reception_call_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'reception_call_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'reception_call_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'reception_call_logs');
  IF to_regclass(format('%I.%I', 'public', 'reception_complaints')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.reception_complaints is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'reception_complaints');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'reception_complaints');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'reception_complaints');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'reception_complaints');
  IF to_regclass(format('%I.%I', 'public', 'refresh_tokens')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.refresh_tokens is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'refresh_tokens');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'refresh_tokens');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'refresh_tokens');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "refresh_tokens"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "refresh_tokens"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'refresh_tokens');
  IF to_regclass(format('%I.%I', 'public', 'report_templates')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.report_templates is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'report_templates');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'report_templates');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'report_templates');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'report_templates');
  IF to_regclass(format('%I.%I', 'public', 'RevenueRecognitionEntry')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.RevenueRecognitionEntry is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'RevenueRecognitionEntry');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'RevenueRecognitionEntry');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'RevenueRecognitionEntry');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "DeferredRevenueSchedule" AS "tenant_ref_0" WHERE "RevenueRecognitionEntry"."scheduleId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "DeferredRevenueSchedule" AS "tenant_ref_0" WHERE "RevenueRecognitionEntry"."scheduleId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'RevenueRecognitionEntry');
  IF to_regclass(format('%I.%I', 'public', 'salaries')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.salaries is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'salaries');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'salaries');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'salaries');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'salaries');
  IF to_regclass(format('%I.%I', 'public', 'scholarships')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.scholarships is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'scholarships');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'scholarships');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'scholarships');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'scholarships');
  IF to_regclass(format('%I.%I', 'public', 'school_archives')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.school_archives is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_archives');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_archives');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_archives');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_archives');
  IF to_regclass(format('%I.%I', 'public', 'school_features')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.school_features is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_features');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_features');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_features');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_features');
  IF to_regclass(format('%I.%I', 'public', 'SchoolIntegration')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.SchoolIntegration is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'SchoolIntegration');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'SchoolIntegration');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'SchoolIntegration');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'SchoolIntegration');
  IF to_regclass(format('%I.%I', 'public', 'school_settings')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.school_settings is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_settings');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_settings');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_settings');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_settings');
  IF to_regclass(format('%I.%I', 'public', 'school_settings_history')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.school_settings_history is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'school_settings_history');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'school_settings_history');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'school_settings_history');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'school_settings_history');
  IF to_regclass(format('%I.%I', 'public', 'sections')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.sections is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'sections');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'sections');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'sections');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "sections"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "classes" AS "tenant_ref_0" WHERE "sections"."classId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'sections');
  IF to_regclass(format('%I.%I', 'public', 'SequenceCounter')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.SequenceCounter is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'SequenceCounter');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'SequenceCounter');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'SequenceCounter');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'SequenceCounter');
  IF to_regclass(format('%I.%I', 'public', 'site_content')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.site_content is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'site_content');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'site_content');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'site_content');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'site_content');
  IF to_regclass(format('%I.%I', 'public', 'SSOConfiguration')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.SSOConfiguration is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'SSOConfiguration');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'SSOConfiguration');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'SSOConfiguration');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'SSOConfiguration');
  IF to_regclass(format('%I.%I', 'public', 'StockLedger')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.StockLedger is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'StockLedger');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'StockLedger');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'StockLedger');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'StockLedger');
  IF to_regclass(format('%I.%I', 'public', 'storage_objects')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.storage_objects is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'storage_objects');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'storage_objects');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'storage_objects');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'storage_objects');
  IF to_regclass(format('%I.%I', 'public', 'students')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.students is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'students');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'students');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'students');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'students');
  IF to_regclass(format('%I.%I', 'public', 'StudentFinancialProjection')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.StudentFinancialProjection is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'StudentFinancialProjection');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'StudentFinancialProjection');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'StudentFinancialProjection');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'StudentFinancialProjection');
  IF to_regclass(format('%I.%I', 'public', 'student_marks')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.student_marks is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'student_marks');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'student_marks');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'student_marks');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_marks"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_marks"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'student_marks');
  IF to_regclass(format('%I.%I', 'public', 'student_timeline')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.student_timeline is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'student_timeline');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'student_timeline');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'student_timeline');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_timeline"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "students" AS "tenant_ref_0" WHERE "student_timeline"."studentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'student_timeline');
  IF to_regclass(format('%I.%I', 'public', 'study_materials')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.study_materials is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'study_materials');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'study_materials');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'study_materials');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'study_materials');
  IF to_regclass(format('%I.%I', 'public', 'subjects')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.subjects is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'subjects');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'subjects');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'subjects');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'subjects');
  IF to_regclass(format('%I.%I', 'public', 'subscriptions')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.subscriptions is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'subscriptions');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'subscriptions');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'subscriptions');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'subscriptions');
  IF to_regclass(format('%I.%I', 'public', 'subscription_payments')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.subscription_payments is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'subscription_payments');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'subscription_payments');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'subscription_payments');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'subscription_payments');
  IF to_regclass(format('%I.%I', 'public', 'support_messages')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.support_messages is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'support_messages');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'support_messages');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'support_messages');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "support_messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "support_messages"."senderId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'support_messages');
  IF to_regclass(format('%I.%I', 'public', 'support_tickets')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.support_tickets is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'support_tickets');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'support_tickets');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'support_tickets');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'support_tickets');
  IF to_regclass(format('%I.%I', 'public', 'system_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.system_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'system_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'system_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'system_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'system_logs');
  IF to_regclass(format('%I.%I', 'public', 'teachers')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.teachers is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teachers');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teachers');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teachers');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'teachers');
  IF to_regclass(format('%I.%I', 'public', 'teacher_attendance')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.teacher_attendance is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teacher_attendance');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teacher_attendance');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teacher_attendance');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "teacher_attendance"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teachers" AS "tenant_ref_0" WHERE "teacher_attendance"."teacherId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'teacher_attendance');
  IF to_regclass(format('%I.%I', 'public', 'teacher_subjects')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.teacher_subjects is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teacher_subjects');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teacher_subjects');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teacher_subjects');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "subjects" AS "tenant_ref_0" WHERE "teacher_subjects"."subjectId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "subjects" AS "tenant_ref_0" WHERE "teacher_subjects"."subjectId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'teacher_subjects');
  IF to_regclass(format('%I.%I', 'public', 'teacher_subject_assignments')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.teacher_subject_assignments is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'teacher_subject_assignments');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'teacher_subject_assignments');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'teacher_subject_assignments');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'teacher_subject_assignments');
  IF to_regclass(format('%I.%I', 'public', 'unified_templates')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.unified_templates is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'unified_templates');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'unified_templates');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'unified_templates');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'unified_templates');
  IF to_regclass(format('%I.%I', 'public', 'testimonials')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.testimonials is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'testimonials');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'testimonials');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'testimonials');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'testimonials');
  IF to_regclass(format('%I.%I', 'public', 'timetables')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.timetables is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'timetables');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'timetables');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'timetables');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'timetables');
  IF to_regclass(format('%I.%I', 'public', 'timetable_slots')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.timetable_slots is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'timetable_slots');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'timetable_slots');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'timetable_slots');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "teacher_subject_assignments" AS "tenant_ref_0" WHERE "timetable_slots"."teacherSubjectAssignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "teacher_subject_assignments" AS "tenant_ref_0" WHERE "timetable_slots"."teacherSubjectAssignmentId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'timetable_slots');
  IF to_regclass(format('%I.%I', 'public', 'transport_allocations')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.transport_allocations is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_allocations');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_allocations');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_allocations');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'transport_allocations');
  IF to_regclass(format('%I.%I', 'public', 'transport_routes')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.transport_routes is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_routes');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_routes');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_routes');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'transport_routes');
  IF to_regclass(format('%I.%I', 'public', 'transport_stops')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.transport_stops is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_stops');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_stops');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_stops');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "transport_routes" AS "tenant_ref_0" WHERE "transport_stops"."routeId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "transport_routes" AS "tenant_ref_0" WHERE "transport_stops"."routeId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'transport_stops');
  IF to_regclass(format('%I.%I', 'public', 'transport_vehicles')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.transport_vehicles is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'transport_vehicles');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'transport_vehicles');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'transport_vehicles');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'transport_vehicles');
  IF to_regclass(format('%I.%I', 'public', 'usage_metrics')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.usage_metrics is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'usage_metrics');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'usage_metrics');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'usage_metrics');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'usage_metrics');
  IF to_regclass(format('%I.%I', 'public', 'users')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.users is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'users');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'users');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'users');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'users');
  IF to_regclass(format('%I.%I', 'public', 'user_consents')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.user_consents is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_consents');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_consents');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_consents');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'user_consents');
  IF to_regclass(format('%I.%I', 'public', 'user_delegations')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.user_delegations is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_delegations');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_delegations');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_delegations');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'user_delegations');
  IF to_regclass(format('%I.%I', 'public', 'user_devices')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.user_devices is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_devices');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_devices');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_devices');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_devices"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_devices"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'user_devices');
  IF to_regclass(format('%I.%I', 'public', 'user_sessions')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.user_sessions is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'user_sessions');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'user_sessions');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'user_sessions');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_sessions"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "users" AS "tenant_ref_0" WHERE "user_sessions"."userId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'user_sessions');
  IF to_regclass(format('%I.%I', 'public', 'vendors')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.vendors is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'vendors');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'vendors');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'vendors');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'vendors');
  IF to_regclass(format('%I.%I', 'public', 'VendorInvoice')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.VendorInvoice is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'VendorInvoice');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'VendorInvoice');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'VendorInvoice');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'VendorInvoice');
  IF to_regclass(format('%I.%I', 'public', 'visitor_logs')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.visitor_logs is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'visitor_logs');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'visitor_logs');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'visitor_logs');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'visitor_logs');
  IF to_regclass(format('%I.%I', 'public', 'WebhookDelivery')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.WebhookDelivery is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WebhookDelivery');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WebhookDelivery');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WebhookDelivery');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'WebhookDelivery');
  IF to_regclass(format('%I.%I', 'public', 'webhook_endpoints')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.webhook_endpoints is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'webhook_endpoints');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'webhook_endpoints');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'webhook_endpoints');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'webhook_endpoints');
  IF to_regclass(format('%I.%I', 'public', 'WorkflowDefinition')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.WorkflowDefinition is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowDefinition');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowDefinition');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowDefinition');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING ("schoolId" = current_tenant_id()) WITH CHECK ("schoolId" = current_tenant_id())', 'school_isolation', 'public', 'WorkflowDefinition');
  IF to_regclass(format('%I.%I', 'public', 'WorkflowInstance')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.WorkflowInstance is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowInstance');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowInstance');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowInstance');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowInstance"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowInstance"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowInstance');
  IF to_regclass(format('%I.%I', 'public', 'WorkflowNode')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.WorkflowNode is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowNode');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowNode');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowNode');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowNode"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowDefinition" AS "tenant_ref_0" WHERE "WorkflowNode"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowNode');
  IF to_regclass(format('%I.%I', 'public', 'WorkflowStep')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.WorkflowStep is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowStep');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowStep');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowStep');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "CustomWorkflow" AS "tenant_ref_0" WHERE "WorkflowStep"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "CustomWorkflow" AS "tenant_ref_0" WHERE "WorkflowStep"."workflowId" = "tenant_ref_0"."id" AND "tenant_ref_0"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowStep');
  IF to_regclass(format('%I.%I', 'public', 'WorkflowTask')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.WorkflowTask is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowTask');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowTask');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowTask');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowInstance" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTask"."instanceId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowInstance" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTask"."instanceId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowTask');
  IF to_regclass(format('%I.%I', 'public', 'WorkflowTransition')) IS NULL THEN
    RAISE EXCEPTION 'Classified tenant table public.WorkflowTransition is missing; apply the complete baseline schema before tenant RLS.';
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', 'WorkflowTransition');
  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', 'WorkflowTransition');
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', 'WorkflowTransition');
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (EXISTS (SELECT 1 FROM "WorkflowNode" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTransition"."fromNodeId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id())) WITH CHECK (EXISTS (SELECT 1 FROM "WorkflowNode" AS "tenant_ref_0" JOIN "WorkflowDefinition" AS "tenant_ref_1" ON "tenant_ref_0"."workflowId" = "tenant_ref_1"."id" WHERE "WorkflowTransition"."fromNodeId" = "tenant_ref_0"."id" AND "tenant_ref_1"."schoolId" = current_tenant_id()))', 'school_isolation', 'public', 'WorkflowTransition');
END
$tenant_rls$;
