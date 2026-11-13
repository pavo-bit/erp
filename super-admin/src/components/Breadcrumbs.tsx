"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function SuperAdminBreadcrumbs() {
  const pathname = usePathname();

  // Root Command Center doesn't need breadcrumbs
  if (pathname === "/dashboard") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  // e.g. ["dashboard", "schools", "cmv...", "modules"]

  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Platform", href: "/dashboard" },
  ];

  if (segments.length >= 2) {
    const section = segments[1];
    if (section === "schools") {
      crumbs.push({ label: "School Network", href: "/dashboard/schools" });
      if (segments.length >= 4) {
        const subAction = segments[3];
        if (subAction === "modules") {
          crumbs.push({ label: "Module Entitlements" });
        } else if (subAction === "shifts") {
          crumbs.push({ label: "Shift Configuration" });
        } else {
          crumbs.push({ label: "Tenant Details" });
        }
      }
    } else if (section === "requests") {
      crumbs.push({ label: "SaaS Requests" });
    } else if (section === "analytics") {
      crumbs.push({ label: "Global Analytics" });
    } else if (section === "shfi") {
      crumbs.push({ label: "Operational Health & SHFI" });
    } else if (section === "settings") {
      crumbs.push({ label: "System Core" });
    } else {
      crumbs.push({
        label: section.charAt(0).toUpperCase() + section.slice(1),
      });
    }
  }

  return (
    <nav
      aria-label="Super Admin Breadcrumb"
      className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6 pb-3 border-b border-slate-800/60"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-slate-400 hover:text-purple-400 transition-colors no-underline"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Command Center</span>
      </Link>

      {crumbs.slice(1).map((crumb, idx) => {
        const isLast = idx === crumbs.length - 2;
        return (
          <div key={crumb.label} className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-slate-600" />
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-slate-400 hover:text-purple-400 transition-colors no-underline"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "text-purple-400 font-bold" : "text-slate-300"}>
                {crumb.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

