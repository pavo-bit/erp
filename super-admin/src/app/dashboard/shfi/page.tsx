"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Layers,
} from "lucide-react";
import { useShfiOverview, useShfiIncidents } from "@/lib/api";

export default function ShfiDashboardPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: overviewData, isLoading: overviewLoading, mutate: mutateOverview } = useShfiOverview();
  const { data: incidentsData, isLoading: incidentsLoading, mutate: mutateIncidents } = useShfiIncidents();

  const overview = overviewData || {
    overallStatus: "HEALTHY",
    uptimeSeconds: 0,
    dependencies: {
      database: { name: "PostgreSQL Database", status: "HEALTHY", latencyMs: 2 },
      redis: { name: "Redis Store", status: "HEALTHY", latencyMs: 1 },
      queues: { name: "BullMQ Queues", status: "HEALTHY", latencyMs: 1 },
      storage: { name: "File Storage", status: "HEALTHY", latencyMs: 3 },
    },
    metrics: { openIncidents: 0, criticalIncidents: 0, eventsInLastHour: 0, memoryUsageMB: 0 },
  };

  const incidents = Array.isArray(incidentsData)
    ? incidentsData.filter((inc: any) => {
        const matchesStatus = selectedStatus === "ALL" || inc.status === selectedStatus;
        const matchesSearch =
          !searchTerm ||
          inc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inc.affectedService?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
      })
    : [];

  return (
    <div className="p-6 lg:p-12 max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldAlert className="w-4 h-4" /> Platform Reliability
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
            System Health & Incident Management Centre (SHFI)
          </h1>
          <p className="text-slate-400 mt-2 font-medium max-w-2xl text-sm">
            Autonomous failure detection, deterministic classification, dependency probes, and cross-module incident resolution.
          </p>
        </div>

        <button
          onClick={() => {
            mutateOverview();
            mutateIncidents();
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
        </button>
      </div>

      {/* Dependency Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(overview.dependencies || {}).map(([key, dep]: [string, any]) => (
          <div
            key={key}
            className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl flex items-center justify-between shadow-lg"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{dep.name}</div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    dep.status === "HEALTHY"
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : dep.status === "DEGRADED"
                      ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                      : "bg-red-400 shadow-[0_0_8px_#f87171]"
                  }`}
                />
                <span className="text-lg font-bold text-white">{dep.status}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Latency: {dep.latencyMs}ms</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
              {key === "database" ? <Database className="w-6 h-6" /> : key === "redis" ? <Cpu className="w-6 h-6" /> : key === "queues" ? <Layers className="w-6 h-6" /> : <Server className="w-6 h-6" />}
            </div>
          </div>
        ))}
      </div>

      {/* Incident Filtering & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["ALL", "DETECTED", "INVESTIGATING", "RESOLVED", "CLOSED"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedStatus === status
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search incidents..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Incidents List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl">
        {incidentsLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading incident registry...</div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">All Systems Operational</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Zero active platform or tenant incidents reported. Subsystems operating within SLA bounds.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="p-6 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inc.severity === "CRITICAL"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : inc.severity === "HIGH"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase">{inc.category}</span>
                    <span className="text-xs text-slate-500">• Confidence: {inc.confidence}</span>
                  </div>
                  <h3 className="font-bold text-base text-white">{inc.title}</h3>
                  <p className="text-xs text-slate-400">{inc.initialSymptom || inc.summary}</p>
                  {inc.rootCause && (
                    <div className="text-xs text-amber-300/80 font-mono mt-1">
                      Root Cause: {inc.rootCause}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                      {inc.status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {inc.eventCount || 1} Events Correlated
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

