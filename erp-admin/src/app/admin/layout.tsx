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
];

import { GlobalSearch } from "@/components/GlobalSearch";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <DashboardLayout
        sidebarItems={adminSidebar}
        role="ERP Admin"
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
