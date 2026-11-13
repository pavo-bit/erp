"use client";

import { useMemo } from "react";
import { DashboardLayout, SidebarItem, SidebarSubItem } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";
import { useSchoolModules } from "@/lib/api-hooks";
import { GlobalSearch } from "@/components/GlobalSearch";

interface NavChildDefinition extends SidebarSubItem {
  moduleCode?: string;
}

interface NavGroupDefinition {
  icon: string;
  label: string;
  href: string;
  moduleCode?: string;
  children: NavChildDefinition[];
}

function isModuleEnabled(moduleData: any, code?: string): boolean {
  if (!code) return true;
  if (!moduleData) return true; // optimistic default while loading
  const modules = moduleData.modules ?? moduleData;
  if (Array.isArray(modules)) {
    const found = modules.find(
      (m: any) =>
        m.module?.code?.toUpperCase() === code ||
        m.module?.id?.toUpperCase() === code ||
        m.code?.toUpperCase() === code ||
        m.id?.toUpperCase() === code
    );
    return found ? Boolean(found.isEnabled ?? found.enabled) : true;
  }
  if (typeof modules === "object" && modules !== null) {
    if (modules[code] !== undefined) return Boolean(modules[code]);
    if (modules[code.toLowerCase()] !== undefined) return Boolean(modules[code.toLowerCase()]);
  }
  return true;
}

const NAV_GROUPS: NavGroupDefinition[] = [
  // Group 1 — Institution Setup
  {
    icon: "🏛️",
    label: "Institution Setup",
    href: "/admin/institution",
    children: [
      { icon: "🏫", label: "Campus & Settings", href: "/admin/settings" },
      { icon: "📅", label: "Academic Sessions", href: "/admin/institution/sessions" },
      { icon: "🏷️", label: "Classes & Sections", href: "/admin/institution/classes" },
      { icon: "📖", label: "Curriculum & Subjects", href: "/admin/institution/curriculum" },
    ],
  },

  // Group 2 — Admissions & Student Affairs
  {
    icon: "👥",
    label: "Admissions & Students",
    href: "/admin/admissions",
    children: [
      { icon: "📋", label: "Admissions & CRM", href: "/admin/admissions", moduleCode: "ADMISSIONS" },
      { icon: "📥", label: "Bulk Registration", href: "/admin/admissions/bulk", moduleCode: "ADMISSIONS" },
      { icon: "📜", label: "Import History", href: "/admin/admissions/history", moduleCode: "ADMISSIONS" },
      { icon: "👨‍🎓", label: "Student Directory", href: "/admin/students" },
      { icon: "👨‍👩‍👧", label: "Parents & Guardians", href: "/admin/students/guardians" },
    ],
  },

  // Group 3 — Academic Operations
  {
    icon: "📚",
    label: "Academic Operations",
    href: "/admin/academic",
    children: [
      { icon: "✅", label: "Attendance", href: "/admin/attendance", moduleCode: "ATTENDANCE" },
      { icon: "⏱️", label: "Timetable", href: "/admin/timetable", moduleCode: "TIMETABLE" },
      { icon: "📝", label: "Assignments & LMS", href: "/admin/assignments", moduleCode: "ASSIGNMENTS" },
      { icon: "📑", label: "Examinations", href: "/admin/exams", moduleCode: "EXAMS" },
      { icon: "🏆", label: "Results & Grades", href: "/admin/results", moduleCode: "EXAMS" },
    ],
  },

  // Group 4 — Finance & Accounts
  {
    icon: "💰",
    label: "Finance & Accounts",
    href: "/admin/fees",
    moduleCode: "FEES",
    children: [
      { icon: "💳", label: "Fee Management", href: "/admin/fees" },
      { icon: "⚠️", label: "Fee Defaulters", href: "/admin/fees/defaulters" },
      { icon: "📒", label: "Accounting & Ledger", href: "/admin/fees/ledger" },
    ],
  },

  // Group 5 — HR & Workforce
  {
    icon: "👔",
    label: "HR & Workforce",
    href: "/admin/hr",
    moduleCode: "HR",
    children: [
      { icon: "📋", label: "Staff & Payroll", href: "/admin/hr" },
      { icon: "👨‍🏫", label: "Faculty & Teachers", href: "/admin/teachers" },
    ],
  },

  // Group 6 — Campus Operations [PRESERVED APPROVED IMPLEMENTATION]
  {
    icon: "🏫",
    label: "Campus Operations",
    href: "/admin/campus-operations",
    children: [
      { icon: "🛏️", label: "Hostel Management", href: "/admin/hostel", moduleCode: "HOSTEL" },
      { icon: "🚌", label: "Transport & Vehicles", href: "/admin/transport", moduleCode: "TRANSPORT" },
    ],
  },

  // Group 7 — Campus Services & Resources
  {
    icon: "🛎️",
    label: "Campus Services",
    href: "/admin/services",
    children: [
      { icon: "📖", label: "Library Management", href: "/admin/library", moduleCode: "LIBRARY" },
      { icon: "📦", label: "Assets & Inventory", href: "/admin/assets", moduleCode: "ASSETS" },
      { icon: "🛎️", label: "Reception & Visitors", href: "/admin/reception", moduleCode: "RECEPTION" },
      { icon: "⚖️", label: "Student Discipline", href: "/admin/discipline", moduleCode: "DISCIPLINE" },
    ],
  },

  // Group 8 — Communication & Records
  {
    icon: "📢",
    label: "Communication & Records",
    href: "/admin/communication",
    children: [
      { icon: "🗓️", label: "Events & Calendar", href: "/admin/events" },
      { icon: "📌", label: "Notices & Circulars", href: "/admin/notices" },
      { icon: "🔔", label: "Notifications & Alerts", href: "/admin/notifications" },
      { icon: "📜", label: "Documents & Certificates", href: "/admin/documents" },
      { icon: "🎓", label: "Alumni Management", href: "/admin/alumni-mgmt", moduleCode: "ALUMNI" },
      { icon: "🌐", label: "School Website CMS", href: "/admin/site-settings" },
    ],
  },

  // Group 9 — Reports & Analytics
  {
    icon: "📈",
    label: "Reports & Analytics",
    href: "/admin/analytics",
    moduleCode: "ANALYTICS",
    children: [
      { icon: "📊", label: "Executive Analytics", href: "/admin/analytics" },
    ],
  },

  // Group 10 — Administration & Settings
  {
    icon: "⚙️",
    label: "Administration & Settings",
    href: "/admin/settings",
    children: [
      { icon: "👤", label: "User Directory", href: "/admin/users" },
      { icon: "🏢", label: "Institution Settings", href: "/admin/settings" },
      { icon: "📜", label: "System Audit Logs", href: "/admin/settings/audit-logs" },
      { icon: "🛡️", label: "Policies & Data Retention", href: "/admin/settings/policies" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: moduleData } = useSchoolModules();

  const sidebarItems: SidebarItem[] = useMemo(() => {
    // 1. Standalone Dashboard Entry
    const items: SidebarItem[] = [
      { icon: "📊", label: "Dashboard", href: "/admin" },
    ];

    // 2. Exactly Ten Expandable Groups (Filtered by Tenant Module Entitlements)
    for (const group of NAV_GROUPS) {
      if (group.moduleCode && !isModuleEnabled(moduleData, group.moduleCode)) {
        continue;
      }

      const enabledChildren = group.children.filter((child) =>
        isModuleEnabled(moduleData, child.moduleCode)
      );

      if (enabledChildren.length > 0) {
        items.push({
          icon: group.icon,
          label: group.label,
          href: group.href,
          children: enabledChildren.map((c) => ({
            icon: c.icon,
            label: c.label,
            href: c.href,
            badge: c.badge,
          })),
        });
      }
    }

    // 3. Platform Super Admin Additions
    if (user?.role === "SUPER_ADMIN") {
      items.push({ icon: "🏢", label: "SaaS Requests", href: "/admin/saas-requests" });
    }

    return items;
  }, [moduleData, user?.role]);

  return (
    <>
      <DashboardLayout
        sidebarItems={sidebarItems}
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
