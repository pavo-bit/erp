"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
// Assume generic fetcher is implemented in api-hooks
// import { fetchTransportVehicles, fetchTransportRoutes } from "@/lib/api-hooks";

export default function TransportLogisticsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("fleet");
  
  // Dummy data for visual representation until hooked up to actual SWR hooks
  const vehicles = [
    { id: "1", vehicleNumber: "DL-1V-4422", type: "BUS", capacity: 40, status: "ACTIVE" },
    { id: "2", vehicleNumber: "HR-26-XX-11", type: "VAN", capacity: 12, status: "MAINTENANCE" },
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Fleet Live
          </motion.div>
          <h1 className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight">
            Transport Logistics
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl">
            Real-time fleet tracking, vehicle maintenance, and student route allocation.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button className="px-6 py-3 rounded-xl text-[14px] font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] hover:text-white hover:border-blue-500/50 transition-all">
            GPS Telemetry 📡
          </button>
          <button className="px-6 py-3 rounded-xl text-[14px] font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-transform">
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Analytics Gamified Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Active Fleet", value: "14", icon: "🚌", gradient: "from-blue-600 to-cyan-500" },
          { label: "Total Routes", value: "8", icon: "🗺️", gradient: "from-emerald-500 to-teal-400" },
          { label: "Students Allocated", value: "482", icon: "🧑‍🎓", gradient: "from-purple-500 to-fuchsia-500" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-6 rounded-[1.5rem] relative overflow-hidden group border border-[var(--color-border-dark)] bg-[var(--color-bg-card)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">{stat.icon}</div>
            <div className="relative z-10">
              <div className="text-[32px] font-black text-white tracking-tight mb-1">{stat.value}</div>
              <div className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{stat.label}</div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-50`} />
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-dark)] overflow-x-auto pb-px mt-4">
        {["fleet", "routes", "stops", "allocations"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`relative px-6 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap
              ${activeTab === tab ? "text-blue-400" : "text-[var(--color-text-secondary)] hover:text-white"}`}>
            {tab}
            {activeTab === tab && <motion.div layoutId="transportTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-400 shadow-[0_0_10px_#60a5fa]" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
          
          {activeTab === "fleet" && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-[1.5rem] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-dark)] border-b border-[var(--color-border-dark)]">
                    <th className="p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Vehicle ID</th>
                    <th className="p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Type / Capacity</th>
                    <th className="p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
                    <th className="p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-dark)]">
                  {vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-[var(--color-bg-dark)]/50 transition-colors">
                      <td className="p-4 font-black text-white">{v.vehicleNumber}</td>
                      <td className="p-4">
                        <div className="text-[13px] font-bold text-white">{v.type}</div>
                        <div className="text-[11px] text-[var(--color-text-secondary)]">{v.capacity} Seats</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${v.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-[var(--color-text-secondary)] hover:text-white transition-colors">•••</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "routes" && (
             <div className="flex flex-col items-center justify-center py-20 rounded-[1.5rem] border border-[var(--color-border-dark)] border-dashed bg-[var(--color-bg-dark)]/50">
               <div className="text-[48px] mb-4 opacity-50">🗺️</div>
               <h3 className="text-[18px] font-bold text-white mb-2">No Routes Configured</h3>
               <p className="text-[14px] text-[var(--color-text-secondary)]">Draw paths and drop pins to map your transport topology.</p>
               <button className="mt-6 px-6 py-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 transition-colors">Create Route</button>
             </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
