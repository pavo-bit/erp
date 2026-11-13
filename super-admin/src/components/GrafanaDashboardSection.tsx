"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";

interface ViewOption {
  id: string;
  label: string;
  icon: string;
  panelId?: number;
  description: string;
}

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: "overview",
    label: "Executive Grid",
    icon: "🔮",
    description: "Complete 11-panel command dashboard with KPI metrics, telemetrics & finance",
  },
  {
    id: "traffic",
    label: "Live Traffic",
    icon: "⚡",
    panelId: 7,
    description: "Real-time HTTP request throughput streamed by API route",
  },
  {
    id: "latency",
    label: "API Latencies",
    icon: "⏱️",
    panelId: 8,
    description: "P50, P95 & P99 latency percentiles across system endpoints",
  },
  {
    id: "finance",
    label: "Fee Operations",
    icon: "💳",
    panelId: 9,
    description: "Student invoices & collection breakdown by clearance status",
  },
  {
    id: "users",
    label: "Role Directory",
    icon: "👥",
    panelId: 10,
    description: "Distribution of Super Admin, ERP Admin, Faculty & Students",
  },
  {
    id: "memory",
    label: "Node.js Heap",
    icon: "🧠",
    panelId: 11,
    description: "Process RSS, V8 Heap Used & Total allocation curves",
  },
];

const REFRESH_OPTIONS = [
  { label: "5s (Real-Time)", value: "5s" },
  { label: "10s", value: "10s" },
  { label: "30s", value: "30s" },
  { label: "1m", value: "1m" },
  { label: "Manual", value: "" },
];

const TIME_RANGES = [
  { label: "Last 15m", from: "now-15m" },
  { label: "Last 1h", from: "now-1h" },
  { label: "Last 6h", from: "now-6h" },
  { label: "Last 24h", from: "now-24h" },
];

export default function GrafanaDashboardSection() {
  const [activeView, setActiveView] = useState<string>("overview");
  const [refreshInterval, setRefreshInterval] = useState<string>("5s");
  const [timeRange, setTimeRange] = useState<string>("now-1h");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [grafanaOnline, setGrafanaOnline] = useState<boolean | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check Grafana health
  useEffect(() => {
    let isMounted = true;
    const checkGrafana = async () => {
      try {
        const res = await fetch("http://localhost:3004/api/health", { method: "GET" });
        if (isMounted) setGrafanaOnline(res.ok);
      } catch {
        if (isMounted) setGrafanaOnline(false);
      }
    };
    checkGrafana();
    const interval = setInterval(checkGrafana, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setReloadKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Determine iframe src URL
  const selectedView = VIEW_OPTIONS.find((v) => v.id === activeView) || VIEW_OPTIONS[0];
  const baseUrl = "http://localhost:3004";
  
  let iframeUrl = "";
  if (selectedView.panelId) {
    // Single Panel mode
    const params = new URLSearchParams({
      orgId: "1",
      panelId: String(selectedView.panelId),
      from: timeRange,
      to: "now",
      theme: "dark",
    });
    if (refreshInterval) params.set("refresh", refreshInterval);
    iframeUrl = `${baseUrl}/d-solo/erp-overview/erp-executive-overview?${params.toString()}`;
  } else {
    // Full Dashboard mode
    const params = new URLSearchParams({
      kiosk: "tv",
      from: timeRange,
      to: "now",
      theme: "dark",
    });
    if (refreshInterval) params.set("refresh", refreshInterval);
    iframeUrl = `${baseUrl}/d/erp-overview/erp-executive-overview?${params.toString()}`;
  }

  const externalGrafanaUrl = `${baseUrl}/d/erp-overview/erp-executive-overview?refresh=${refreshInterval || "5s"}`;

  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[24px] font-black text-white font-[var(--font-heading)] flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                📊
              </span>
              Operational Telemetrics & Live Grafana
            </h2>

            {/* Live Indicator */}
            {grafanaOnline === true && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                LIVE SYNC ({refreshInterval || "MANUAL"})
              </span>
            )}
            {grafanaOnline === false && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                GRAFANA PORT 3004 STANDBY
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 font-medium">
            Continuous real-time telemetry streaming from PostgreSQL platform tables and Prometheus metrics exporter.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Interval Selector */}
          <div className="flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-xl px-2.5 py-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Tick:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              className="bg-transparent text-white text-[12px] font-bold outline-none cursor-pointer border-none"
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value} className="bg-slate-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-xl px-2.5 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-white text-[12px] font-bold outline-none cursor-pointer border-none"
            >
              {TIME_RANGES.map((tr) => (
                <option key={tr.label} value={tr.from} className="bg-slate-900 text-white">
                  {tr.label}
                </option>
              ))}
            </select>
          </div>

          {/* Force Reload Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleManualRefresh}
            title="Reload Dashboard Stream"
            className="p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] text-[var(--color-text-secondary)] hover:text-white cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
          </motion.button>

          {/* Fullscreen Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus Mode"}
            className="p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] text-[var(--color-text-secondary)] hover:text-white cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </motion.button>

          {/* Open in Standalone Tab */}
          <a
            href={externalGrafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all no-underline"
          >
            <span>Open Grafana</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* View Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {VIEW_OPTIONS.map((v) => {
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer border ${
                isActive
                  ? "bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border-purple-500/60 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                  : "bg-[var(--color-bg-card)] border-[var(--color-border-dark)] text-[var(--color-text-secondary)] hover:text-white hover:border-slate-700"
              }`}
            >
              <span className="text-sm">{v.icon}</span>
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grafana Frame Container */}
      <div
        className={`relative rounded-[2rem] overflow-hidden border border-[var(--color-border-dark)] shadow-[0_10px_40px_rgba(0,0,0,0.6)] bg-slate-950 transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-4 z-[9999] h-[calc(100vh-2rem)] rounded-2xl"
            : selectedView.panelId
            ? "h-[500px]"
            : "h-[760px]"
        }`}
      >
        {/* Glow Border Effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 opacity-60 z-20 pointer-events-none" />

        {/* Status / Info Top Bar inside Frame */}
        <div className="h-10 px-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 z-10 relative">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-purple-400 font-bold uppercase tracking-wider">
              {selectedView.label}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">{selectedView.description}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-slate-500">Source:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> PostgreSQL + Prometheus
            </span>
          </div>
        </div>

        {/* Embedded IFrame */}
        <iframe
          key={`${iframeUrl}-${reloadKey}`}
          ref={iframeRef}
          src={iframeUrl}
          className="w-full h-[calc(100%-2.5rem)] border-none bg-slate-950"
          title={`Grafana - ${selectedView.label}`}
          loading="eager"
        />

        {/* Fullscreen Exit Overlay Button */}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-12 right-6 z-30 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 flex items-center gap-2 shadow-2xl cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Close Fullscreen</span>
          </button>
        )}
      </div>

      {/* Telemetry Footer Meta Strip */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
            🐘
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">PostgreSQL Core</div>
            <div className="text-[12px] font-bold text-white truncate">Connected (ssvm-database:5432)</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
            🔥
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Prometheus Scraper</div>
            <div className="text-[12px] font-bold text-white truncate">Active 15s interval (Port 9090)</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
            📈
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Telemetry Engine</div>
            <div className="text-[12px] font-bold text-white truncate">Grafana Enterprise v13.3 (Port 3004)</div>
          </div>
        </div>
      </div>
    </section>
  );
}

