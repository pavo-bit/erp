"use client";

import { DashboardLayout, SidebarItem } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

const studentSidebar: SidebarItem[] = [
  { icon: "🏠", label: "Home", href: "/student" },
  { icon: "📋", label: "Attendance", href: "/student/attendance" },
  { icon: "📅", label: "Timetable", href: "/student/timetable" },
  { icon: "📝", label: "Assignments", href: "/student/assignments", badge: "2" },
  { icon: "📊", label: "Results", href: "/student/results" },
  { icon: "💳", label: "Fees & Payments", href: "/student/fees" },
  { icon: "📢", label: "Notices", href: "/student/notices" },
  { icon: "👤", label: "Profile", href: "/student/profile" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const student = user?.student as Record<string, string> | undefined;

  return (
    <DashboardLayout
      sidebarItems={studentSidebar}
      role="Student"
      roleIcon="🎓"
      roleColor="#3B82F6"
      userName={user?.name || "Loading..."}
      userSubtitle={student ? `Class ${student.class}-${student.section} · Roll ${student.rollNo}` : "Student Portal"}
    >
      {children}
    </DashboardLayout>
  );
}
