"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

const sidebarItems = [
  { icon: "📊", label: "Dashboard", href: "/portal" },
  { icon: "✅", label: "Attendance", href: "/portal/attendance" },
  { icon: "📝", label: "Marks Entry", href: "/portal/marks" },
  { icon: "📚", label: "Homework", href: "/portal/homework" },
  { icon: "📅", label: "Timetable", href: "/portal/timetable" },
  { icon: "📋", label: "Exams", href: "/portal/exams" },
  { icon: "🏖️", label: "Leave", href: "/portal/leaves" },
  { icon: "💰", label: "Salary", href: "/portal/salary" },
  { icon: "👤", label: "My Profile", href: "/portal/profile" },
];

export default function TeacherDashboard() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const teacher = user?.teacher;
  const quickStats = [
    { icon: "✅", label: "Today's Classes", value: "6", color: "#0D9488" },
    { icon: "👨‍🎓", label: "Students", value: "180", color: "#3B82F6" },
    { icon: "📚", label: "Subjects", value: String(teacher?.subjects?.length || 0), color: "#8B5CF6" },
    { icon: "📋", label: "Pending Tasks", value: "3", color: "#F59E0B" },
  ];

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[250px] bg-white border-r border-border flex-col fixed top-0 bottom-0 left-0 z-50">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px]"
              style={{ background: "linear-gradient(135deg, #0D9488, #06B6D4)" }}>
              👨‍🏫
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] font-bold text-text-primary tracking-[0.02em] font-[var(--font-heading)]">SSVM Portal</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: "#0D9488" }}>Teacher</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {sidebarItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium no-underline transition-all mb-1 font-[var(--font-heading)]
                  ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-text-secondary hover:bg-surface hover:text-text-primary"}`}>
                <span className="text-[18px] w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] text-white font-bold"
              style={{ background: "linear-gradient(135deg, #0D9488, #06B6D4)" }}>
              {(user?.name || "T")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-primary truncate">{user?.name}</div>
              <div className="text-[11px] text-text-secondary truncate">{teacher?.designation || "Teacher"}</div>
            </div>
            <button onClick={logout} className="text-[16px] text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer">🚪</button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[60px] bg-white border-b border-border flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-transparent border-none cursor-pointer">
          <div className="flex flex-col gap-1">
            <span className="w-5 h-[2px] bg-text-primary rounded block" /><span className="w-5 h-[2px] bg-text-primary rounded block" /><span className="w-5 h-[2px] bg-text-primary rounded block" />
          </div>
        </button>
        <span className="text-[13px] font-semibold text-primary font-[var(--font-heading)]">👨‍🏫 Teacher Portal</span>
        <button onClick={logout} className="text-[18px] bg-transparent border-none cursor-pointer">🚪</button>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/30 z-[60]" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[70] flex flex-col shadow-2xl">
              <div className="px-5 py-5 border-b border-border flex items-center justify-between">
                <span className="text-[14px] font-bold text-primary">👨‍🏫 Teacher</span>
                <button onClick={() => setSidebarOpen(false)} className="text-[20px] bg-transparent border-none cursor-pointer text-text-secondary">✕</button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {sidebarItems.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-medium no-underline mb-1
                      ${pathname === item.href ? "bg-primary/10 text-primary" : "text-text-secondary"}`}>
                    <span className="text-[18px]">{item.icon}</span>{item.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 lg:ml-[250px] pt-[60px] lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {/* Welcome */}
          <div className="mb-8">
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="text-[24px] font-bold text-text-primary font-[var(--font-heading)]">
              Welcome, {user?.name?.split(" ")[0]} 👋
            </motion.h1>
            <p className="text-[14px] text-text-secondary mt-1">
              {teacher?.department || "Department"} • {teacher?.designation || "Teacher"}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickStats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-5 border border-border hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] mb-3"
                  style={{ background: `${stat.color}15` }}>
                  {stat.icon}
                </div>
                <div className="text-[26px] font-bold text-text-primary font-[var(--font-heading)]">{stat.value}</div>
                <div className="text-[13px] text-text-secondary">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <h2 className="text-[18px] font-bold text-text-primary mb-4 font-[var(--font-heading)]">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: "✅", label: "Mark Attendance", href: "/portal/attendance", color: "#0D9488" },
              { icon: "📝", label: "Enter Marks", href: "/portal/marks", color: "#3B82F6" },
              { icon: "📚", label: "Assign Homework", href: "/portal/homework", color: "#8B5CF6" },
              { icon: "📅", label: "View Timetable", href: "/portal/timetable", color: "#F59E0B" },
              { icon: "🏖️", label: "Apply Leave", href: "/portal/leaves", color: "#EF4444" },
              { icon: "💰", label: "View Salary", href: "/portal/salary", color: "#10B981" },
              { icon: "📋", label: "Exam Results", href: "/portal/exams", color: "#EC4899" },
              { icon: "👤", label: "My Profile", href: "/portal/profile", color: "#6366F1" },
            ].map((action, i) => (
              <motion.div key={action.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Link href={action.href}
                  className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all no-underline group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] transition-transform group-hover:scale-110"
                    style={{ background: `${action.color}15` }}>
                    {action.icon}
                  </div>
                  <span className="text-[12px] font-semibold text-text-primary text-center font-[var(--font-heading)]">{action.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Today's Schedule Preview */}
          <h2 className="text-[18px] font-bold text-text-primary mb-4 font-[var(--font-heading)]">Today&apos;s Schedule</h2>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            {[
              { period: 1, time: "09:00 - 09:45", subject: "Mathematics", class: "IX-B", color: "#3B82F6" },
              { period: 2, time: "09:45 - 10:30", subject: "Mathematics", class: "X-A", color: "#3B82F6" },
              { period: 3, time: "10:45 - 11:30", subject: "Mathematics", class: "VII-C", color: "#3B82F6" },
              { period: 4, time: "11:30 - 12:15", subject: "Free Period", class: "—", color: "#94A3B8" },
              { period: 5, time: "13:00 - 13:45", subject: "Mathematics", class: "VIII-A", color: "#3B82F6" },
              { period: 6, time: "13:45 - 14:30", subject: "Mathematics", class: "XII-Sci", color: "#3B82F6" },
            ].map((slot, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                  style={{ background: slot.color }}>
                  P{slot.period}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-text-primary font-[var(--font-heading)]">{slot.subject}</div>
                  <div className="text-[11px] text-text-secondary">{slot.time}</div>
                </div>
                <span className="text-[12px] font-semibold text-text-secondary bg-surface px-3 py-1 rounded-full">{slot.class}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
