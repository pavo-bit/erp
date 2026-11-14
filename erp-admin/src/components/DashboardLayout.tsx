"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export interface SidebarSubItem {
  icon: string;
  label: string;
  href: string;
  badge?: string;
}

export interface SidebarItem {
  icon: string;
  label: string;
  href: string;
  badge?: string;
  children?: SidebarSubItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems: SidebarItem[];
  role: string;
  roleIcon: string;
  roleColor: string;
  userName: string;
  userSubtitle: string;
}

export function DashboardLayout({
  children,
  sidebarItems,
  role,
  roleIcon,
  roleColor,
  userName,
  userSubtitle,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();

  // Close mobile drawer on route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Track expanded groups in desktop mode
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of sidebarItems) {
      if (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        initial[item.label] = true;
      }
    }
    return initial;
  });

  // Auto-expand group when active route changes
  useEffect(() => {
    for (const item of sidebarItems) {
      if (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        setExpandedGroups((prev) => ({ ...prev, [item.label]: true }));
      }
    }
  }, [pathname, sidebarItems]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <div className="min-h-screen bg-surface flex text-text-primary">
      {/* Desktop Sidebar — Expanded (260px) or Collapsed Rail (72px) */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-border transition-all duration-300 ease-in-out shadow-xs ${
          isCollapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Brand Header */}
        <div className="h-[65px] px-4 border-b border-border flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <Link href="/admin" className="flex items-center gap-2.5 no-underline min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shadow-xs shrink-0"
                style={{ background: "linear-gradient(135deg, #FF9933, #8B0000)" }}
              >
                🪷
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13px] font-bold text-text-primary tracking-[0.02em] font-[var(--font-heading)] truncate">
                  SSVM ERP
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.06em] font-[var(--font-heading)] truncate"
                  style={{ color: roleColor }}
                >
                  {role}
                </span>
              </div>
            </Link>
          ) : (
            <Link
              href="/admin"
              className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center text-[18px] shadow-xs no-underline"
              style={{ background: "linear-gradient(135deg, #FF9933, #8B0000)" }}
              title="SSVM ERP — Home"
            >
              🪷
            </Link>
          )}

          {/* Sidebar Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface border-none bg-transparent cursor-pointer transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {sidebarItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isAnyChildActive =
              hasChildren &&
              item.children!.some(
                (c) => pathname === c.href || pathname.startsWith(c.href + "/")
              );
            const isActive = pathname === item.href || isAnyChildActive;
            const isExpanded = expandedGroups[item.label] ?? isAnyChildActive;

            // Collapsed Rail Item
            if (isCollapsed) {
              return (
                <div key={item.label} className="relative group flex justify-center">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] transition-all border-none cursor-pointer ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold shadow-xs"
                          : "text-text-secondary hover:bg-surface hover:text-text-primary"
                      }`}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <span>{item.icon}</span>
                      {isActive && (
                        <div
                          className="w-1 h-5 rounded-r absolute left-0"
                          style={{ background: roleColor }}
                        />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] no-underline transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold shadow-xs"
                          : "text-text-secondary hover:bg-surface hover:text-text-primary"
                      }`}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <span>{item.icon}</span>
                      {isActive && (
                        <div
                          className="w-1 h-5 rounded-r absolute left-0"
                          style={{ background: roleColor }}
                        />
                      )}
                    </Link>
                  )}

                  {/* Flyout Popover on Hover in Collapsed Mode */}
                  <div className="absolute left-[64px] top-0 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 bg-white rounded-xl shadow-xl border border-border py-2 px-3 min-w-[200px] pointer-events-none group-hover:pointer-events-auto">
                    <div className="text-xs font-bold text-text-primary border-b border-border/60 pb-1.5 mb-1.5 flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {hasChildren ? (
                      <div className="flex flex-col gap-1">
                        {item.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium no-underline transition-colors ${
                              pathname === child.href
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-text-secondary hover:bg-surface hover:text-text-primary"
                            }`}
                          >
                            <span>{child.icon}</span>
                            <span className="truncate">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-xs text-primary font-semibold no-underline hover:underline"
                      >
                        Open {item.label} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            }

            // Expanded Mode: Accordion Item with Children
            if (hasChildren) {
              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 font-[var(--font-heading)] w-full text-left bg-transparent border-none cursor-pointer group relative ${
                      isActive
                        ? "bg-primary/5 text-primary font-semibold"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                  >
                    <span className="text-[17px] w-5 text-center shrink-0">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full mr-1 shrink-0"
                        style={{ background: roleColor }}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 shrink-0 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                    {isAnyChildActive && (
                      <div
                        className="w-1 h-5 rounded-r absolute left-0"
                        style={{ background: roleColor }}
                      />
                    )}
                  </button>

                  {/* Child Links */}
                  {isExpanded && (
                    <div className="flex flex-col gap-0.5 pl-7 pt-1 pb-1">
                      {item.children!.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium no-underline transition-all duration-200 font-[var(--font-heading)] relative ${
                              isChildActive
                                ? "bg-primary/10 text-primary font-bold shadow-xs"
                                : "text-text-secondary hover:bg-surface hover:text-text-primary"
                            }`}
                          >
                            <span className="text-[14px] shrink-0">{child.icon}</span>
                            <span className="flex-1 truncate">{child.label}</span>
                            {child.badge && (
                              <span
                                className="text-[9px] font-bold text-white px-1.5 py-0.2 rounded-full shrink-0"
                                style={{ background: roleColor }}
                              >
                                {child.badge}
                              </span>
                            )}
                            {isChildActive && (
                              <div
                                className="w-1 h-4 rounded-r absolute left-0"
                                style={{ background: roleColor }}
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Expanded Mode: Standalone Link
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium no-underline transition-all duration-200 font-[var(--font-heading)] relative ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold shadow-xs"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                }`}
              >
                <span className="text-[17px] w-5 text-center shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: roleColor }}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div
                    className="w-1 h-5 rounded-r absolute left-0"
                    style={{ background: roleColor }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-border shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 bg-surface/70 p-2 rounded-xl border border-border/60">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] text-white font-bold shrink-0 shadow-xs"
                style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}
              >
                {roleIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-text-primary truncate font-[var(--font-heading)]">
                  {userName}
                </div>
                <div className="text-[10px] text-text-secondary truncate">{userSubtitle}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-white"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={logout}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-danger hover:bg-surface border-none bg-transparent cursor-pointer transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[60px] bg-white border-b border-border flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 bg-transparent border-none cursor-pointer rounded-lg hover:bg-surface text-text-primary"
          aria-label="Open Navigation Menu"
          aria-expanded={sidebarOpen}
          aria-controls="mobile-sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[16px]">🪷</span>
          <span className="text-[13px] font-bold font-[var(--font-heading)] text-text-primary">
            SSVM ERP
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="p-2 text-text-secondary hover:text-danger bg-transparent border-none cursor-pointer rounded-lg hover:bg-surface"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay & Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-[60]"
            />
            <motion.aside
              id="mobile-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[70] flex flex-col shadow-2xl border-r border-border"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #FF9933, #8B0000)" }}
                  >
                    🪷
                  </div>
                  <span className="text-[13px] font-bold text-text-primary font-[var(--font-heading)]">
                    SSVM ERP
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer rounded-lg hover:bg-surface"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav aria-label="Mobile Navigation Menu" className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {sidebarItems.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isAnyChildActive =
                    hasChildren &&
                    item.children!.some(
                      (c) => pathname === c.href || pathname.startsWith(c.href + "/")
                    );
                  const isActive = pathname === item.href || isAnyChildActive;
                  const isExpanded = expandedGroups[item.label] ?? isAnyChildActive;

                  if (hasChildren) {
                    return (
                      <div key={item.label} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.label)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium font-[var(--font-heading)] w-full text-left bg-transparent border-none cursor-pointer ${
                            isActive ? "bg-primary/5 text-primary font-semibold" : "text-text-secondary"
                          }`}
                        >
                          <span className="text-[17px]">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="flex flex-col gap-0.5 pl-6 pt-1">
                            {item.children!.map((child) => {
                              const isChildActive = pathname === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium no-underline font-[var(--font-heading)] ${
                                    isChildActive
                                      ? "bg-primary/10 text-primary font-bold"
                                      : "text-text-secondary hover:text-text-primary"
                                  }`}
                                >
                                  <span className="text-[15px]">{child.icon}</span>
                                  <span className="flex-1">{child.label}</span>
                                  {child.badge && (
                                    <span
                                      className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ml-auto"
                                      style={{ background: roleColor }}
                                    >
                                      {child.badge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium no-underline font-[var(--font-heading)] ${
                        isActive ? "bg-primary/10 text-primary font-bold" : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <span className="text-[17px]">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile User Card */}
              <div className="p-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] text-white font-bold shrink-0"
                    style={{ background: roleColor }}
                  >
                    {roleIcon}
                  </div>
                  <div className="truncate text-xs font-semibold text-text-primary">{userName}</div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-bold text-danger hover:underline bg-transparent border-none cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out pt-[60px] lg:pt-0 min-h-screen ${
          isCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        }`}
      >
        <div className="p-6 lg:p-8 max-w-[1440px] mx-auto space-y-4">
          {children}
        </div>
      </main>
    </div>
  );
}

/* ── Reusable Dashboard UI Components ── */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-[24px] font-bold text-text-primary font-[var(--font-heading)]">{title}</h1>
        {subtitle ? <p className="text-[14px] text-text-secondary mt-1">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface/50">
              {headers.map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-5 py-3.5 text-[13px] text-text-primary">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status, color }: { status: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full font-[var(--font-heading)]"
      style={{ background: `${color}15`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}

export function ActivityItem({
  icon,
  title,
  time,
  desc,
}: {
  icon: string;
  title: string;
  time: string;
  desc?: string;
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-b-0">
      <span className="text-[18px] mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-text-primary font-[var(--font-heading)]">{title}</div>
        {desc ? <div className="text-[12px] text-text-secondary mt-0.5">{desc}</div> : null}
      </div>
      <span className="text-[11px] text-text-secondary whitespace-nowrap font-[var(--font-heading)]">{time}</span>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  title,
  value,
  change,
  trend,
  color = "#FF6B00",
}: {
  icon: string;
  label?: string;
  title?: string;
  value: string;
  change?: string;
  trend?: string;
  color?: string;
}) {
  const displayLabel = label || title || "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-border hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {change && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              trend === "up"
                ? "bg-emerald-50 text-emerald-600"
                : trend === "down"
                ? "bg-rose-50 text-rose-600"
                : "bg-surface text-text-secondary"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : ""} {change}
          </span>
        )}
      </div>
      <div className="text-[24px] font-bold text-text-primary font-[var(--font-heading)] mb-0.5">
        {value}
      </div>
      <div className="text-[12px] font-medium text-text-secondary font-[var(--font-heading)]">
        {displayLabel}
      </div>
    </motion.div>
  );
}
