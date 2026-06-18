"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { useFaculty, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function FacultyPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fName, setFName] = useState("");
  const [fDesig, setFDesig] = useState("");
  const [fDept, setFDept] = useState("");
  const [fQual, setFQual] = useState("");
  const [fPhoto, setFPhoto] = useState<File | null>(null);

  const { data: raw, isLoading } = useFaculty();
  const faculty = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", fName);
      formData.append("designation", fDesig);
      formData.append("department", fDept);
      if (fQual) formData.append("qualification", fQual);
      if (fPhoto) formData.append("photo", fPhoto);

      await apiCall("/api/v1/faculty", "POST", formData);
      invalidateAll("/api/v1/faculty"); setShowModal(false);
      setFName(""); setFDesig(""); setFDept(""); setFQual(""); setFPhoto(null);
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this faculty member?")) return;
    try { await apiCall(`/api/v1/faculty/${id}`, "DELETE"); invalidateAll("/api/v1/faculty"); }
    catch (err) { alert((err as Error).message); }
  };

  const deptColors: Record<string, string> = { 
    "Acharya": "#FF6B00", 
    "Acharyaa": "#3B82F6", 
    "Sebaka/Sebika": "#10B981",
    "Administration": "#FF6B00", "Mathematics": "#3B82F6", "English & Social Science": "#8B5CF6", "Science": "#10B981", "Computer Science": "#F59E0B", "Hindi": "#EF4444" 
  };

  return (
    <>
      <PageHeader title="Faculty Management" subtitle="Manage teaching and administrative staff"
        action={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">+ Add Faculty</button>} />
      {isLoading ? <div className="bg-white rounded-2xl border border-border p-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {faculty.map((f: Record<string, unknown>, i: number) => (
            <motion.div key={f.id as string} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] bg-gradient-to-br from-primary/10 to-primary/5">👨‍🏫</div>
                <StatusBadge status={f.department as string} color={deptColors[f.department as string] || "#6B7280"} />
              </div>
              <h4 className="text-[15px] font-semibold text-text-primary font-[var(--font-heading)] mb-1">{f.name as string}</h4>
              <p className="text-[12px] text-primary font-semibold mb-2">{f.designation as string}</p>
              <div className="flex flex-col gap-1 text-[12px] text-text-secondary mb-4">
                {f.qualification ? <span>🎓 {f.qualification as string}</span> : null}
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id as string); }} className="text-[12px] text-danger font-semibold bg-transparent border-none cursor-pointer font-[var(--font-heading)]">Remove</button>
            </motion.div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {showModal && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[520px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold font-[var(--font-heading)]">Add Faculty</h3>
              <button onClick={() => setShowModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Full Name" required className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={fDesig} onChange={(e) => setFDesig(e.target.value)} placeholder="Designation" required className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                <select value={fDept} onChange={(e) => setFDept(e.target.value)} required className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary bg-white cursor-pointer">
                  <option value="" disabled>Select Category</option>
                  <option value="Acharya">Acharya (ଆଚାର୍ଯ୍ୟ)</option>
                  <option value="Acharyaa">Acharyaa (ଆଚାର୍ଯ୍ୟା)</option>
                  <option value="Sebaka/Sebika">Sebaka/Sebika (ସେବକ/ସେବିକା)</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input type="text" value={fQual} onChange={(e) => setFQual(e.target.value)} placeholder="Qualification (e.g. M.A, B.Ed)" className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold text-text-secondary">Faculty Photo (Optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setFPhoto(e.target.files?.[0] || null)} className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50 mt-1">{saving ? "Adding..." : "Add Faculty"}</button>
            </form>
          </motion.div>
        </>)}
      </AnimatePresence>
    </>
  );
}
