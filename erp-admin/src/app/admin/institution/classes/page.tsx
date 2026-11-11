"use client";

import React, { useState, useEffect } from "react";
import { SharedDataEntryHeader } from "@/components/import/SharedDataEntryHeader";
import { StatCard, StatusBadge } from "@/components/DashboardLayout";
import { Users, BookOpen, Layers, Plus, Edit2, Trash2 } from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  sortOrder: number;
  sections: Array<{ id: string; name: string; capacity: number }>;
  studentCount?: number;
}

export default function ClassesSectionsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([
    {
      id: "c1",
      name: "Class 10",
      sortOrder: 10,
      sections: [
        { id: "s1", name: "A", capacity: 40 },
        { id: "s2", name: "B", capacity: 40 },
      ],
      studentCount: 78,
    },
    {
      id: "c2",
      name: "Class 9",
      sortOrder: 9,
      sections: [
        { id: "s3", name: "A", capacity: 40 },
        { id: "s4", name: "B", capacity: 40 },
      ],
      studentCount: 72,
    },
    {
      id: "c3",
      name: "Class 8",
      sortOrder: 8,
      sections: [{ id: "s5", name: "A", capacity: 40 }],
      studentCount: 36,
    },
  ]);

  return (
    <div className="space-y-6">
      <SharedDataEntryHeader
        title="Classes, Sections & Standards"
        description="Configure institutional academic class structures, section capacities, and grade levels."
        moduleId="classes"
        entityName="Class"
        onAddNew={() => alert("Class creation form.")}
        onImportSuccess={() => alert("Classes successfully imported!")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Classes" value={String(classes.length)} change="Active standards" trend="neutral" icon="🏷️" color="#3B82F6" />
        <StatCard
          title="Total Sections"
          value={String(classes.reduce((acc, c) => acc + c.sections.length, 0))}
          change="Classrooms"
          trend="neutral"
          icon="📐"
          color="#10B981"
        />
        <StatCard
          title="Total Capacity"
          value={String(classes.reduce((acc, c) => acc + c.sections.reduce((a, s) => a + s.capacity, 0), 0))}
          change="Available seats"
          trend="up"
          icon="🪑"
          color="#F59E0B"
        />
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
              <th className="p-3">Class / Standard</th>
              <th className="p-3">Sections</th>
              <th className="p-3">Enrolled Students</th>
              <th className="p-3">Total Capacity</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {classes.map((c) => {
              const totalCap = c.sections.reduce((acc, s) => acc + s.capacity, 0);
              return (
                <tr key={c.id} className="hover:bg-surface/50 transition">
                  <td className="p-3 font-bold text-text-primary text-sm">{c.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.sections.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 bg-surface border border-border rounded font-mono font-semibold text-text-primary"
                        >
                          Sec {s.name} ({s.capacity})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-text-primary">{c.studentCount || 0} Students</td>
                  <td className="p-3 text-text-secondary">{totalCap} Seats</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => alert(`Edit ${c.name}`)}
                      className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition"
                      title="Edit Class"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

