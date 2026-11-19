"use client";

import { useMemo } from "react";
import { DashboardLayout, SidebarItem, SidebarSubItem } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";
import { useSchoolModules } from "@/lib/api-hooks";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { QuickAccessDock } from "@/components/QuickAccessDock";
import { SupportSessionBanner } from "@/components/SupportSessionBanner";

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
 * Institutional ERP Admin Navigation Architecture
 * Exact hierarchy in compliance with Section 5.1 of the UI/UX Specification:
 * - Overview / Dashboard
 * - Admissions and Students
 * - Staff and Academics
 * - Daily Operations
 * - Finance
 * - Assessment
 * - Campus Operations
 * - Reports and Administration
 */
const NAV_GROUPS: NavGroupDefinition[] = [
  // 1. Admissions and Students
  {
    icon: "👥",
    label: "Admissions and Students",
    href: "/admin/admissions",
    moduleCode: "ACADEMICS",
    children: [
      { icon: "📋", label: "Admissions CRM", href: "/admin/admissions" },
      { icon: "👨‍🎓", label: "Student Directory", href: "/admin/students" },
      { icon: "📥", label: "Import Students", href: "/admin/students/import" },
      { icon: "👨‍👩‍👧", label: "Guardians & Family", href: "/admin/students/guardians" },
      { icon: "📑", label: "Document Verification", href: "/admin/documents" },
    ],
  },

  // 2. Staff and Academics
  {
    icon: "👔",
    label: "Staff and Academics",
    href: "/admin/teachers",
    moduleCode: "ACADEMICS",
    children: [
      { icon: "👨‍🏫", label: "Teachers & Staff", href: "/admin/teachers" },
      { icon: "📥", label: "Import Staff", href: "/admin/teachers/import" },
      { icon: "🏷️", label: "Classes & Sections", href: "/admin/institution/classes" },
      { icon: "📖", label: "Subjects & Curriculum", href: "/admin/institution/curriculum" },
      { icon: "⏱️", label: "Timetable Management", href: "/admin/timetable" },
    ],
  },

  // 3. Daily Operations
  {
    icon: "✅",
    label: "Daily Operations",
    href: "/admin/attendance",
    children: [
      { icon: "📅", label: "Student & Staff Attendance", href: "/admin/attendance" },
      { icon: "📢", label: "Announcements & Alerts", href: "/admin/notifications", moduleCode: "COMMUNICATIONS" },
      { icon: "🗓️", label: "School Events Calendar", href: "/admin/events", moduleCode: "COMMUNICATIONS" },
      { icon: "🛎️", label: "Reception & Visitors", href: "/admin/reception" },
    ],
  },

  // 4. Finance & Accounts
  {
    icon: "💰",
    label: "Finance",
    href: "/admin/fees",
    moduleCode: "FINANCE",
    children: [
      { icon: "💳", label: "Fee Management & Structure", href: "/admin/fees" },
      { icon: "⚠️", label: "Payments & Dues", href: "/admin/fees/defaulters" },
      { icon: "📒", label: "Receipts & General Ledger", href: "/admin/fees/ledger" },
    ],
  },

  // 5. Assessment
  {
    icon: "📝",
    label: "Assessment",
    href: "/admin/exams",
    moduleCode: "EXAMS",
    children: [
      { icon: "📑", label: "Examinations", href: "/admin/exams", moduleCode: "EXAMS" },
      { icon: "🏆", label: "Marks & Results", href: "/admin/results", moduleCode: "EXAMS" },
      { icon: "📚", label: "Assignments & LMS", href: "/admin/assignments" },
    ],
  },

  // 6. Campus Operations (Dynamic Group: collapses if HOSTEL and TRANSPORT are both disabled)
  {
    icon: "🏫",
    label: "Campus Operations",
    href: "/admin/hostel",
    children: [
      { icon: "🛏️", label: "Hostel Management", href: "/admin/hostel", moduleCode: "HOSTEL" },
      { icon: "🚌", label: "Transport & Vehicles", href: "/admin/transport", moduleCode: "TRANSPORT" },
    ],
  },

  // 7. Reports and Administration
  {
    icon: "⚙️",
    label: "Reports and Administration",
    href: "/admin/settings",
    children: [
      { icon: "📈", label: "Institutional Reports", href: "/admin/analytics", moduleCode: "ACADEMICS" },
      { icon: "👤", label: "Users & Roles", href: "/admin/users" },
      { icon: "⚙️", label: "School Settings", href: "/admin/settings" },
      { icon: "📜", label: "System Audit Logs", href: "/admin/settings/audit-logs" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: moduleData } = useSchoolModules();

  const sidebarItems: SidebarItem[] = useMemo(() => {
    // 1. Top-Level Overview / Dashboard
    const items: SidebarItem[] = [
      { icon: "📊", label: "Dashboard", href: "/admin" },
    ];

    // 2. Canonical Groups Filtered by Strict Tenant Entitlements
    for (const group of NAV_GROUPS) {
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

      // Hide group if all its children are unentitled
      if (enabledChildren.length > 0) {
        items.push({
          icon: group.icon,
          label: group.label,
          href: group.href,
          children: enabledChildren,
        });
      }
    }

    // 3. Platform Super Admin Delegated Links
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
        <SupportSessionBanner />
        <Breadcrumbs />
        <QuickAccessDock />
        {children}
      </DashboardLayout>
      <GlobalSearch />
    </>
  );
}
