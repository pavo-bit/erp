"use client";

import React, { useState } from "react";
import { SharedDataEntryHeader } from "@/components/import/SharedDataEntryHeader";
import { StatCard, StatusBadge } from "@/components/DashboardLayout";
import { BookOpen, Edit2 } from "lucide-react";

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  type: "THEORY" | "PRACTICAL" | "BOTH";
  credits?: number;
}

export default function CurriculumSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([
    { id: "sub1", code: "ENG-101", name: "English Literature", type: "THEORY", credits: 4 },
    { id: "sub2", code: "MAT-101", name: "Mathematics", type: "THEORY", credits: 5 },
    { id: "sub3", code: "SCI-101", name: "General Science & Physics", type: "BOTH", credits: 4 },
    { id: "sub4", code: "CMP-101", name: "Computer Science & Lab", type: "PRACTICAL", credits: 3 },
  ]);

  return (
    <div className="space-y-6">
      <SharedDataEntryHeader
        title="Curriculum & Subjects"
        description="Master catalog of institutional academic courses, subject codes, and credit hours."
        moduleId="subjects"
        entityName="Subject"
        onAddNew={() => alert("Create Subject Dialog")}
        onImportSuccess={() => alert("Subjects imported successfully!")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Subjects" value={String(subjects.length)} change="Catalog" trend="neutral" icon="📖" color="#3B82F6" />
        <StatCard title="Theory Courses" value={String(subjects.filter((s) => s.type === "THEORY").length)} change="Core" trend="neutral" icon="📝" color="#10B981" />
        <StatCard title="Practical / Labs" value={String(subjects.filter((s) => s.type === "PRACTICAL" || s.type === "BOTH").length)} change="Lab sessions" trend="neutral" icon="🔬" color="#F59E0B" />
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
              <th className="p-3">Subject Code</th>
              <th className="p-3">Subject Name</th>
              <th className="p-3">Course Type</th>
              <th className="p-3">Credits</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subjects.map((sub) => (
              <tr key={sub.id} className="hover:bg-surface/50 transition">
                <td className="p-3 font-mono font-bold text-text-primary text-sm">{sub.code}</td>
                <td className="p-3 font-semibold text-text-primary">{sub.name}</td>
                <td className="p-3">
                  <StatusBadge
                    status={sub.type}
                    color={sub.type === "THEORY" ? "#3B82F6" : sub.type === "PRACTICAL" ? "#10B981" : "#8B5CF6"}
                  />
                </td>
                <td className="p-3 text-text-secondary font-mono">{sub.credits || "—"}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => alert(`Edit ${sub.code}`)}
                    className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition"
                    title="Edit Subject"
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

