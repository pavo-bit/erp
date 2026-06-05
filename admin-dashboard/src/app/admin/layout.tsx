"use client";

import { DashboardLayout, SidebarItem } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

const adminSidebar: SidebarItem[] = [
  { icon: "📊", label: "Dashboard", href: "/admin" },
  { icon: "📢", label: "Notices", href: "/admin/notices", badge: "3" },
  { icon: "📅", label: "Events", href: "/admin/events" },
  { icon: "📷", label: "Gallery", href: "/admin/gallery" },
  { icon: "📝", label: "Results", href: "/admin/results" },
  { icon: "📋", label: "Assignments", href: "/admin/assignments" },
  { icon: "👨‍🎓", label: "Students", href: "/admin/students" },
  { icon: "👨‍👩‍👧", label: "Parents", href: "/admin/parents" },
  { icon: "👨‍🏫", label: "Faculty", href: "/admin/faculty" },
  { icon: "🎓", label: "Alumni", href: "/admin/alumni-mgmt" },
  { icon: "💰", label: "Fees", href: "/admin/fees" },
  { icon: "🔔", label: "Notifications", href: "/admin/notifications" },
  { icon: "📈", label: "Analytics", href: "/admin/analytics" },
  { icon: "⚙️", label: "Settings", href: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <DashboardLayout
      sidebarItems={adminSidebar}
      role="Admin"
      roleIcon="🛡️"
      roleColor="#FF6B00"
      userName={user?.name || "Loading..."}
      userSubtitle="Principal · Super Admin"
    >
      {children}
    </DashboardLayout>
  );
}
