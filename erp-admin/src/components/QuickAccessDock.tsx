"use client";

import Link from "next/link";
import {
  UserPlus,
  Users,
  CheckSquare,
  CreditCard,
  FileSpreadsheet,
  Bell,
  Calendar,
  Bus,
  Sparkles,
} from "lucide-react";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const UNIVERSAL_QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <UserPlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    label: "Bulk Admission",
    href: "/admin/admissions/bulk",
  },
  {
    icon: <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    label: "Student Directory",
    href: "/admin/students",
  },
  {
    icon: <CheckSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />,
    label: "Mark Attendance",
    href: "/admin/attendance",
  },
  {
    icon: <CreditCard className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    label: "Collect Fee",
    href: "/admin/fees",
  },
  {
    icon: <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600 shrink-0" />,
    label: "Exams & Marks",
    href: "/admin/exams",
  },
  {
    icon: <Bell className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    label: "School Notices",
    href: "/admin/notices",
  },
  {
    icon: <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
    label: "Timetable",
    href: "/admin/timetable",
  },
  {
    icon: <Bus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
    label: "Transport Routes",
    href: "/admin/transport",
  },
];

export function QuickAccessDock() {
  return (
    <div className="bg-gradient-to-r from-primary/5 via-surface to-white border border-border/80 rounded-2xl p-3 sm:p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-primary font-[var(--font-heading)]">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Operational Quick Access</span>
        </div>
        <span className="text-[10px] text-text-secondary font-medium hidden sm:inline">
          Frequently used school workflows
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {UNIVERSAL_QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-text-primary bg-white border border-border shadow-2xs hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200 no-underline"
          >
            {action.icon}
            <span className="truncate">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
