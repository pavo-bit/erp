"use client";

import { AuthProvider } from "@/lib/auth-context";
import { SuperAdminShell } from "@/components/SuperAdminShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SuperAdminShell>
        {children}
      </SuperAdminShell>
    </AuthProvider>
  );
}
