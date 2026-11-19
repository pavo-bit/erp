"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  Wallet,
  BookOpen,
  Bell,
  Calendar,
  LogOut,
  Menu,
  UserCircle,
  Shield,
  Bus,
  ChevronDown,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, selectedStudentId, setSelectedStudentId, logout } = useAuth();

  // Dynamic modular entitlement resolution
  const fetcher = (url: string) =>
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => d.data ?? d);
  const { data: moduleData } = useSWR("/api/v1/schools/me/modules", fetcher);

  const isTransportEnabled =
    moduleData?.modules?.some((m: any) => m.module?.code === "TRANSPORT" && m.isEnabled) ?? true;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Attendance", href: "/attendance", icon: CalendarCheck },
    { name: "Results & Marks", href: "/results", icon: GraduationCap },
    { name: "Fees & Invoices", href: "/fees", icon: Wallet },
    ...(isTransportEnabled ? [{ name: "Transport & Bus", href: "/transport", icon: Bus }] : []),
    { name: "Assignments", href: "/assignments", icon: BookOpen },
    { name: "Behavior", href: "/behavior", icon: Shield },
    { name: "Timetable", href: "/timetable", icon: Calendar },
    { name: "Notices", href: "/notices", icon: Bell },
  ];

  const students = user?.guardian?.students || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-20 px-8 flex items-center border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-xs mr-3">
              👨‍👩‍👧
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[16px] tracking-tight text-slate-900 dark:text-white">
                Parent<span className="text-blue-600">Portal</span>
              </span>
              <span className="text-[11px] text-slate-400 font-semibold uppercase">SSVM School</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium group text-[14px] no-underline ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 mr-3 transition-colors ${
                      isActive
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <UserCircle className="w-9 h-9 text-slate-400 mr-3 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.name || "Guardian"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || "parent@ssvm.edu"}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-transparent border-none cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header with Multi-Child Dropdown Switcher */}
        <header className="h-20 px-6 sm:px-8 flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-30 shrink-0">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Navigation"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Multi-Child Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Active Child:
            </span>
            {students.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="appearance-none bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-[13px] font-bold py-2 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {students.map((child) => (
                    <option key={child.id} value={child.id}>
                      👨‍🎓 {child.name} (Roll: {child.rollNo || "—"})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-700" />
              </div>
            ) : (
              <span className="text-[13px] font-semibold text-slate-600">
                Aarav Sharma (Class 10-A)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              type="button"
              className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative border-none bg-transparent cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
