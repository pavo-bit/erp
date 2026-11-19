"use client";

import { DedicatedImportWizard } from "@/components/import/DedicatedImportWizard";

export default function TeacherImportPage() {
  return (
    <DedicatedImportWizard
      moduleId="staff"
      title="Bulk Staff & Faculty Import"
      subtitle="Import teaching faculty and administrative staff records with department assignments and employee IDs."
      entityName="Teacher"
      manualUrl="/admin/teachers?action=create"
      backUrl="/admin/teachers"
      requiredFieldsNote={["Name", "Email", "Department", "Designation"]}
    />
  );
}
