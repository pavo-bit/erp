"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSuperAdminStats, useSchools, apiCall } from "@/lib/api";
import GrafanaDashboardSection from "@/components/GrafanaDashboardSection";

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useSuperAdminStats();
  const { data: schoolsData } = useSchools();
  const schools = Array.isArray(schoolsData) ? schoolsData : [];

  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
  });

  const handleCreateSchool = async () => {
    try {
      await apiCall("/api/v1/schools", "POST", schoolForm);
      window.location.reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="px-6 lg:px-12 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" /> System Online
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight"
          >
            Global Operations
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[15px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl"
          >
            Real-time telemetrics and administrative control across the entire Greyscales educational network.
          </motion.p>
        </div>
      </div>

      {/* Gamified Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          {
            icon: "🏰",
            label: "Active Tenants",
            value: stats?.totalSchools ?? "—",
            gradient: "from-blue-600 to-cyan-400",
            glow: "rgba(6,182,212,0.3)",
          },
          {
            icon: "👨‍🚀",
            label: "Total Students",
            value: stats?.totalStudents ?? "—",
            gradient: "from-purple-600 to-fuchsia-500",
            glow: "rgba(168,85,247,0.3)",
          },
          {
            icon: "🧠",
            label: "Faculty Members",
            value: stats?.totalTeachers ?? "—",
            gradient: "from-pink-600 to-rose-400",
            glow: "rgba(236,72,153,0.3)",
          },
          {
            icon: "💎",
            label: "Platform Revenue",
            value: stats?.totalRevenue ? `₹${(stats.totalRevenue / 1000).toFixed(0)}K` : "—",
            gradient: "from-amber-500 to-orange-400",
            glow: "rgba(245,158,11,0.3)",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, type: "spring" }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative group rounded-[2rem] p-6 cursor-default"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border-dark)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)",
            }}
          >
            {/* Background Hover Glow */}
            <div
              className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: `radial-gradient(circle at top right, ${stat.glow}, transparent 70%)` }}
            />

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-start justify-between mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[28px] bg-gradient-to-br ${stat.gradient} shadow-lg ring-1 ring-white/20`}
                >
                  {stat.icon}
                </div>
              </div>
              <div>
                <div className="text-[36px] font-black text-white font-[var(--font-heading)] tracking-tight leading-none mb-2">
                  {loadingStats ? "..." : stat.value}
                </div>
                <div className="text-[14px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Operational Telemetrics & Live Grafana Dashboards */}
      <GrafanaDashboardSection />

      {/* Network Command Center */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-black text-white font-[var(--font-heading)] flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-sm">
            📡
          </span>
          Network Nodes
        </h2>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateSchool(!showCreateSchool)}
          className="px-6 py-3 rounded-xl text-[14px] font-bold text-white border-none cursor-pointer bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] shadow-lg flex items-center gap-2"
        >
          <span className="text-lg">✨</span> Deploy Tenant
        </motion.button>
      </div>

      {/* Deploy School Modal/Panel */}
      <AnimatePresence>
        {showCreateSchool && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8 rounded-[2rem] relative"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-dark)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-accent)]/5 pointer-events-none" />

            <div className="p-8 relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl">
                  ⚡
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-white font-[var(--font-heading)]">
                    Initialize New Tenant
                  </h3>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    Provision a new isolated school environment instantly on the edge.
                  </p>
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
                ].map((f) => (
                  <div key={f.key} className="relative group">
                    <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                      {f.label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50 group-hover:opacity-100 transition-opacity">
                        {f.icon}
                      </span>
                      <input
                        value={schoolForm[f.key as keyof typeof schoolForm]}
                        onChange={(e) => setSchoolForm({ ...schoolForm, [f.key]: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl text-[14px] font-medium text-white outline-none transition-all duration-300"
                        style={{
                          background: "var(--color-bg-dark)",
                          border: "1px solid var(--color-border-dark)",
                        }}
                        onFocus={(e) => (e.target.style.border = "1px solid var(--color-primary)")}
                        onBlur={(e) => (e.target.style.border = "1px solid var(--color-border-dark)")}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button
                  onClick={() => setShowCreateSchool(false)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:text-white transition-colors"
                >
                  Abort
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateSchool}
                  className="px-8 py-3 rounded-xl text-[14px] font-bold text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
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
          const count = (school._count as Record<string, number>) || {};
          const sub = school.subscription as Record<string, unknown> | null;

          return (
            <motion.div
              key={school.id as string}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="rounded-[1.5rem] p-6 relative overflow-hidden group cursor-pointer"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-dark)" }}
            >
              {/* Neon Glow Top Border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] flex items-center justify-center text-2xl group-hover:shadow-[0_0_15px_var(--color-primary)] transition-shadow">
                    🏫
                  </div>
                  <div>
                    <h3 className="text-[18px] font-black text-white font-[var(--font-heading)] leading-tight">
                      {school.name as string}
                    </h3>
                    <p className="text-[12px] font-bold text-[var(--color-text-secondary)] mt-1">
                      {school.code as string} <span className="text-[var(--color-border-dark)] mx-1">|</span>{" "}
                      {(school.city as string) || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                  <div className="text-[20px] font-black text-[var(--color-info)] mb-1">
                    {count.students ?? 0}
                  </div>
                  <div className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Students
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                  <div className="text-[20px] font-black text-[var(--color-accent)] mb-1">
                    {count.teachers ?? 0}
                  </div>
                  <div className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Faculty
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-sidebar)]/50 border border-[var(--color-border-dark)]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider ${
                      school.isActive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        school.isActive
                          ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                          : "bg-rose-400 shadow-[0_0_8px_#fb7185]"
                      }`}
                    />
                    {school.isActive ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="w-px h-8 bg-[var(--color-border-dark)]" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">
                    Tier
                  </span>
                  <span className="text-[12px] font-black text-amber-400 uppercase tracking-widest">
                    {sub ? (sub.plan as string) : "UNVERIFIED"}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {schools.length === 0 && !loadingStats && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 rounded-[2rem] bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] border-dashed">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="text-[64px] mb-6 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]"
            >
              🪐
            </motion.div>
            <h3 className="text-[24px] font-black text-white font-[var(--font-heading)] mb-2">Void Space</h3>
            <p className="text-[15px] text-[var(--color-text-secondary)] max-w-md text-center">
              Your network currently has no connected nodes. Deploy your first tenant to initialize the grid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
