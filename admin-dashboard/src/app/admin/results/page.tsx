"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, DataTable, StatusBadge } from "@/components/DashboardLayout";
import { useResults, useStudents, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function ResultsPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formStudentId, setFormStudentId] = useState("");
  const [formExam, setFormExam] = useState("Unit Test 1");
  const [formSubject, setFormSubject] = useState("");
  const [formTotal, setFormTotal] = useState("100");
  const [formObtained, setFormObtained] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [filterExam, setFilterExam] = useState("");

  const params = new URLSearchParams({ limit: "50" });
  if (filterExam) params.set("examName", filterExam);
  const { data: raw, isLoading } = useResults(params.toString());
  const results = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const { data: studRaw } = useStudents("limit=100");
  const students = Array.isArray(studRaw) ? studRaw : studRaw?.data || studRaw || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiCall("/api/results", "POST", { studentId: formStudentId, examName: formExam, subject: formSubject, totalMarks: +formTotal, obtained: +formObtained, grade: formGrade || null });
      invalidateAll("/api/results"); setShowModal(false);
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const gc = (g: string) => g?.includes("++") ? "#10B981" : g?.includes("+") ? "#3B82F6" : g === "A" ? "#8B5CF6" : "#F59E0B";

  return (
    <>
      <PageHeader title="Results Management" subtitle="Publish and manage student exam results"
        action={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">+ Add Result</button>} />
      <div className="flex gap-2 mb-6 flex-wrap">
        {["", "Unit Test 1", "Half Yearly", "Annual Exam"].map((f) => (
          <button key={f} onClick={() => setFilterExam(f)} className={`px-4 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer font-[var(--font-heading)] transition-all ${filterExam === f ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:border-primary"}`}>{f || "All Exams"}</button>
        ))}
      </div>
      {isLoading ? <div className="bg-white rounded-2xl border border-border p-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <DataTable headers={["Student", "Exam", "Subject", "Marks", "Grade"]}
          rows={results.map((r: Record<string, unknown>) => {
            const stu = r.student as Record<string, unknown>; const u = stu?.user as Record<string, string>;
            return [ <span key="n" className="font-medium font-[var(--font-heading)]">{u?.name || "—"}</span>, <StatusBadge key="e" status={r.examName as string} color="#3B82F6" />, r.subject as string,
              <span key="m" className="font-semibold">{r.obtained as number}/{r.totalMarks as number}</span>, <StatusBadge key="g" status={r.grade as string || "—"} color={gc(r.grade as string)} /> ];
          })} />
      )}
      <AnimatePresence>
        {showModal && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[520px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold font-[var(--font-heading)]">Add Result</h3>
              <button onClick={() => setShowModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <select value={formStudentId} onChange={(e) => setFormStudentId(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary bg-white">
                <option value="">Select Student</option>
                {students.map((s: Record<string, unknown>) => { 
                  const u = s.user as Record<string, string>; 
                  const displayName = `${u?.name || 'Unknown'} (${s.class} ${s.section})`;
                  return <option key={s.id as string} value={s.id as string}>{displayName}</option>;
                })}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={formExam} onChange={(e) => setFormExam(e.target.value)} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary bg-white">
                  <option>Unit Test 1</option><option>Unit Test 2</option><option>Half Yearly</option><option>Annual Exam</option>
                </select>
                <input type="text" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="Subject" required className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" value={formTotal} onChange={(e) => setFormTotal(e.target.value)} placeholder="Total" required className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                <input type="number" value={formObtained} onChange={(e) => setFormObtained(e.target.value)} placeholder="Obtained" required className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                <input type="text" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} placeholder="Grade" className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">{saving ? "Saving..." : "Add Result"}</button>
            </form>
          </motion.div>
        </>)}
      </AnimatePresence>
    </>
  );
}
