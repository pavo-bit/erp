"use client";

import { useState } from "react";
import { Server, Activity, Layers, Cpu, Database } from "lucide-react";
import GrafanaDashboardSection from "@/components/GrafanaDashboardSection";

type InfraView = "overview" | "api" | "queues";

export default function InfrastructureMonitoringPage() {
  const [activeTab, setActiveTab] = useState<InfraView>("overview");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              🖥️
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-[var(--font-heading)]">
                Infrastructure Monitoring
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-[var(--font-heading)]">
                Deep cluster observablity: Node.js runtime, Redis BullMQ queues, and API SLO tracking
              </p>
            </div>
          </div>
        </div>

        {/* View Selector Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[var(--color-text-secondary)] hover:text-white"
            }`}
          >
            🌌 Platform Overview
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "api"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[var(--color-text-secondary)] hover:text-white"
            }`}
          >
            ⚡ API Performance
          </button>
          <button
            onClick={() => setActiveTab("queues")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "queues"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[var(--color-text-secondary)] hover:text-white"
            }`}
          >
            📬 Queues & Outbox
          </button>
        </div>
      </div>

      {/* Cluster Health Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              Container Runtime
            </div>
            <div className="text-xs font-bold text-white">Docker / Alpine Linux</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              Database Cluster
            </div>
            <div className="text-xs font-bold text-emerald-400">PostgreSQL 16 (Port 5433)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              Redis / Queues
            </div>
            <div className="text-xs font-bold text-rose-400">BullMQ Active (Port 6379)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              Prometheus Scrape
            </div>
            <div className="text-xs font-bold text-amber-400">Bearer Auth (15s Interval)</div>
          </div>
        </div>
      </div>

      {/* Render selected dashboard */}
      {activeTab === "overview" && (
        <GrafanaDashboardSection
          dashboardUid="ssvm_platform_overview"
          dashboardSlug="platform-overview"
          title="Platform Overview Telemetry"
          description="High-level platform-wide resource consumption, active institutions, and user distribution"
          hideViewOptions={true}
        />
      )}

      {activeTab === "api" && (
        <GrafanaDashboardSection
          dashboardUid="ssvm_api_performance"
          dashboardSlug="api-performance"
          title="API Latency & Error Telemetry"
          description="End-to-end HTTP request throughput, p50/p95/p99 latency quantiles, and route error rates"
          hideViewOptions={true}
        />
      )}

      {activeTab === "queues" && (
        <GrafanaDashboardSection
          dashboardUid="ssvm_queues_and_outbox"
          dashboardSlug="queues-and-outbox"
          title="BullMQ Queues & Outbox Reliability"
          description="Background worker queue depths, dead-letter monitoring, and transactional outbox event streams"
          hideViewOptions={true}
        />
      )}
    </div>
  );
}
