"use client";

import { useMemo } from "react";
import { DashboardLayout, SidebarItem, SidebarSubItem } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";
import { useSchoolModules } from "@/lib/api-hooks";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { QuickAccessDock } from "@/components/QuickAccessDock";

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

interface ModuleStatusInfo {
  isEnabled: boolean;
  isCore: boolean;
  operationalState?: string;
  badge?: string;
}

/**
 * Strict fail-closed module entitlement & lifecycle resolver.
 * - Universal items (no moduleCode) always resolve to active.
 * - Core modules (ACADEMICS, FINANCE) always resolve to active.
 * - Optional modules fail closed (false) if data is missing, loading, errored, or unrecognized.
 */
function resolveModuleStatus(moduleData: any, code?: string): ModuleStatusInfo {
  if (!code) {
    return { isEnabled: true, isCore: true };
  }

  const upperCode = code.toUpperCase();

  // Immutable Core Modules are always entitled
  if (upperCode === "ACADEMICS" || upperCode === "FINANCE") {
    return { isEnabled: true, isCore: true };
  }

  // Strict Fail-Closed: While loading or on error, optional modules are hidden
  if (!moduleData) {
    return { isEnabled: false, isCore: false };
  }

  const raw = moduleData.data?.modules ?? moduleData.modules ?? moduleData.data ?? moduleData;
  const list = Array.isArray(raw) ? raw : [];

  const found = list.find(
    (item: any) =>
      item.module?.code?.toUpperCase() === upperCode ||
      item.module?.id?.toUpperCase() === upperCode ||
      item.code?.toUpperCase() === upperCode ||
      item.id?.toUpperCase() === upperCode
  );

  if (!found) {
    return { isEnabled: false, isCore: false };
  }

  const isEnabled = Boolean(found.isEnabled ?? found.enabled);
  const isCore = Boolean(found.module?.isCore ?? false);

  return {
    isEnabled,
    isCore,
    operationalState: found.operationalState,
    badge: found.badge,
  };
}

/**
 * Canonical ERP Admin Information Architecture (Exactly 10 Expandable Groups)
 * In strict compliance with Prompt Section 5.3 & docs/ERP_ADMIN_INFORMATION_ARCHITECTURE.md.
 */
const NAV_GROUPS: NavGroupDefinition[] = [
  // Group 1 — Institution Setup
  {
    icon: "🏛️",
    label: "Institution Setup",
    href: "/admin/institution",
    moduleCode: "ACADEMICS",
    children: [
      { icon: "📅", label: "Academic Sessions & Calendar", href: "/admin/institution/sessions" },
      { icon: "🏷️", label: "Classes, Sections & Grades", href: "/admin/institution/classes" },
      { icon: "📖", label: "Curriculum & Subjects", href: "/admin/institution/curriculum" },
      { icon: "⚙️", label: "Institution & Campus Settings", href: "/admin/settings" },
    ],
  },

  // Group 2 — Admissions & Student Affairs
  {
    icon: "👥",
    label: "Admissions & Students",
    href: "/admin/admissions",
    moduleCode: "ACADEMICS",
    children: [
      { icon: "📋", label: "Admissions & CRM", href: "/admin/admissions" },
      { icon: "📥", label: "Bulk Registration", href: "/admin/admissions/bulk" },
      { icon: "📜", label: "Import History", href: "/admin/admissions/history" },
      { icon: "👨‍🎓", label: "Student Directory", href: "/admin/students" },
      { icon: "👨‍👩‍👧", label: "Parents & Guardians", href: "/admin/students/guardians" },
      { icon: "📑", label: "Document Verification", href: "/admin/documents" },
    ],
  },

  // Group 3 — Academic Operations
  {
    icon: "📚",
    label: "Academic Operations",
    href: "/admin/academic",
    moduleCode: "ACADEMICS",
    children: [
      { icon: "✅", label: "Daily Attendance", href: "/admin/attendance" },
      { icon: "⏱️", label: "Timetable & Substitution", href: "/admin/timetable" },
      { icon: "📝", label: "Assignments & LMS", href: "/admin/assignments" },
      { icon: "📑", label: "Examination Management", href: "/admin/exams", moduleCode: "EXAMS" },
      { icon: "🏆", label: "Results & Report Cards", href: "/admin/results", moduleCode: "EXAMS" },
    ],
  },

  // Group 4 — Finance & Accounts
  {
    icon: "💰",
    label: "Finance & Accounts",
    href: "/admin/fees",
    moduleCode: "FINANCE",
    children: [
      { icon: "💳", label: "Fee Management", href: "/admin/fees" },
      { icon: "⚠️", label: "Payments & Dues", href: "/admin/fees/defaulters" },
      { icon: "📒", label: "Accounting & Ledger", href: "/admin/fees/ledger" },
    ],
  },

  // Group 5 — HR & Workforce
  {
    icon: "👔",
    label: "HR & Workforce",
    href: "/admin/hr",
    moduleCode: "HR_PAYROLL",
    children: [
      { icon: "📋", label: "Staff Directory & Ops", href: "/admin/hr", moduleCode: "HR_PAYROLL" },
      { icon: "👨‍🏫", label: "Faculty & Teachers", href: "/admin/teachers", moduleCode: "HR_PAYROLL" },
    ],
  },

  // Group 6 — Campus Operations [Dynamic Group: collapses if both HOSTEL and TRANSPORT are disabled]
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
      { icon: "📦", label: "Inventory & Assets", href: "/admin/assets", moduleCode: "INVENTORY" },
      { icon: "🛎️", label: "Reception & Visitors", href: "/admin/reception" },
      { icon: "⚖️", label: "Discipline & Welfare", href: "/admin/discipline" },
    ],
  },

  // Group 8 — Communication & Records
  {
    icon: "📢",
    label: "Communication & Records",
    href: "/admin/communication",
    children: [
      { icon: "🗓️", label: "Events & Calendar", href: "/admin/events", moduleCode: "COMMUNICATIONS" },
      { icon: "📌", label: "Notices & Announcements", href: "/admin/notices", moduleCode: "COMMUNICATIONS" },
      { icon: "🔔", label: "Communication Alerts", href: "/admin/notifications", moduleCode: "COMMUNICATIONS" },
      { icon: "📜", label: "Documents & Records", href: "/admin/documents" },
      { icon: "🎓", label: "Alumni Management", href: "/admin/alumni-mgmt" },
      { icon: "🌐", label: "School Website CMS", href: "/admin/site-settings" },
    ],
  },

  // Group 9 — Reports & Analytics
  {
    icon: "📈",
    label: "Reports & Analytics",
    href: "/admin/analytics",
    moduleCode: "ACADEMICS",
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
      { icon: "👤", label: "User Management", href: "/admin/users" },
      { icon: "🏢", label: "Institution Settings", href: "/admin/settings" },
      { icon: "📜", label: "System Audit Logs", href: "/admin/settings/audit-logs" },
      { icon: "🛡️", label: "Policies & Data Retention", href: "/admin/settings/policies" },
      { icon: "🏛️", label: "Institutional Governance", href: "/admin/governance" },
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

    // 2. Canonical 10 Expandable Groups (Governed by Institutional Module Entitlements)
    for (const group of NAV_GROUPS) {
      // Entitlement filter on group level
      if (group.moduleCode) {
        const groupStatus = resolveModuleStatus(moduleData, group.moduleCode);
        if (!groupStatus.isEnabled) {
          continue;
        }
      }

      const enabledChildren: SidebarSubItem[] = [];
      for (const child of group.children) {
        const childStatus = resolveModuleStatus(moduleData, child.moduleCode);
        if (childStatus.isEnabled) {
          enabledChildren.push({
            icon: child.icon,
            label: child.label,
            href: child.href,
            badge: childStatus.badge || child.badge,
          });
        }
      }

      // Hide parent groups where all children are unentitled
      if (enabledChildren.length > 0) {
        items.push({
          icon: group.icon,
          label: group.label,
          href: group.href,
          children: enabledChildren,
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
        userName={user?.name || "School Administrator"}
        userSubtitle={user?.email || "School Operations"}
      >
        <Breadcrumbs />
        <QuickAccessDock />
        {children}
      </DashboardLayout>
      <GlobalSearch />
    </>
  );
}
