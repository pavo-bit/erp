"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export interface SidebarItem {
  icon: string;
  label: string;
  href: string;
  badge?: string;
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
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex w-[260px] bg-white border-r border-border flex-col fixed top-0 bottom-0 left-0 z-50">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] shadow-sm"
              style={{ background: "linear-gradient(135deg, #FF9933, #8B0000)" }}
            >
              🪷
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] font-bold text-text-primary tracking-[0.02em] font-[var(--font-heading)]">
                SSVM Portal
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.06em] font-[var(--font-heading)]"
                style={{ color: roleColor }}
              >
                {role} Dashboard
              </span>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium no-underline transition-all duration-200 font-[var(--font-heading)] group
                    ${isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                >
                  <span className="text-[18px] w-6 text-center">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ background: roleColor }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div
                      className="w-1 h-5 rounded-full absolute left-0"
                      style={{ background: roleColor }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Card */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] text-white font-bold shrink-0"
              style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}dd)` }}
            >
              {roleIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-primary truncate font-[var(--font-heading)]">
                {userName}
              </div>
              <div className="text-[11px] text-text-secondary truncate">{userSubtitle}</div>
            </div>
            <button
              onClick={logout}
              className="text-[16px] text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer p-0"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[60px] bg-white border-b border-border flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 bg-transparent border-none cursor-pointer"
          aria-label="Open menu"
        >
          <div className="flex flex-col gap-1">
            <span className="w-5 h-[2px] bg-text-primary rounded block" />
            <span className="w-5 h-[2px] bg-text-primary rounded block" />
            <span className="w-5 h-[2px] bg-text-primary rounded block" />
          </div>
        </button>
        <span className="text-[13px] font-semibold font-[var(--font-heading)]" style={{ color: roleColor }}>
          {roleIcon} {role} Dashboard
        </span>
        <button onClick={logout} className="text-[18px] bg-transparent border-none cursor-pointer p-0" title="Logout">🚪</button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/30 z-[60]"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[70] flex flex-col shadow-2xl"
            >
              <div className="px-5 py-5 border-b border-border flex items-center justify-between">
                <span className="text-[14px] font-bold font-[var(--font-heading)]" style={{ color: roleColor }}>
                  {roleIcon} {role}
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-[20px] bg-transparent border-none cursor-pointer text-text-secondary"
                >
                  ✕
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-medium no-underline mb-1 font-[var(--font-heading)]
                        ${isActive ? "bg-primary/10 text-primary" : "text-text-secondary"}`}
                    >
                      <span className="text-[18px]">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-[260px] pt-[60px] lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

/* ── Reusable Dashboard Components ── */

export function StatCard({
  icon,
  label,
  value,
  change,
  color = "#FF6B00",
}: {
  icon: string;
  label: string;
  value: string;
  change?: string;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-border hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
          style={{ background: `${color}15` }}
        >
          {icon}
        </div>
        {change && (
          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full font-[var(--font-heading)]
            ${change.startsWith("+") ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-[26px] font-bold text-text-primary font-[var(--font-heading)] leading-none mb-1">
        {value}
      </div>
      <div className="text-[13px] text-text-secondary">{label}</div>
    </motion.div>
  );
}

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
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
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
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full font-[var(--font-heading)]"
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
