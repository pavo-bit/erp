-- Align school_shift_classes RLS policy with standard current_tenant_id() fail-closed invariant
DROP POLICY IF EXISTS school_shift_classes_school_isolation ON "school_shift_classes";
DROP POLICY IF EXISTS school_isolation ON "school_shift_classes";
CREATE POLICY school_isolation ON "school_shift_classes"
  FOR ALL
  USING ("schoolId" = current_tenant_id())
  WITH CHECK ("schoolId" = current_tenant_id());

