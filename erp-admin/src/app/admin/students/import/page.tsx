"use client";

import { DedicatedImportWizard } from "@/components/import/DedicatedImportWizard";

export default function StudentImportPage() {
  return (
    <DedicatedImportWizard
      moduleId="students"
      title="Bulk Student Import"
      subtitle="Import official student roster records with academic placement, roll number, and guardian details."
      entityName="Student"
      manualUrl="/admin/students?action=create"
      backUrl="/admin/students"
      requiredFieldsNote={["Name (or First Name)", "Class", "Section", "Roll Number"]}
    />
  );
}
