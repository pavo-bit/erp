"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useExams, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function ExamsPage() {
  const { data: raw, isLoading } = useExams();
  const exams = Array.isArray(raw) ? raw : raw?.data || [];
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", class: "", session: "2025-26", startDate: "", endDate: "" });

  const published = exams.filter((e: Record<string, boolean>) => e.isPublished).length;
  const draft = exams.filter((e: Record<string, boolean>) => !e.isPublished).length;

  const handleCreate = async () => {
    try {
      await apiCall("/api/exams", "POST", form);
      invalidateAll("/api/exams");
      setShowCreate(false);
      setForm({ name: "", class: "", session: "2025-26", startDate: "", endDate: "" });
    } catch (e) { alert((e as Error).message); }
  };

  const togglePublish = async (id: string, current: boolean) => {
    try {
      await apiCall(`/api/exams/${id}`, "PUT", { isPublished: !current });
      invalidateAll("/api/exams");
    } catch (e) { alert((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Examination Management" subtitle="Create exams, manage marks entry, and generate report cards"
        action={
          <button onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">
            + Create Exam
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📝" label="Total Exams" value={String(exams.length)} color="#3B82F6" />
        <StatCard icon="✅" label="Published" value={String(published)} color="#10B981" />
        <StatCard icon="📋" label="Drafts" value={String(draft)} color="#F59E0B" />
        <StatCard icon="📊" label="Results Entered" value={String(exams.reduce((s: number, e: Record<string, Record<string, number>>) => s + (e._count?.results || 0), 0))} color="#8B5CF6" />
      </div>

      {/* Create Form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-white rounded-2xl border border-border p-6 mb-6">
          <h3 className="text-[15px] font-semibold mb-4 font-[var(--font-heading)]">Create New Exam</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input placeholder="Exam Name (e.g. Half Yearly)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            <input placeholder="Class (e.g. IX)" value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            <input placeholder="Session" value={form.session} onChange={e => setForm({ ...form, session: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            <input type="date" placeholder="Start Date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            <input type="date" placeholder="End Date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            <button onClick={handleCreate}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold border-none cursor-pointer hover:bg-primary/90 transition-all">
              Create Exam
            </button>
          </div>
        </motion.div>
      )}

      {/* Exams List */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : exams.length === 0 ? (
          <p className="text-[13px] text-text-secondary text-center py-12">No exams created yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Exam Name", "Class", "Session", "Start", "End", "Results", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exams.map((e: Record<string, unknown>) => {
                  const count = (e._count as Record<string, number>)?.results || 0;
                  return (
                    <tr key={e.id as string} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-text-primary">{e.name as string}</td>
                      <td className="px-5 py-3.5 text-[13px] text-text-primary">{e.class as string}</td>
                      <td className="px-5 py-3.5 text-[12px] text-text-secondary">{e.session as string}</td>
                      <td className="px-5 py-3.5 text-[12px] text-text-secondary">
                        {e.startDate ? new Date(e.startDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-text-secondary">
                        {e.endDate ? new Date(e.endDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-text-primary">{count}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={e.isPublished ? "Published" : "Draft"} color={e.isPublished ? "#10B981" : "#F59E0B"} />
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => togglePublish(e.id as string, e.isPublished as boolean)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border-none cursor-pointer transition-colors
                            ${e.isPublished ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                          {e.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </>
  );
}
