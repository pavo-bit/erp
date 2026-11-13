"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { SuperAdminBreadcrumbs } from "@/components/Breadcrumbs";

export interface SuperAdminNavItem {
  icon: string;
  label: string;
  href: string;
  gradient: string;
  matchPrefix?: boolean;
}

export interface SuperAdminNavGroup {
  title: string;
  items: SuperAdminNavItem[];
}

export const SUPER_ADMIN_NAV_GROUPS: SuperAdminNavGroup[] = [
  {
    title: "Platform Overview",
    items: [
      {
        icon: "🌌",
        label: "Command Center",
        href: "/dashboard",
        gradient: "from-purple-500 to-fuchsia-500",
        matchPrefix: false,
      },
    ],
  },
  {
    title: "Institution Management",
    items: [
      {
        icon: "🏫",
        label: "School Network",
        href: "/dashboard/schools",
        gradient: "from-blue-500 to-cyan-400",
        matchPrefix: true,
      },
    ],
  },
  {
    title: "SaaS Operations",
    items: [
      {
        icon: "⚡",
        label: "SaaS Requests",
        href: "/dashboard/requests",
        gradient: "from-pink-500 to-rose-400",
        matchPrefix: true,
      },
    ],
  },
  {
    title: "Platform Monitoring",
    items: [
      {
        icon: "📈",
        label: "Global Analytics",
        href: "/dashboard/analytics",
        gradient: "from-amber-400 to-orange-500",
        matchPrefix: true,
      },
      {
        icon: "🩺",
        label: "Health & SHFI",
        href: "/dashboard/shfi",
        gradient: "from-rose-500 to-pink-500",
        matchPrefix: true,
      },
    ],
  },
  {
    title: "Platform Administration",
    items: [
      {
        icon: "⚙️",
        label: "System Core",
        href: "/dashboard/settings",
        gradient: "from-emerald-400 to-teal-500",
        matchPrefix: true,
      },
    ],
  },
];

export function isRouteActive(currentPath: string, item: SuperAdminNavItem): boolean {
  if (item.matchPrefix) {
    return currentPath === item.href || currentPath.startsWith(item.href + "/");
  }
  return currentPath === item.href;
}

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-dark)] text-[var(--color-text-primary)] selection:bg-[var(--color-primary)]">
      {/* Abstract Ambient Glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Desktop Sidebar — Glassmorphism Premium */}
      <aside className="hidden lg:flex w-[280px] flex-col fixed top-0 bottom-0 left-0 z-50 bg-[var(--color-bg-sidebar)]/80 backdrop-blur-2xl border-r border-[var(--color-border-dark)] shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        {/* Brand Header */}
        <div className="px-6 py-6 flex items-center gap-4 border-b border-[var(--color-border-dark)]/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] shadow-[0_0_20px_rgba(168,85,247,0.4)] relative z-10"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
          >
            🔮
          </motion.div>
          <div className="flex flex-col relative z-10">
            <span className="text-[15px] font-black text-white tracking-widest uppercase font-[var(--font-heading)] drop-shadow-md">
              Greyscales
            </span>
            <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-[0.1em]">
              Super Admin
            </span>
          </div>
        </div>

        {/* Grouped Navigation Items */}
        <nav aria-label="Super Admin Navigation" className="flex-1 overflow-y-auto py-5 px-4 space-y-5">
          {SUPER_ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold no-underline transition-all duration-200 group overflow-hidden ${
                      isActive
                        ? "text-white shadow-[0_4px_16px_rgba(168,85,247,0.15)]"
                        : "text-[var(--color-text-secondary)] hover:text-white"
                    }`}
                    style={
                      isActive
                        ? {
                            background: "var(--color-bg-card-hover)",
                            border: "1px solid var(--color-border-dark)",
                          }
                        : { border: "1px solid transparent" }
                    }
                  >
                    {/* Active Indicator Glow */}
                    {isActive && (
                      <motion.div
                        layoutId="superAdminActiveNav"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)] shadow-[0_0_10px_var(--color-primary)]"
                      />
                    )}

                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[16px] transition-transform duration-200 group-hover:scale-105 shadow-inner ${
                        isActive
                          ? `bg-gradient-to-br ${item.gradient} text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]`
                          : "bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <span className="font-[var(--font-heading)] tracking-wide">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-[var(--color-border-dark)]/50 bg-gradient-to-b from-transparent to-black/40">
          <div className="flex items-center gap-3 bg-[var(--color-bg-card)] p-2.5 rounded-xl border border-[var(--color-border-dark)] shadow-lg">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[15px] text-white font-bold bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-[0_0_10px_rgba(168,85,247,0.5)]">
              {user?.name?.charAt(0) || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white truncate font-[var(--font-heading)]">
                {user?.name || "Super Admin"}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">
                {user?.email}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="text-[18px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors bg-transparent border-none cursor-pointer p-1.5"
            >
              ⏻
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[70px] flex items-center justify-between px-6 bg-[var(--color-bg-sidebar)]/90 backdrop-blur-xl border-b border-[var(--color-border-dark)]">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 bg-transparent border-none cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <div className="flex flex-col gap-1.5">
            <span className="w-6 h-[2px] bg-[var(--color-primary)] rounded block shadow-[0_0_5px_var(--color-primary)]" />
            <span className="w-6 h-[2px] bg-[var(--color-accent)] rounded block shadow-[0_0_5px_var(--color-accent)]" />
            <span className="w-4 h-[2px] bg-white rounded block" />
          </div>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[20px]">🔮</span>
          <span className="text-[15px] font-bold text-white font-[var(--font-heading)] uppercase tracking-widest">
            Greyscales
          </span>
        </div>
        <button
          onClick={logout}
          aria-label="Sign Out"
          className="text-[20px] bg-transparent border-none cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          ⏻
        </button>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />

            {/* Slide-out Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-[var(--color-bg-sidebar)] z-[70] flex flex-col border-r border-[var(--color-border-dark)] shadow-2xl"
            >
              <div className="px-6 py-6 border-b border-[var(--color-border-dark)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-md">
                    🔮
                  </div>
                  <span className="text-[14px] font-bold text-white font-[var(--font-heading)] uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-[20px] bg-transparent border-none cursor-pointer text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <nav aria-label="Mobile Navigation" className="flex-1 overflow-y-auto py-5 px-4 space-y-4">
                {SUPER_ADMIN_NAV_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const isActive = isRouteActive(pathname, item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold no-underline transition-all ${
                            isActive
                              ? "bg-[var(--color-bg-card-hover)] text-white border border-[var(--color-border-dark)]"
                              : "text-[var(--color-text-secondary)] hover:text-white"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[16px] ${
                              isActive
                                ? `bg-gradient-to-br ${item.gradient} text-white`
                                : "bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <span className="font-[var(--font-heading)]">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* Mobile User Card */}
              <div className="p-4 border-t border-[var(--color-border-dark)] bg-black/30">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[180px]">{user?.email}</span>
                  <button
                    onClick={logout}
                    className="text-xs font-bold text-[var(--color-accent)] bg-transparent border-none cursor-pointer hover:underline"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[280px] pt-[80px] lg:pt-8 pb-12 min-h-screen relative z-10 px-6 lg:px-12">
        <SuperAdminBreadcrumbs />
        {children}
      </main>
    </div>
  );
}
