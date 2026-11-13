"use client";

import React, { useState } from "react";
import { SharedDataEntryHeader } from "@/components/import/SharedDataEntryHeader";
import { StatCard, StatusBadge } from "@/components/DashboardLayout";
import { Users, Phone, Mail, Edit2 } from "lucide-react";

interface GuardianItem {
  id: string;
  name: string;
  relationship: string;
  primaryPhone: string;
  primaryEmail?: string;
  studentName?: string;
  studentRoll?: string;
}

export default function ParentsGuardiansPage() {
  const [guardians, setGuardians] = useState<GuardianItem[]>([
    {
      id: "g1",
      name: "Rajesh Sharma",
      relationship: "Father",
      primaryPhone: "+91 98765 43210",
      primaryEmail: "rajesh.sharma@example.com",
      studentName: "Aarav Sharma",
      studentRoll: "STU-2026-001",
    },
    {
      id: "g2",
      name: "Sunita Patel",
      relationship: "Mother",
      primaryPhone: "+91 98765 43211",
      primaryEmail: "sunita.patel@example.com",
      studentName: "Ananya Patel",
      studentRoll: "STU-2026-002",
    },
  ]);

  return (
    <div className="space-y-6">
      <SharedDataEntryHeader
        title="Parents & Guardians Directory"
        description="Parent contact details, emergency communications, and child mapping."
        moduleId="guardians"
        entityName="Guardian"
        onAddNew={() => alert("Create Guardian Dialog")}
        onImportSuccess={() => alert("Guardians imported successfully!")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Guardians" value={String(guardians.length)} change="Registered" trend="neutral" icon="👨‍👩‍👧" color="#3B82F6" />
        <StatCard title="Emergency Verified" value="100%" change="SMS enabled" trend="up" icon="📱" color="#10B981" />
        <StatCard title="Linked Students" value={String(guardians.length)} change="Active students" trend="neutral" icon="👨‍🎓" color="#F59E0B" />
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
              <th className="p-3">Guardian Name</th>
              <th className="p-3">Relationship</th>
              <th className="p-3">Contact Phone</th>
              <th className="p-3">Email Address</th>
              <th className="p-3">Associated Student</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {guardians.map((g) => (
              <tr key={g.id} className="hover:bg-surface/50 transition">
                <td className="p-3 font-bold text-text-primary text-sm">{g.name}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-text-secondary">
                    {g.relationship}
                  </span>
                </td>
                <td className="p-3 font-mono font-semibold text-text-primary flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {g.primaryPhone}
                </td>
                <td className="p-3 text-text-secondary">{g.primaryEmail || "—"}</td>
                <td className="p-3">
                  <div className="font-semibold text-text-primary">{g.studentName}</div>
                  <div className="text-[10px] text-text-secondary font-mono">{g.studentRoll}</div>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => alert(`Edit ${g.name}`)}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition"
                    title="Edit Guardian"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

