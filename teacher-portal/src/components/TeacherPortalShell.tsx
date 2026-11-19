"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  BookOpen,
  FileSpreadsheet,
  Coffee,
  DollarSign,
  ShieldAlert,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const TEACHER_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Teacher Dashboard", href: "/portal" },
  { icon: CalendarCheck, label: "Daily Attendance", href: "/portal/attendance" },
  { icon: Calendar, label: "My Timetable", href: "/portal/timetable" },
  { icon: BookOpen, label: "Homework & LMS", href: "/portal/homework" },
  { icon: FileSpreadsheet, label: "Examinations", href: "/portal/exams" },
  { icon: Coffee, label: "Leave Requests", href: "/portal/leaves" },
  { icon: DollarSign, label: "Salary Ledger", href: "/portal/salary" },
  { icon: ShieldAlert, label: "Discipline & Notes", href: "/portal/discipline" },
  { icon: User, label: "Faculty Profile", href: "/portal/profile" },
];

export function TeacherPortalShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-teal-600/30 border-t-teal-700 rounded-full animate-spin" />
      </div>
    );
  }

  const teacher = user?.teacher;

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Desktop Sidebar — 260px Institutional */}
      <aside className="hidden lg:flex w-[260px] bg-slate-900 text-white flex-col fixed top-0 bottom-0 left-0 z-50 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-[65px] px-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white text-[16px] font-bold shadow-xs">
              👨‍🏫
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[14px] font-bold text-white tracking-wide font-[var(--font-heading)]">
                SSVM Portal
              </span>
              <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">
                Teacher Access
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Teacher Portal Navigation" className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {TEACHER_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold no-underline transition-colors ${
                  isActive
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-white text-[13px] font-bold shrink-0">
              {(user?.name || "T")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white truncate">{user?.name || "Teacher"}</div>
              <div className="text-[11px] text-slate-400 truncate">{teacher?.designation || "Faculty"}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors bg-transparent border-none cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[60px] bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[16px]">👨‍🏫</span>
          <span className="text-[13px] font-bold text-white">Teacher Portal</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-400 bg-transparent border-none cursor-pointer"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />
          <div className="relative w-[280px] bg-slate-900 text-white flex flex-col z-10 shadow-2xl">
            <div className="h-[60px] px-5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[14px] font-bold text-white">Teacher Portal</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {TEACHER_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold no-underline transition-colors ${
                      isActive ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[260px] pt-[60px] lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
