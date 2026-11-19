"use client";

import { AuthProvider } from "@/lib/auth-context";
import { TeacherPortalShell } from "@/components/TeacherPortalShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TeacherPortalShell>{children}</TeacherPortalShell>
    </AuthProvider>
  );
}
