"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface RouteMeta {
  group: string;
  label: string;
  parentHref?: string;
}

const CANONICAL_ROUTE_LABELS: Record<string, RouteMeta> = {
  // Standalone Dashboard
  "/admin": { group: "Overview", label: "Dashboard" },

  // Group 1 — Institution Setup
  "/admin/institution": { group: "Institution Setup", label: "Institution" },
  "/admin/institution/sessions": { group: "Institution Setup", label: "Academic Sessions & Calendar", parentHref: "/admin/institution" },
  "/admin/institution/classes": { group: "Institution Setup", label: "Classes, Sections & Grades", parentHref: "/admin/institution" },
  "/admin/institution/curriculum": { group: "Institution Setup", label: "Curriculum & Subjects", parentHref: "/admin/institution" },
  "/admin/settings": { group: "Institution Setup", label: "Institution & Campus Settings" },

  // Group 2 — Admissions & Student Affairs
  "/admin/admissions": { group: "Admissions & Students", label: "Admissions & CRM" },
  "/admin/admissions/bulk": { group: "Admissions & Students", label: "Bulk Registration", parentHref: "/admin/admissions" },
  "/admin/admissions/history": { group: "Admissions & Students", label: "Import History", parentHref: "/admin/admissions" },
  "/admin/students": { group: "Admissions & Students", label: "Student Directory" },
  "/admin/students/guardians": { group: "Admissions & Students", label: "Parents & Guardians", parentHref: "/admin/students" },
  "/admin/documents": { group: "Admissions & Students", label: "Document Verification" },

  // Group 3 — Academic Operations
  "/admin/academic": { group: "Academic Operations", label: "Academic Operations" },
  "/admin/attendance": { group: "Academic Operations", label: "Daily Attendance" },
  "/admin/timetable": { group: "Academic Operations", label: "Timetable & Substitution" },
  "/admin/assignments": { group: "Academic Operations", label: "Assignments & LMS" },
  "/admin/exams": { group: "Academic Operations", label: "Examination Management" },
  "/admin/results": { group: "Academic Operations", label: "Results & Report Cards", parentHref: "/admin/exams" },

  // Group 4 — Finance & Accounts
  "/admin/fees": { group: "Finance & Accounts", label: "Fee Management" },
  "/admin/fees/defaulters": { group: "Finance & Accounts", label: "Payments & Outstanding Dues", parentHref: "/admin/fees" },
  "/admin/fees/ledger": { group: "Finance & Accounts", label: "Accounting & Ledger", parentHref: "/admin/fees" },

  // Group 5 — HR & Workforce
  "/admin/hr": { group: "HR & Workforce", label: "Staff Directory & Operations" },
  "/admin/teachers": { group: "HR & Workforce", label: "Faculty & Teachers", parentHref: "/admin/hr" },

  // Group 6 — Campus Operations
  "/admin/campus-operations": { group: "Campus Operations", label: "Campus Operations" },
  "/admin/hostel": { group: "Campus Operations", label: "Hostel Management" },
  "/admin/transport": { group: "Campus Operations", label: "Transport & Vehicles" },

  // Group 7 — Campus Services & Resources
  "/admin/services": { group: "Campus Services", label: "Campus Services" },
  "/admin/library": { group: "Campus Services", label: "Library Management" },
  "/admin/assets": { group: "Campus Services", label: "Inventory & Assets" },
  "/admin/reception": { group: "Campus Services", label: "Reception & Visitors" },
  "/admin/discipline": { group: "Campus Services", label: "Discipline & Welfare" },

  // Group 8 — Communication & Records
  "/admin/communication": { group: "Communication & Records", label: "Communication" },
  "/admin/events": { group: "Communication & Records", label: "Events & Calendar" },
  "/admin/notices": { group: "Communication & Records", label: "Notices & Announcements" },
  "/admin/notifications": { group: "Communication & Records", label: "Communication Alerts" },
  "/admin/alumni-mgmt": { group: "Communication & Records", label: "Alumni Management" },
  "/admin/site-settings": { group: "Communication & Records", label: "School Website CMS" },

  // Group 9 — Reports & Analytics
  "/admin/analytics": { group: "Reports & Analytics", label: "Executive Analytics" },

  // Group 10 — Administration & Settings
  "/admin/users": { group: "Administration & Settings", label: "User Management" },
  "/admin/settings/audit-logs": { group: "Administration & Settings", label: "System Audit Logs", parentHref: "/admin/settings" },
  "/admin/settings/policies": { group: "Administration & Settings", label: "Policies & Data Retention", parentHref: "/admin/settings" },
  "/admin/governance": { group: "Administration & Settings", label: "Institutional Governance" },
  "/admin/saas-requests": { group: "Administration & Settings", label: "SaaS Onboarding Requests" },
};

export function Breadcrumbs() {
  const pathname = usePathname();

  // Root or dashboard doesn't need breadcrumb
  if (pathname === "/admin") {
    return null;
  }

  // Handle dynamic student profile route like /admin/students/[id]
  let mapped = CANONICAL_ROUTE_LABELS[pathname];
  let dynamicDetail = "";

  if (!mapped) {
    if (pathname.startsWith("/admin/students/")) {
      mapped = {
        group: "Admissions & Students",
        label: "Student Directory",
        parentHref: "/admin/students",
      };
      dynamicDetail = "Student Profile";
    } else {
      // Fallback decomposition for dynamic paths
      const segments = pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1];
      const capitalized = last ? last.charAt(0).toUpperCase() + last.slice(1) : "Section";
      mapped = { group: "School Operations", label: capitalized };
    }
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className="flex items-center gap-1.5 text-xs font-medium text-text-secondary pb-1 border-b border-border/60"
    >
      <Link
        href="/admin"
        className="flex items-center gap-1 text-text-secondary hover:text-primary transition-colors no-underline"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Admin</span>
      </Link>

      <ChevronRight className="w-3 h-3 text-text-secondary/50 shrink-0" />
      <span className="text-text-secondary font-semibold">{mapped.group}</span>

      <ChevronRight className="w-3 h-3 text-text-secondary/50 shrink-0" />
      {mapped.parentHref && !dynamicDetail ? (
        <>
          <Link
            href={mapped.parentHref}
            className="text-text-secondary hover:text-primary transition-colors no-underline"
          >
            {mapped.label}
          </Link>
        </>
      ) : dynamicDetail ? (
        <>
          <Link
            href="/admin/students"
            className="text-text-secondary hover:text-primary transition-colors no-underline"
          >
            {mapped.label}
          </Link>
          <ChevronRight className="w-3 h-3 text-text-secondary/50 shrink-0" />
          <span className="text-primary font-bold">{dynamicDetail}</span>
        </>
      ) : (
        <span className="text-primary font-bold">{mapped.label}</span>
      )}
    </nav>
  );
}
