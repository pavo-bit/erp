'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiCall } from '@/lib/student-api-hooks';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  CreditCard,
  BookOpen,
  Calendar,
  Bell,
  Library,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface StudentNavGroup {
  title: string;
  items: {
    href: string;
    label: string;
    icon: any;
  }[];
}

const NAV_GROUPS: StudentNavGroup[] = [
  {
    title: 'Academics',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/timetable', label: 'My Timetable', icon: Calendar },
      { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { href: '/assignments', label: 'Assignments', icon: BookOpen },
      { href: '/results', label: 'Exam Results', icon: Award },
    ],
  },
  {
    title: 'School Services',
    items: [
      { href: '/fees', label: 'Fee Ledger', icon: CreditCard },
      { href: '/library', label: 'Library Books', icon: Library },
      { href: '/notices', label: 'Notice Board', icon: Bell },
      { href: '/profile', label: 'Student Profile', icon: User },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiCall('/api/v1/auth/logout', 'POST');
    } catch {
      // Ignore network errors on logout
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Desktop Sidebar — 260px Institutional */}
      <aside className="hidden lg:flex w-[260px] bg-slate-900 text-white flex-col fixed top-0 bottom-0 left-0 z-50 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-[65px] px-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-[16px] font-bold shadow-xs">
              🎓
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[14px] font-bold text-white tracking-wide font-[var(--font-heading)]">
                SSVM Portal
              </span>
              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                Student Access
              </span>
            </div>
          </Link>
        </div>

        {/* Grouped Navigation */}
        <nav aria-label="Student Portal Navigation" className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold no-underline transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors border-none cursor-pointer bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[60px] bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[16px]">🎓</span>
          <span className="text-[13px] font-bold text-white">Student Portal</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-400 bg-transparent border-none cursor-pointer"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />
          <div className="relative w-[280px] bg-slate-900 text-white flex flex-col z-10 shadow-2xl">
            <div className="h-[60px] px-5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[14px] font-bold text-white">Student Portal</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold no-underline transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
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
