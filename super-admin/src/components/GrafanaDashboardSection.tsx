"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

export interface ViewOption {
  id: string;
  label: string;
  icon: string;
  panelId?: number;
  description: string;
}

const DEFAULT_VIEW_OPTIONS: ViewOption[] = [
  {
    id: "overview",
    label: "Executive Grid",
    icon: "🔮",
    description: "Complete command dashboard with KPI metrics, telemetrics & finance",
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

interface GrafanaDashboardSectionProps {
  dashboardUid?: string;
  dashboardSlug?: string;
  title?: string;
  description?: string;
  viewOptions?: ViewOption[];
  hideViewOptions?: boolean;
}

export default function GrafanaDashboardSection({
  dashboardUid = "erp-overview",
  dashboardSlug = "erp-executive-overview",
  title = "Platform Telemetry & Metrics",
  description = "Centralized real-time telemetry streaming through hardened platform reverse proxy gateway",
  viewOptions = DEFAULT_VIEW_OPTIONS,
  hideViewOptions = false,
}: GrafanaDashboardSectionProps) {
  const [activeView, setActiveView] = useState<string>(viewOptions[0]?.id || "overview");
  const [refreshInterval, setRefreshInterval] = useState<string>("5s");
  const [timeRange, setTimeRange] = useState<string>("now-1h");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [grafanaOnline, setGrafanaOnline] = useState<boolean | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Embedding base URL from docs/MONITORING/GRAFANA_ACCESS.md configured by env var
  const grafanaBaseUrl =
    process.env.NEXT_PUBLIC_GRAFANA_PROXY_URL ||
    process.env.NEXT_PUBLIC_GRAFANA_URL ||
    "/api/v1/platform/grafana";

  // Check Grafana health through reverse proxy / platform gateway
  const checkGrafanaHealth = async () => {
    try {
      setHealthError(null);
      const res = await fetch(`${grafanaBaseUrl}/dashboard`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        setGrafanaOnline(true);
      } else if (res.status === 401 || res.status === 403) {
        setGrafanaOnline(false);
        setHealthError("Platform session unauthorized to access Grafana telemetry gateway.");
      } else {
        setGrafanaOnline(false);
        setHealthError(`Grafana service responded with status ${res.status}.`);
      }
    } catch (err: unknown) {
      setGrafanaOnline(false);
      setHealthError(err instanceof Error ? err.message : "Grafana service unreachable.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      if (isMounted) await checkGrafanaHealth();
    };
    runCheck();
    const interval = setInterval(runCheck, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [grafanaBaseUrl]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setReloadKey((prev) => prev + 1);
    checkGrafanaHealth().finally(() => {
      setTimeout(() => setIsRefreshing(false), 800);
    });
  };

  // Determine iframe src URL
  const selectedView = viewOptions.find((v) => v.id === activeView) || viewOptions[0];

  let iframeUrl = "";
  if (selectedView?.panelId) {
    const params = new URLSearchParams({
      orgId: "1",
      panelId: String(selectedView.panelId),
      from: timeRange,
      to: "now",
      theme: "dark",
    });
    if (refreshInterval) params.set("refresh", refreshInterval);
    iframeUrl = `${grafanaBaseUrl}/d-solo/${dashboardUid}/${dashboardSlug}?${params.toString()}`;
  } else {
    const params = new URLSearchParams({
      kiosk: "tv",
      from: timeRange,
      to: "now",
      theme: "dark",
    });
    if (refreshInterval) params.set("refresh", refreshInterval);
    iframeUrl = `${grafanaBaseUrl}/d/${dashboardUid}/${dashboardSlug}?${params.toString()}`;
  }

  const externalGrafanaUrl = `${grafanaBaseUrl}/d/${dashboardUid}/${dashboardSlug}?refresh=${refreshInterval || "5s"}`;

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
              {title}
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border border-slate-700 bg-slate-900/80">
              {grafanaOnline === null ? (
                <span className="text-slate-400 flex items-center gap-1">Checking...</span>
              ) : grafanaOnline ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  GATEWAY CONNECTED
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  UNAVAILABLE
                </span>
              )}
            </div>
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 font-[var(--font-heading)]">
            {description}
          </p>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] p-0.5">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.from}
                onClick={() => setTimeRange(tr.from)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  timeRange === tr.from
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>

          {/* Auto Refresh Dropdown */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] text-[12px] font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {REFRESH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>

          {/* Manual Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleManualRefresh}
            title="Force Refresh Data"
            className="p-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] text-[var(--color-text-secondary)] hover:text-white cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
          </motion.button>

          {/* Fullscreen Button */}
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
            <span>Gateway Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* View Switcher Pills */}
      {!hideViewOptions && viewOptions.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {viewOptions.map((v) => {
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
      )}

      {/* Grafana Frame Container / Clear Unavailable State */}
      <div
        className={`relative rounded-[2rem] overflow-hidden border border-[var(--color-border-dark)] shadow-[0_10px_40px_rgba(0,0,0,0.6)] bg-slate-950 transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-4 z-[9999] h-[calc(100vh-2rem)] rounded-2xl"
            : selectedView?.panelId
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
              {selectedView?.label || title}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {selectedView?.description || description}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-slate-500">Gateway:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> /api/v1/platform/grafana
            </span>
          </div>
        </div>

        {/* Clear Unavailable State when Grafana is Offline or Access Denied */}
        {grafanaOnline === false ? (
          <div className="w-full h-[calc(100%-2.5rem)] flex flex-col items-center justify-center p-8 text-center bg-slate-950">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-[var(--font-heading)]">
              Grafana Monitoring Gateway Unavailable
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              {healthError ||
                "The Grafana observability service is unreachable through the platform reverse proxy. Verify the container is active and your session carries valid SUPER_ADMIN platform credentials."}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleManualRefresh}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Retry Gateway Connection
              </button>
            </div>
          </div>
        ) : (
          /* Embedded IFrame through reverse proxy */
          <iframe
            key={`${iframeUrl}-${reloadKey}`}
            ref={iframeRef}
            src={iframeUrl}
            className="w-full h-[calc(100%-2.5rem)] border-none bg-slate-950"
            title={`Grafana - ${selectedView?.label || title}`}
            loading="eager"
          />
        )}

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
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              PostgreSQL Schema
            </div>
            <div className="text-[12px] font-bold text-white truncate">
              platform_metrics (ssvm_grafana_ro)
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
            🔥
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Prometheus Scraper
            </div>
            <div className="text-[12px] font-bold text-white truncate">
              Bearer Auth /metrics (15s interval)
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
            🛡️
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Access Architecture
            </div>
            <div className="text-[12px] font-bold text-white truncate">
              Reverse Proxy (PLATFORM session only)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
