"use client";

import React, { useState } from "react";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { Calendar, Plus, CheckCircle2, Clock } from "lucide-react";

interface SessionItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export default function AcademicSessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([
    {
      id: "sess_2026_27",
      name: "2026-2027",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
      isCurrent: true,
    },
    {
      id: "sess_2025_26",
      name: "2025-2026",
      startDate: "2025-04-01",
      endDate: "2026-03-31",
      isCurrent: false,
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Academic Sessions & Term Calendar"
          subtitle="Manage institutional academic years, term dates, and active working sessions."
        />
        <button
          onClick={() => alert("New Academic Session Dialog")}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Academic Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Current Session" value="2026-2027" change="Active" trend="up" icon="📅" color="#10B981" />
        <StatCard title="Session Start" value="01 Apr 2026" change="Term 1" trend="neutral" icon="🏁" color="#3B82F6" />
        <StatCard title="Session End" value="31 Mar 2027" change="Annual Close" trend="neutral" icon="🎯" color="#F59E0B" />
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
              <th className="p-3">Session Name</th>
              <th className="p-3">Start Date</th>
              <th className="p-3">End Date</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-surface/50 transition">
                <td className="p-3 font-bold text-text-primary text-sm">{s.name}</td>
                <td className="p-3 text-text-secondary font-mono">{s.startDate}</td>
                <td className="p-3 text-text-secondary font-mono">{s.endDate}</td>
                <td className="p-3">
                  <StatusBadge
                    status={s.isCurrent ? "ACTIVE CURRENT" : "ARCHIVED"}
                    color={s.isCurrent ? "#10B981" : "#6B7280"}
                  />
                </td>
                <td className="p-3 text-right">
                  {!s.isCurrent && (
                    <button
                      onClick={() => alert(`Set ${s.name} as current session`)}
                      className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-surface rounded-lg transition"
                    >
                      Make Active
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

