"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, TrendingUp, Users } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="p-6 lg:p-12 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Activity className="w-4 h-4" /> Global Telemetrics
          </motion.div>
          <h1 className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-slate-400 font-[var(--font-heading)] leading-tight">
            Network Analytics
          </h1>
          <p className="text-[15px] text-slate-400 mt-2 font-medium max-w-xl">
            Real-time insights across all isolated environments, resource utilization, and SaaS metric tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between group hover:border-amber-500/30 transition-colors">
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Total Bandwidth</div>
            <div className="text-3xl font-black text-white">4.2 TB</div>
            <div className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12% this month
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BarChart3 className="w-8 h-8" />
          </div>
        </div>
        
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between group hover:border-purple-500/30 transition-colors">
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Active Users (Daily)</div>
            <div className="text-3xl font-black text-white">12,450</div>
            <div className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +5.4% this week
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl p-8 min-h-[400px] flex items-center justify-center flex-col text-center">
        <Activity className="w-16 h-16 text-slate-700 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-slate-300">Telemetry Engine Loading...</h3>
        <p className="text-slate-500 max-w-sm mt-2">Historical charts and deep analysis grids are establishing secure connection to the data warehouse.</p>
      </div>
    </div>
  );
}
