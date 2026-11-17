"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  Lock,
  UserX,
  FileText,
  KeyRound,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import GrafanaDashboardSection from "@/components/GrafanaDashboardSection";
import { useSecurityAuditLogs } from "@/lib/api";

interface AuditLogEntry {
  id: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
  school?: {
    id: string;
    name?: string;
  };
}

// Masking helper: Zero personal data exposed
function maskEmail(email?: string): string {
  if (!email) return "SYSTEM";
  const [user, domain] = email.split("@");
  if (!domain) return "ANONYMOUS";
  const maskedUser = user.length <= 2 ? "**" : `${user[0]}***${user[user.length - 1]}`;
  const domainParts = domain.split(".");
  const maskedDomain = domainParts.length > 1
    ? `${domainParts[0][0]}***.${domainParts.slice(1).join(".")}`
    : "host.internal";
  return `${maskedUser}@${maskedDomain}`;
}

function maskIp(ip?: string): string {
  if (!ip) return "INTERNAL";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return "INTERNAL / MASKED";
}

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "events">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const { data: logsData, error, isLoading, mutate } = useSecurityAuditLogs();
  const rawLogs: AuditLogEntry[] = Array.isArray(logsData) ? logsData : [];

  // Filter logs without exposing personal data
  const filteredLogs = rawLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.school?.name && log.school.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(rawLogs.map((l) => l.action))).slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(244,63,94,0.25)]">
              🛡️
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-[var(--font-heading)]">
                Security Operations Center (SOC)
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-[var(--font-heading)]">
                Real-time security telemetry, fail-closed guardrails, and sanitized immutable audit trails
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)]">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30"
                : "text-[var(--color-text-secondary)] hover:text-white"
            }`}
          >
            📊 Security Dashboard
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "events"
                ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30"
                : "text-[var(--color-text-secondary)] hover:text-white"
            }`}
          >
            📋 Sanitized Audit Stream
          </button>
        </div>
      </div>

      {/* Security Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              RLS Policy Status
            </div>
            <div className="text-sm font-bold text-emerald-400">ENFORCED (Fail-Closed)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              Step-Up MFA Gates
            </div>
            <div className="text-sm font-bold text-indigo-400">Active (TOTP / Otplib)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              Rate Limit Protection
            </div>
            <div className="text-sm font-bold text-amber-400">Redis Distributed Limiter</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">
              Audit Stream Volume
            </div>
            <div className="text-sm font-bold text-white">{rawLogs.length} Events Logged</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "dashboard" ? (
        <GrafanaDashboardSection
          dashboardUid="ssvm_security_events"
          dashboardSlug="security-events-and-guardrails"
          title="Security Events & Threat Guardrails"
          description="Live Prometheus telemetry monitoring auth failures, lockouts, CSRF checks, and webhook validations"
          hideViewOptions={true}
        />
      ) : (
        <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-dark)] overflow-hidden shadow-xl">
          <div className="p-6 border-b border-[var(--color-border-dark)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white font-[var(--font-heading)]">
                Sanitized Platform Security Events
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Zero personal data: emails, student records, and IP addresses are strictly masked
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">All Actions</option>
                {uniqueActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>

              <button
                onClick={() => mutate()}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor (Masked)</th>
                  <th className="py-3 px-4">School Context</th>
                  <th className="py-3 px-4">IP (Masked)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No matching security events recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {maskEmail(log.user?.email)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.school?.name || "Global / SaaS"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {maskIp(log.ipAddress)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Logged
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
