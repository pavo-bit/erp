"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { ShieldCheck, Search, Filter, Download, Calendar, UserCheck } from "lucide-react";

interface AuditLogEntry {
  id: string;
  createdAt: string;
  action: string;
  actorName: string;
  actorRole: string;
  targetEntity: string;
  status: "SUCCESS" | "FAILED" | "SECURITY_ALERT";
  ipAddress?: string;
  details?: string;
}

const SAMPLE_LOGS: AuditLogEntry[] = [
  {
    id: "log_1",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    action: "USER_AUTHENTICATED",
    actorName: "Principal Sharma",
    actorRole: "ERP_ADMIN",
    targetEntity: "Session: jwt_auth",
    status: "SUCCESS",
    ipAddress: "192.168.1.45",
    details: "MFA challenge successfully verified.",
  },
  {
    id: "log_2",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    action: "FEE_PAYMENT_COLLECTED",
    actorName: "Cashier Rajesh",
    actorRole: "ACCOUNTANT",
    targetEntity: "Receipt: RCPT-2026-0042",
    status: "SUCCESS",
    ipAddress: "192.168.1.12",
    details: "Double-entry ledger transaction verified: ₹12,500.",
  },
  {
    id: "log_3",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    action: "STUDENT_BULK_IMPORT",
    actorName: "Admin User",
    actorRole: "ERP_ADMIN",
    targetEntity: "BulkJob: students",
    status: "SUCCESS",
    ipAddress: "192.168.1.2",
    details: "Imported 48 students. Non-compacting column mapping enforced.",
  },
  {
    id: "log_4",
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    action: "UNAUTHORIZED_TENANT_ACCESS_ATTEMPT",
    actorName: "External Client",
    actorRole: "ANONYMOUS",
    targetEntity: "/api/v1/admin/transport",
    status: "SECURITY_ALERT",
    ipAddress: "203.0.113.195",
    details: "Missing tenant session. Fail-closed RLS rejected request.",
  },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(SAMPLE_LOGS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || l.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Logs & Security Events"
        subtitle="Immutable ledger of operational mutations, administrative events, and authentication challenges."
      />

      {/* Security Banner */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div>
            <h4 className="font-bold text-xs text-text-primary">Enterprise Compliance Logging Active</h4>
            <p className="text-[11px] text-text-secondary">
              Logs are cryptographically linked, append-only, and retained for regulatory compliance.
            </p>
          </div>
        </div>
        <button
          onClick={() => alert("Audit log export generated.")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border text-xs font-semibold rounded-lg text-text-primary transition"
        >
          <Download className="w-3.5 h-3.5 text-text-secondary" />
          Export Audit Trail (.csv)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search action, actor, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Event Severities</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed</option>
            <option value="SECURITY_ALERT">Security Alerts</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Event Action</th>
              <th className="p-3">Actor & Role</th>
              <th className="p-3">Target Entity</th>
              <th className="p-3">Severity / Status</th>
              <th className="p-3">IP / Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-surface/50 transition">
                <td className="p-3 font-mono text-text-secondary whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </td>
                <td className="p-3 font-mono font-bold text-text-primary">
                  {log.action}
                </td>
                <td className="p-3">
                  <div className="font-semibold text-text-primary">{log.actorName}</div>
                  <div className="text-[10px] text-text-secondary font-mono">[{log.actorRole}]</div>
                </td>
                <td className="p-3 font-mono text-text-secondary">
                  {log.targetEntity}
                </td>
                <td className="p-3">
                  <StatusBadge
                    status={log.status}
                    color={
                      log.status === "SUCCESS"
                        ? "#10B981"
                        : log.status === "SECURITY_ALERT"
                        ? "#EF4444"
                        : "#F59E0B"
                    }
                  />
                </td>
                <td className="p-3 text-text-secondary max-w-xs">
                  <div className="text-[10px] font-mono text-text-primary">{log.ipAddress}</div>
                  <div>{log.details}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

