"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useSuperAdminStats, useSchools, apiCall } from "@/lib/api";

const sidebarItems = [
  { icon: "🌌", label: "Command Center", href: "/dashboard", gradient: "from-purple-500 to-fuchsia-500" },
  { icon: "🏫", label: "School Network", href: "/dashboard/schools", gradient: "from-blue-500 to-cyan-400" },
  { icon: "⚡", label: "SaaS Requests", href: "/dashboard/requests", gradient: "from-pink-500 to-rose-400" },
  { icon: "📈", label: "Global Analytics", href: "/dashboard/analytics", gradient: "from-amber-400 to-orange-500" },
  { icon: "⚙️", label: "System Core", href: "/dashboard/settings", gradient: "from-emerald-400 to-teal-500" },
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
      await apiCall("/api/v1/schools", "POST", schoolForm);
      window.location.reload();
    } catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-dark)] text-[var(--color-text-primary)] selection:bg-[var(--color-primary)]">
      {/* Abstract Ambient Glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Sidebar - Glassmorphism Premium */}
      <aside className="hidden lg:flex w-[280px] flex-col fixed top-0 bottom-0 left-0 z-50 bg-[var(--color-bg-sidebar)]/80 backdrop-blur-2xl border-r border-[var(--color-border-dark)] shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-8 flex items-center gap-4 border-b border-[var(--color-border-dark)]/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] shadow-[0_0_20px_rgba(168,85,247,0.4)] relative z-10"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>
            🔮
          </motion.div>
          <div className="flex flex-col relative z-10">
            <span className="text-[16px] font-black text-white tracking-widest uppercase font-[var(--font-heading)] drop-shadow-md">Greyscales</span>
            <span className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-[0.1em]">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {sidebarItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[14px] font-bold no-underline transition-all duration-300 group overflow-hidden
                  ${isActive ? "text-white shadow-[0_4px_20px_rgba(168,85,247,0.15)]" : "text-[var(--color-text-secondary)] hover:text-white"}`}
                style={isActive ? { background: "var(--color-bg-card-hover)", border: "1px solid var(--color-border-dark)" } : { border: "1px solid transparent" }}>
                
                {/* Active Indicator Glow */}
                {isActive && (
                  <motion.div layoutId="activeNav" className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)] shadow-[0_0_10px_var(--color-primary)]" />
                )}
                
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[20px] transition-transform duration-300 group-hover:scale-110 shadow-inner
                  ${isActive ? `bg-gradient-to-br ${item.gradient} text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]` : "bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]"}`}>
                  {item.icon}
                </div>
                <span className="font-[var(--font-heading)] tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-6 border-t border-[var(--color-border-dark)]/50 bg-gradient-to-b from-transparent to-black/40">
          <div className="flex items-center gap-4 bg-[var(--color-bg-card)] p-3 rounded-2xl border border-[var(--color-border-dark)] shadow-lg">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] text-white font-bold bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-[0_0_10px_rgba(168,85,247,0.5)]">
              {user?.name?.charAt(0) || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-white truncate font-[var(--font-heading)]">{user?.name || "Super Admin"}</div>
              <div className="text-[11px] text-[var(--color-text-muted)] truncate font-mono">{user?.email}</div>
            </div>
            <motion.button whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }} onClick={logout} className="text-[20px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors bg-transparent border-none cursor-pointer p-2">
              ⏻
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Mobile Header (Skipping complex redesign for brevity, mostly matching dark theme) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-[70px] flex items-center justify-between px-6 bg-[var(--color-bg-sidebar)]/90 backdrop-blur-xl border-b border-[var(--color-border-dark)]">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-transparent border-none cursor-pointer">
          <div className="flex flex-col gap-1.5">
            <span className="w-6 h-[2px] bg-[var(--color-primary)] rounded block shadow-[0_0_5px_var(--color-primary)]" />
            <span className="w-6 h-[2px] bg-[var(--color-accent)] rounded block shadow-[0_0_5px_var(--color-accent)]" />
            <span className="w-4 h-[2px] bg-white rounded block" />
          </div>
        </button>
        <div className="flex items-center gap-2">
           <span className="text-[20px]">🔮</span>
           <span className="text-[15px] font-bold text-white font-[var(--font-heading)] uppercase tracking-widest">Greyscales</span>
        </div>
        <button onClick={logout} className="text-[20px] bg-transparent border-none cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">⏻</button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[280px] pt-[80px] lg:pt-8 pb-12 min-h-screen relative z-10">
        <div className="px-6 lg:px-12 max-w-[1600px] mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" /> System Online
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight">
                Global Operations
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[15px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl">
                Real-time telemetrics and administrative control across the entire Greyscales educational network.
              </motion.p>
            </div>
          </div>

          {/* Gamified Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: "🏰", label: "Active Tenants", value: stats?.totalSchools ?? "—", gradient: "from-blue-600 to-cyan-400", glow: "rgba(6,182,212,0.3)" },
              { icon: "👨‍🚀", label: "Total Students", value: stats?.totalStudents ?? "—", gradient: "from-purple-600 to-fuchsia-500", glow: "rgba(168,85,247,0.3)" },
              { icon: "🧠", label: "Faculty Members", value: stats?.totalTeachers ?? "—", gradient: "from-pink-600 to-rose-400", glow: "rgba(236,72,153,0.3)" },
              { icon: "💎", label: "Platform Revenue", value: stats?.totalRevenue ? `₹${(stats.totalRevenue / 1000).toFixed(0)}K` : "—", gradient: "from-amber-500 to-orange-400", glow: "rgba(245,158,11,0.3)" },
            ].map((stat, i) => (
              <motion.div key={stat.label} 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, type: "spring" }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative group rounded-[2rem] p-6 cursor-default"
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-dark)", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)" }}>
                
                {/* Background Hover Glow */}
                <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at top right, ${stat.glow}, transparent 70%)` }} />
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-gradient-to-br ${stat.gradient} shadow-lg ring-1 ring-white/20`}>
                      {stat.icon}
                    </div>
                  </div>
                  <div>
                    <div className="text-[36px] font-black text-white font-[var(--font-heading)] tracking-tight leading-none mb-2">
                      {loadingStats ? "..." : stat.value}
                    </div>
                    <div className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Network Command Center */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] font-black text-white font-[var(--font-heading)] flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-sm">📡</span>
              Network Nodes
            </h2>
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateSchool(!showCreateSchool)}
              className="px-6 py-3 rounded-xl text-[14px] font-bold text-white border-none cursor-pointer bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] shadow-lg flex items-center gap-2">
              <span className="text-lg">✨</span> Deploy Tenant
            </motion.button>
          </div>

          {/* Deploy School Modal/Panel */}
          <AnimatePresence>
            {showCreateSchool && (
              <motion.div initial={{ opacity: 0, height: 0, scale: 0.98 }} animate={{ opacity: 1, height: "auto", scale: 1 }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-8 rounded-[2rem] relative"
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-dark)" }}>
                
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-accent)]/5 pointer-events-none" />
                
                <div className="p-8 relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl">⚡</div>
                    <div>
                      <h3 className="text-[20px] font-bold text-white font-[var(--font-heading)]">Initialize New Tenant</h3>
                      <p className="text-[13px] text-[var(--color-text-secondary)]">Provision a new isolated school environment instantly on the edge.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { key: "name", label: "Institution Name", icon: "🏫" },
                      { key: "code", label: "Unique Identifier", icon: "🔑" },
                      { key: "address", label: "HQ Address", icon: "📍" },
                      { key: "city", label: "City", icon: "🏙️" },
                      { key: "state", label: "State/Region", icon: "🗺️" },
                      { key: "phone", label: "Command Contact", icon: "📞" },
                      { key: "email", label: "Admin Email", icon: "✉️" },
                    ].map(f => (
                      <div key={f.key} className="relative group">
                        <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">{f.label}</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50 group-hover:opacity-100 transition-opacity">{f.icon}</span>
                          <input 
                            value={schoolForm[f.key as keyof typeof schoolForm]}
                            onChange={e => setSchoolForm({ ...schoolForm, [f.key]: e.target.value })}
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl text-[14px] font-medium text-white outline-none transition-all duration-300"
                            style={{ background: "var(--color-bg-dark)", border: "1px solid var(--color-border-dark)" }} 
                            onFocus={(e) => e.target.style.border = "1px solid var(--color-primary)"}
                            onBlur={(e) => e.target.style.border = "1px solid var(--color-border-dark)"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex justify-end gap-4">
                    <button onClick={() => setShowCreateSchool(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:text-white transition-colors">Abort</button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCreateSchool}
                      className="px-8 py-3 rounded-xl text-[14px] font-bold text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                      Initialize Provisioning
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* School Network Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map((school: Record<string, unknown>, i: number) => {
              const count = school._count as Record<string, number> || {};
              const sub = school.subscription as Record<string, unknown> | null;
              
              return (
                <motion.div key={school.id as string} 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5, scale: 1.01 }}
                  className="rounded-[1.5rem] p-6 relative overflow-hidden group cursor-pointer"
                  style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-dark)" }}>
                  
                  {/* Neon Glow Top Border */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] opacity-50 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] flex items-center justify-center text-2xl group-hover:shadow-[0_0_15px_var(--color-primary)] transition-shadow">
                        🏫
                      </div>
                      <div>
                        <h3 className="text-[18px] font-black text-white font-[var(--font-heading)] leading-tight">{school.name as string}</h3>
                        <p className="text-[12px] font-bold text-[var(--color-text-secondary)] mt-1">{school.code as string} <span className="text-[var(--color-border-dark)] mx-1">|</span> {school.city as string || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                      <div className="text-[20px] font-black text-[var(--color-info)] mb-1">{count.students ?? 0}</div>
                      <div className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Students</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                      <div className="text-[20px] font-black text-[var(--color-accent)] mb-1">{count.teachers ?? 0}</div>
                      <div className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Faculty</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-sidebar)]/50 border border-[var(--color-border-dark)]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Status</span>
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider
                        ${school.isActive ? "text-emerald-400" : "text-rose-400"}`}>
                        <span className={`w-2 h-2 rounded-full ${school.isActive ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-rose-400 shadow-[0_0_8px_#fb7185]"}`} />
                        {school.isActive ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-[var(--color-border-dark)]" />
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Tier</span>
                      <span className="text-[12px] font-black text-amber-400 uppercase tracking-widest">{sub ? (sub.plan as string) : "UNVERIFIED"}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {schools.length === 0 && !loadingStats && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 rounded-[2rem] bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] border-dashed">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="text-[64px] mb-6 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  🪐
                </motion.div>
                <h3 className="text-[24px] font-black text-white font-[var(--font-heading)] mb-2">Void Space</h3>
                <p className="text-[15px] text-[var(--color-text-secondary)] max-w-md text-center">Your network currently has no connected nodes. Deploy your first tenant to initialize the grid.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
