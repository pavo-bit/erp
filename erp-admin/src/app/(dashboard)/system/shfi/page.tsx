"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Layers,
} from "lucide-react";
import { useShfiOverview, useShfiIncidents } from "@/lib/api-hooks";

export default function SchoolShfiPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: overviewData, isLoading: overviewLoading, mutate: mutateOverview } = useShfiOverview();
  const { data: incidentsData, isLoading: incidentsLoading, mutate: mutateIncidents } = useShfiIncidents();

  const overview = overviewData || {
    overallStatus: "HEALTHY",
    dependencies: {
      database: { name: "School Database Engine", status: "HEALTHY", latencyMs: 2 },
      redis: { name: "Cache & Session Store", status: "HEALTHY", latencyMs: 1 },
      queues: { name: "Background Notification Relays", status: "HEALTHY", latencyMs: 1 },
      storage: { name: "Document & Media Storage", status: "HEALTHY", latencyMs: 3 },
    },
    metrics: { openIncidents: 0, criticalIncidents: 0 },
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
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> School Health & Diagnostic Centre
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time operational health, automated failure investigation, and service status for this school.
          </p>
        </div>

        <button
          onClick={() => {
            mutateOverview();
            mutateIncidents();
          }}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-2 border border-slate-200 transition-colors w-max"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
        </button>
      </div>

      {/* Subsystem Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(overview.dependencies || {}).map(([key, dep]: [string, any]) => (
          <div key={key} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">{dep.name}</div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    dep.status === "HEALTHY" ? "bg-emerald-500" : dep.status === "DEGRADED" ? "bg-amber-500" : "bg-red-500"
                  }`}
                />
                <span className="text-base font-bold text-slate-800">{dep.status}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Latency: {dep.latencyMs}ms</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
              {key === "database" ? <Database className="w-5 h-5" /> : key === "redis" ? <Cpu className="w-5 h-5" /> : key === "queues" ? <Layers className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>
          </div>
        ))}
      </div>

      {/* Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-800">Operational Incidents & Service Requests</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter incidents..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {incidentsLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading incident registry...</div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">All School Services Normal</p>
            <p className="text-xs text-slate-400 mt-1">Zero unresolved service failures or payment discrepancies.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {incidents.map((inc: any) => (
              <div key={inc.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                      {inc.category}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{inc.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{inc.initialSymptom || inc.summary}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                  {inc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

