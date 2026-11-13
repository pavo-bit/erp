"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, TrendingUp, Users, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useSaasMetrics, useShfiOverview } from "@/lib/api";
import GrafanaDashboardSection from "@/components/GrafanaDashboardSection";

export default function AnalyticsPage() {
  const { data: metricsData, isLoading: metricsLoading } = useSaasMetrics();
  const { data: healthData, isLoading: healthLoading } = useShfiOverview();

  const metrics = metricsData || {
    tenants: { total: 0, active: 0, pending: 0 },
    subscriptions: { active: 0, totalRevenueMonthly: 0 },
    users: { totalStudents: 0, totalTeachers: 0, totalUsers: 0 },
  };

  const health = healthData || {
    overallStatus: "HEALTHY",
    uptimeSeconds: 0,
    metrics: { openIncidents: 0, criticalIncidents: 0, memoryUsageMB: 0 },
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-8 pt-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Activity className="w-4 h-4" /> Global Telemetrics & SHFI
          </motion.div>
          <h1 className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-slate-400 font-[var(--font-heading)] leading-tight">
            Network Analytics
          </h1>
          <p className="text-[15px] text-slate-400 mt-2 font-medium max-w-xl">
            Real-time insights across all isolated environments, resource utilization, and SaaS metric tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between group hover:border-amber-500/30 transition-colors">
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">School Tenants</div>
            <div className="text-3xl font-black text-white">{metrics.tenants.total}</div>
            <div className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {metrics.tenants.active} Active Schools
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BarChart3 className="w-8 h-8" />
          </div>
        </div>
        
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between group hover:border-purple-500/30 transition-colors">
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Platform Students</div>
            <div className="text-3xl font-black text-white">{Number(metrics.users.totalStudents || 0).toLocaleString()}</div>
            <div className="text-xs text-purple-400 font-bold mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Across all branches
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Platform Health</div>
            <div className="text-3xl font-black text-emerald-400">{health.overallStatus}</div>
            <div className="text-xs text-slate-400 font-bold mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Uptime: {Math.floor((health.uptimeSeconds || 0) / 3600)}h
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Activity className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between group hover:border-red-500/30 transition-colors">
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Open Incidents</div>
            <div className="text-3xl font-black text-white">{health.metrics.openIncidents}</div>
            <div className="text-xs text-amber-400 font-bold mt-2 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> {health.metrics.criticalIncidents} Critical
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Embedded Live Grafana Telemetry Suite */}
      <GrafanaDashboardSection />
    </div>
  );
}
