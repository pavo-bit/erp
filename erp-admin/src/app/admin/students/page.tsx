"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useStudents, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function StudentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "", rollNo: "", class: "10", section: "A", session: "2025-26",
    guardianName: "", guardianPhone: ""
  });

  const { data: raw, isLoading } = useStudents();
  const students = Array.isArray(raw) ? raw : raw?.data || [];

  const totalStudents = students.length;
  const classes = [...new Set(students.map((s: Record<string, string>) => s.class).filter(Boolean))];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCall("/api/students", "POST", formData);
      invalidateAll("/api/students");
      setShowModal(false);
      setFormData({ name: "", rollNo: "", class: "10", section: "A", session: "2025-26", guardianName: "", guardianPhone: "" });
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    try { await apiCall(`/api/students/${id}`, "DELETE"); invalidateAll("/api/students"); }
    catch (err) { alert((err as Error).message); }
  };

  return (
    <>
      <PageHeader 
        title="Student Directory" 
        subtitle="Manage student records, classes, and sections" 
        action={
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">
            + Add Student
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👨‍🎓" label="Total Students" value={String(totalStudents)} color="#3B82F6" />
        <StatCard icon="🏫" label="Classes" value={String(classes.length)} color="#10B981" />
        <StatCard icon="✅" label="Active" value={String(students.filter((s: Record<string, boolean>) => s.isActive).length)} color="#8B5CF6" />
        <StatCard icon="📅" label="Current Session" value="2025-26" color="#F59E0B" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Roll No", "Name", "Class & Section", "Guardian", "Contact", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s: Record<string, unknown>) => (
                  <tr key={s.id as string} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-text-secondary">{s.rollNo as string}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[14px] font-bold text-blue-600">
                          {((s.name as string) || "?")[0]}
                        </div>
                        <span className="text-[13px] font-semibold text-text-primary">{s.name as string}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[11px] font-semibold font-[var(--font-heading)]">
                        Class {s.class as string} - {s.section as string}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-text-primary">{s.guardianName as string || "—"}</td>
                    <td className="px-5 py-3.5 text-[13px] text-text-secondary">{s.guardianPhone as string || "—"}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.isActive ? "Active" : "Inactive"} color={s.isActive ? "#10B981" : "#EF4444"} />
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleDelete(s.id as string)} className="text-[12px] text-danger hover:underline bg-transparent border-none cursor-pointer">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[500px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[20px] font-bold font-[var(--font-heading)]">Add Student</h3>
                <button onClick={() => setShowModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
              </div>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                  <input type="text" placeholder="Roll No" required value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Class (e.g. 10)" required value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                  <input type="text" placeholder="Section (e.g. A)" required value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                </div>
                <input type="text" placeholder="Guardian Name" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                <input type="text" placeholder="Guardian Phone" value={formData.guardianPhone} onChange={e => setFormData({...formData, guardianPhone: e.target.value})} className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                
                <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] mt-2 disabled:opacity-50">
                  {saving ? "Saving..." : "Add Student"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
