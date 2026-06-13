"use client";

import { DashboardLayout, SidebarItem } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

const adminSidebar: SidebarItem[] = [
  { icon: "📊", label: "Dashboard", href: "/admin" },
  { icon: "📋", label: "Admissions", href: "/admin/admissions" },
  { icon: "👨‍🎓", label: "Students", href: "/admin/students" },
  { icon: "👨‍🏫", label: "Teachers", href: "/admin/teachers" },
  { icon: "✅", label: "Attendance", href: "/admin/attendance" },
  { icon: "📝", label: "Examinations", href: "/admin/exams" },
  { icon: "💰", label: "Fee Management", href: "/admin/fees" },
  { icon: "📅", label: "Timetable", href: "/admin/timetable" },
  { icon: "👥", label: "HR & Payroll", href: "/admin/hr" },
  { icon: "🔔", label: "Notifications", href: "/admin/notifications" },
  { icon: "📈", label: "Analytics", href: "/admin/analytics" },
  { icon: "📚", label: "Library", href: "/admin/library" },
  { icon: "📦", label: "Assets", href: "/admin/assets" },
  { icon: "🛎️", label: "Reception", href: "/admin/reception" },
];

import { GlobalSearch } from "@/components/GlobalSearch";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const sidebar = [...adminSidebar];
  if (user?.role === "SUPER_ADMIN") {
    sidebar.push({ icon: "🏢", label: "SaaS Requests", href: "/admin/saas-requests" });
  }

  return (
    <>
      <DashboardLayout
        sidebarItems={sidebar}
        role={user?.role === "SUPER_ADMIN" ? "Super Admin" : "ERP Admin"}
        roleIcon="⚙️"
        roleColor="#3B82F6"
        userName={user?.name || "Loading..."}
        userSubtitle="School Operations"
      >
        {children}
      </DashboardLayout>
      <GlobalSearch />
    </>
  );
}
