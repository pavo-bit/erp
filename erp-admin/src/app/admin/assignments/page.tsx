"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, DataTable, StatusBadge } from "@/components/DashboardLayout";
import { useAssignments, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function AssignmentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fClass, setFClass] = useState("IX");
  const [fDesc, setFDesc] = useState("");
  const [fDue, setFDue] = useState("");

  const { data: raw, isLoading } = useAssignments("limit=50");
  const assignments = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiCall("/api/assignments", "POST", { title: fTitle, subject: fSubject, class: fClass, description: fDesc, dueDate: fDue });
      invalidateAll("/api/assignments"); setShowModal(false);
      setFTitle(""); setFSubject(""); setFDesc(""); setFDue("");
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader title="Assignment Management" subtitle="Create and track student assignments"
        action={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">+ New Assignment</button>} />
      {isLoading ? <div className="bg-white rounded-2xl border border-border p-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <DataTable headers={["Title", "Subject", "Class", "Due Date", "Submissions"]}
          rows={assignments.map((a: Record<string, unknown>) => {
            const subs = (a.submissions as Record<string, unknown>[]) || [];
            const submitted = subs.filter((s) => s.status !== "PENDING").length;
            return [
              <span key="t" className="font-medium font-[var(--font-heading)]">{a.title as string}</span>,
              <StatusBadge key="s" status={a.subject as string} color="#3B82F6" />,
              <StatusBadge key="c" status={a.class as string} color="#8B5CF6" />,
              new Date(a.dueDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
              <span key="sub" className="text-[12px] font-semibold font-[var(--font-heading)]">{submitted}/{subs.length}</span>,
            ];
          })} />
      )}
      <AnimatePresence>
        {showModal && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[520px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold font-[var(--font-heading)]">New Assignment</h3>
              <button onClick={() => setShowModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Assignment title" required className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              <div className="grid grid-cols-3 gap-3">
                <input type="text" value={fSubject} onChange={(e) => setFSubject(e.target.value)} placeholder="Subject" required className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                <select value={fClass} onChange={(e) => setFClass(e.target.value)} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary bg-white">
                  {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input type="date" value={fDue} onChange={(e) => setFDue(e.target.value)} required className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              </div>
              <textarea rows={3} value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary resize-none" />
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">{saving ? "Creating..." : "Create Assignment"}</button>
            </form>
          </motion.div>
        </>)}
      </AnimatePresence>
    </>
  );
}
