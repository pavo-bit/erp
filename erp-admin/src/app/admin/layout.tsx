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
 * Exact hierarchy in compliance with approved Block B-A plan:
 * 1. Admissions & Students
 * 2. Academics
 * 3. Examinations (EXAMS)
 * 4. Finance (FINANCE)
 * 5. HR & Payroll (HR_PAYROLL)
 * 6. Transport (TRANSPORT)
 * 7. Hostel (HOSTEL)
 * 8. Library (LIBRARY)
 * 9. Inventory & Procurement (INVENTORY)
 * 10. Communications (COMMUNICATIONS)
 * 11. Biometric attendance (BIOMETRIC_ATTENDANCE)
 * 12. Reports
 * 13. Administration
 */
const NAV_GROUPS: NavGroupDefinition[] = [
  // 1. Admissions & Students
  {
    icon: "👥",
    label: "Admissions & Students",
    href: "/admin/admissions",
    children: [
      { icon: "📋", label: "Admissions CRM", href: "/admin/admissions" },
      { icon: "👨‍🎓", label: "Student Directory", href: "/admin/students" },
      { icon: "📥", label: "Import Students", href: "/admin/students/import" },
      { icon: "👨‍👩‍👧", label: "Guardians & Family", href: "/admin/students/guardians" },
      { icon: "📑", label: "Document Verification", href: "/admin/documents" },
    ],
  },

  // 2. Academics
  {
    icon: "🎓",
    label: "Academics",
    href: "/admin/teachers",
    children: [
      { icon: "👨‍🏫", label: "Teachers & Staff", href: "/admin/teachers" },
      { icon: "📥", label: "Import Staff", href: "/admin/teachers/import" },
      { icon: "🏷️", label: "Classes & Sections", href: "/admin/institution/classes" },
      { icon: "📖", label: "Subjects & Curriculum", href: "/admin/institution/curriculum" },
      { icon: "⏱️", label: "Timetable Management", href: "/admin/timetable" },
    ],
  },

  // 3. Examinations (EXAMS)
  {
    icon: "📝",
    label: "Examinations",
    href: "/admin/exams",
    moduleCode: "EXAMS",
    children: [
      { icon: "📑", label: "Examinations", href: "/admin/exams", moduleCode: "EXAMS" },
      { icon: "🏆", label: "Marks & Results", href: "/admin/results", moduleCode: "EXAMS" },
      { icon: "📚", label: "Assignments & LMS", href: "/admin/assignments", moduleCode: "EXAMS" },
    ],
  },

  // 4. Finance (FINANCE)
  {
    icon: "💰",
    label: "Finance",
    href: "/admin/fees",
    moduleCode: "FINANCE",
    children: [
      { icon: "💳", label: "Fee Management & Structure", href: "/admin/fees", moduleCode: "FINANCE" },
      { icon: "⚠️", label: "Payments & Dues", href: "/admin/fees/defaulters", moduleCode: "FINANCE" },
      { icon: "📒", label: "Receipts & General Ledger", href: "/admin/fees/ledger", moduleCode: "FINANCE" },
      { icon: "💵", label: "Cashier Fee Collection", href: "/finance/fee-collection", moduleCode: "FINANCE" },
      { icon: "🔒", label: "Financial Period Close", href: "/finance/close", moduleCode: "FINANCE" },
    ],
  },

  // 5. HR & Payroll (HR_PAYROLL)
  {
    icon: "👔",
    label: "HR & Payroll",
    href: "/admin/faculty",
    moduleCode: "HR_PAYROLL",
    children: [
      { icon: "👥", label: "Staff Directory", href: "/admin/faculty", moduleCode: "HR_PAYROLL" },
      { icon: "🏖️", label: "HR & Leaves", href: "/admin/hr", moduleCode: "HR_PAYROLL" },
    ],
  },

  // 6. Transport (TRANSPORT)
  {
    icon: "🚌",
    label: "Transport",
    href: "/admin/transport",
    moduleCode: "TRANSPORT",
    children: [
      { icon: "🚌", label: "Transport & Vehicles", href: "/admin/transport", moduleCode: "TRANSPORT" },
    ],
  },

  // 7. Hostel (HOSTEL)
  {
    icon: "🛏️",
    label: "Hostel",
    href: "/admin/hostel",
    moduleCode: "HOSTEL",
    children: [
      { icon: "🛏️", label: "Hostel Management", href: "/admin/hostel", moduleCode: "HOSTEL" },
    ],
  },

  // 8. Library (LIBRARY)
  {
    icon: "📚",
    label: "Library",
    href: "/admin/library",
    moduleCode: "LIBRARY",
    children: [
      { icon: "📖", label: "Books & Circulation", href: "/admin/library", moduleCode: "LIBRARY" },
    ],
  },

  // 9. Inventory & Procurement (INVENTORY)
  {
    icon: "📦",
    label: "Inventory & Procurement",
    href: "/admin/assets",
    moduleCode: "INVENTORY",
    children: [
      { icon: "📦", label: "Assets & Inventory", href: "/admin/assets", moduleCode: "INVENTORY" },
    ],
  },

  // 10. Communications (COMMUNICATIONS)
  {
    icon: "📢",
    label: "Communications",
    href: "/admin/notifications",
    moduleCode: "COMMUNICATIONS",
    children: [
      { icon: "🔔", label: "Announcements & Alerts", href: "/admin/notifications", moduleCode: "COMMUNICATIONS" },
      { icon: "🗓️", label: "School Events Calendar", href: "/admin/events", moduleCode: "COMMUNICATIONS" },
      { icon: "🖼️", label: "Gallery & Media", href: "/admin/gallery", moduleCode: "COMMUNICATIONS" },
    ],
  },

  // 11. Biometric attendance (BIOMETRIC_ATTENDANCE)
  {
    icon: "✅",
    label: "Biometric Attendance",
    href: "/admin/attendance",
    moduleCode: "BIOMETRIC_ATTENDANCE",
    children: [
      { icon: "📅", label: "Attendance Matrix", href: "/admin/attendance", moduleCode: "BIOMETRIC_ATTENDANCE" },
    ],
  },

  // 12. Reports
  {
    icon: "📈",
    label: "Reports",
    href: "/admin/analytics",
    children: [
      { icon: "📊", label: "Institutional Reports", href: "/admin/analytics" },
    ],
  },

  // 13. Administration
  {
    icon: "⚙️",
    label: "Administration",
    href: "/admin/settings",
    children: [
      { icon: "👤", label: "Users & Roles", href: "/admin/users" },
      { icon: "⚖️", label: "Discipline & Conduct", href: "/admin/discipline" },
      { icon: "🛎️", label: "Reception & Visitors", href: "/admin/reception" },
      { icon: "⚙️", label: "School Settings", href: "/admin/settings" },
      { icon: "📜", label: "System Audit Logs", href: "/admin/settings/audit-logs" },
      { icon: "📋", label: "System Policies", href: "/admin/settings/policies" },
      { icon: "🌐", label: "Site CMS Settings", href: "/admin/site-settings" },
      { icon: "🩺", label: "SHFI Health", href: "/system/shfi" },
      { icon: "🎓", label: "Alumni Management", href: "/admin/alumni-mgmt" },
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

    return items;
  }, [moduleData]);

  return (
    <>
      <DashboardLayout
        sidebarItems={sidebarItems}
        role="ERP Admin"
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
