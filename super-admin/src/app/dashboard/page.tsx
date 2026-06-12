"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useSuperAdminStats, useSchools, apiCall } from "@/lib/api";

const sidebarItems = [
  { icon: "📊", label: "Overview", href: "/dashboard" },
  { icon: "🏫", label: "Schools", href: "/dashboard/schools" },
  { icon: "📈", label: "Analytics", href: "/dashboard/analytics" },
  { icon: "⚙️", label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: stats, isLoading: loadingStats } = useSuperAdminStats();
  const { data: schoolsData } = useSchools();
  const schools = Array.isArray(schoolsData) ? schoolsData : [];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ name: "", code: "", address: "", city: "", state: "", phone: "", email: "" });

  const handleCreateSchool = async () => {
    try {
      await apiCall("/api/schools", "POST", schoolForm);
      window.location.reload();
    } catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0B1120" }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[250px] flex-col fixed top-0 bottom-0 left-0 z-50"
        style={{ background: "#0F172A", borderRight: "1px solid #1E293B" }}>
        <div className="px-5 py-5" style={{ borderBottom: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px]"
              style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
              ⚡
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] font-bold text-white tracking-[0.02em] font-[var(--font-heading)]">SSVM ERP</span>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-[0.06em]">Super Admin</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {sidebarItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium no-underline transition-all mb-1 font-[var(--font-heading)]
                  ${isActive ? "text-white" : "text-[#94A3B8] hover:text-white"}`}
                style={isActive ? { background: "rgba(59,130,246,0.15)" } : {}}>
                <span className="text-[18px] w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4" style={{ borderTop: "1px solid #1E293B" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] text-white font-bold"
              style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}>
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">{user?.name || "Super Admin"}</div>
              <div className="text-[11px] text-[#64748B] truncate">{user?.email}</div>
            </div>
            <button onClick={logout} className="text-[16px] text-[#64748B] hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer">🚪</button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-4"
        style={{ background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-transparent border-none cursor-pointer">
          <div className="flex flex-col gap-1">
            <span className="w-5 h-[2px] bg-white rounded block" />
            <span className="w-5 h-[2px] bg-white rounded block" />
            <span className="w-5 h-[2px] bg-white rounded block" />
          </div>
        </button>
        <span className="text-[13px] font-semibold text-blue-400 font-[var(--font-heading)]">⚡ Super Admin</span>
        <button onClick={logout} className="text-[18px] bg-transparent border-none cursor-pointer text-[#64748B]">🚪</button>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-[60]" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] z-[70] flex flex-col"
              style={{ background: "#0F172A" }}>
              <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid #1E293B" }}>
                <span className="text-[14px] font-bold text-blue-400">⚡ Super Admin</span>
                <button onClick={() => setSidebarOpen(false)} className="text-[20px] bg-transparent border-none cursor-pointer text-[#94A3B8]">✕</button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {sidebarItems.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-medium no-underline mb-1
                      ${pathname === item.href ? "text-white bg-blue-500/15" : "text-[#94A3B8]"}`}>
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
          {/* Header */}
          <div className="mb-8">
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="text-[26px] font-bold text-white font-[var(--font-heading)]">
              ERP Control Center
            </motion.h1>
            <p className="text-[14px] text-[#94A3B8] mt-1">Manage all schools, admins, and subscriptions under your ERP system</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: "🏫", label: "Total Schools", value: stats?.totalSchools ?? "—", color: "#3B82F6" },
              { icon: "👨‍🎓", label: "Total Students", value: stats?.totalStudents ?? "—", color: "#10B981" },
              { icon: "👨‍🏫", label: "Total Teachers", value: stats?.totalTeachers ?? "—", color: "#8B5CF6" },
              { icon: "💰", label: "Total Revenue", value: stats?.totalRevenue ? `₹${(stats.totalRevenue / 1000).toFixed(0)}K` : "—", color: "#F59E0B" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-5 transition-all hover:translate-y-[-2px]"
                style={{ background: "#111827", border: "1px solid #1E293B" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
                    style={{ background: `${stat.color}15` }}>{stat.icon}</div>
                </div>
                <div className="text-[26px] font-bold text-white font-[var(--font-heading)]">{loadingStats ? "..." : stat.value}</div>
                <div className="text-[13px] text-[#94A3B8]">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Schools List */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-white font-[var(--font-heading)]">Managed Schools</h2>
            <button onClick={() => setShowCreateSchool(!showCreateSchool)}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white border-none cursor-pointer"
              style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}>
              + Add School
            </button>
          </div>

          {showCreateSchool && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl p-6 mb-6" style={{ background: "#111827", border: "1px solid #1E293B" }}>
              <h3 className="text-[15px] font-semibold text-white mb-4 font-[var(--font-heading)]">Add New School</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "name", placeholder: "School Name" },
                  { key: "code", placeholder: "Unique Code (e.g. SSVM-CTK)" },
                  { key: "address", placeholder: "Address" },
                  { key: "city", placeholder: "City" },
                  { key: "state", placeholder: "State" },
                  { key: "phone", placeholder: "Phone" },
                  { key: "email", placeholder: "Email" },
                ].map(f => (
                  <input key={f.key} placeholder={f.placeholder}
                    value={schoolForm[f.key as keyof typeof schoolForm]}
                    onChange={e => setSchoolForm({ ...schoolForm, [f.key]: e.target.value })}
                    className="px-4 py-2.5 rounded-xl text-[13px] text-white outline-none"
                    style={{ background: "#1E293B", border: "1px solid #334155" }} />
                ))}
              </div>
              <button onClick={handleCreateSchool}
                className="mt-4 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer"
                style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}>
                Create School
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schools.map((school: Record<string, unknown>, i: number) => {
              const count = school._count as Record<string, number> || {};
              const sub = school.subscription as Record<string, unknown> | null;
              return (
                <motion.div key={school.id as string} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl p-6 hover:translate-y-[-2px] transition-all"
                  style={{ background: "#111827", border: "1px solid #1E293B" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-[16px] font-bold text-white font-[var(--font-heading)]">{school.name as string}</h3>
                      <p className="text-[12px] text-[#64748B] mt-0.5">{school.code as string} • {school.city as string || "—"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${school.isActive ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {school.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center py-3 rounded-xl" style={{ background: "#1E293B" }}>
                      <div className="text-[18px] font-bold text-white">{count.students ?? 0}</div>
                      <div className="text-[10px] text-[#64748B] uppercase">Students</div>
                    </div>
                    <div className="text-center py-3 rounded-xl" style={{ background: "#1E293B" }}>
                      <div className="text-[18px] font-bold text-white">{count.teachers ?? 0}</div>
                      <div className="text-[10px] text-[#64748B] uppercase">Teachers</div>
                    </div>
                    <div className="text-center py-3 rounded-xl" style={{ background: "#1E293B" }}>
                      <div className="text-[18px] font-bold text-white">{sub ? (sub.plan as string)?.charAt(0) : "—"}</div>
                      <div className="text-[10px] text-[#64748B] uppercase">Plan</div>
                    </div>
                  </div>
                  {sub && (
                    <div className="mt-3 text-[11px] text-[#64748B]">
                      Subscription: <span className="text-blue-400 font-semibold">{sub.plan as string}</span> •
                      Expires: {new Date(sub.endDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {schools.length === 0 && !loadingStats && (
              <div className="col-span-full text-center py-12 rounded-2xl" style={{ background: "#111827", border: "1px solid #1E293B" }}>
                <p className="text-[40px] mb-3">🏫</p>
                <p className="text-[15px] font-semibold text-white mb-1">No schools configured</p>
                <p className="text-[13px] text-[#64748B]">Click &ldquo;Add School&rdquo; to start managing schools</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
