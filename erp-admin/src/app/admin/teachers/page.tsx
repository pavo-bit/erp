"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useTeachers, apiCall, invalidateAll } from "@/lib/api-hooks";

// Helper function to calculate dynamic experience
function calculateDynamicExperience(pastExperienceStr: string, joiningDateStr?: string) {
  let pastExpYears = parseFloat(pastExperienceStr) || 0;
  let dynamicYears = 0;

  if (joiningDateStr) {
    const joiningDate = new Date(joiningDateStr);
    const now = new Date();
    // Calculate difference in milliseconds, then convert to years
    const diffMs = now.getTime() - joiningDate.getTime();
    dynamicYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  }

  const totalExperience = (pastExpYears + dynamicYears).toFixed(1);
  return `${totalExperience} Years`;
}

export default function TeachersPage() {
  const { data: raw, isLoading } = useTeachers();
  const teachers = Array.isArray(raw) ? raw : raw?.data || [];

  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const totalTeachers = teachers.length;
  const departments = [...new Set(teachers.map((t: any) => t.department).filter(Boolean))];

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to remove/deactivate this teacher? They will no longer be able to log in.")) return;
    
    setIsDeactivating(true);
    try {
      await apiCall(`/api/v1/teachers/${id}`, "DELETE");
      alert("Teacher deactivated successfully!");
      setSelectedTeacher(null);
      invalidateAll("/api/v1/teachers"); // refresh data
    } catch (e: any) {
      alert(e.message || "Failed to deactivate teacher");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <PageHeader 
        title="Teacher Management" 
        subtitle="Manage faculty profiles, departments, and assignments" 
        action={
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">
            + Add Teacher
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👨‍🏫" label="Total Teachers" value={String(totalTeachers)} color="#3B82F6" />
        <StatCard icon="🏢" label="Departments" value={String(departments.length)} color="#10B981" />
        <StatCard icon="✅" label="Active" value={String(teachers.filter((t: any) => t.isActive).length)} color="#8B5CF6" />
        <StatCard icon="📚" label="Subjects Covered" value={String(new Set(teachers.flatMap((t: any) => typeof t.subjects === "string" ? t.subjects.split(",").filter(Boolean) : (t.subjects || []))).size)} color="#F59E0B" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Email", "Department", "Designation", "Subjects", "Experience", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map((t: any) => {
                  const user = t.user || {};
                  return (
                    <tr key={t.id} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[14px] font-bold text-blue-600">
                            {(user.name || "?")[0]}
                          </div>
                          <span className="text-[13px] font-semibold text-text-primary">{user.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-text-secondary">{user.email || "—"}</td>
                      <td className="px-5 py-3.5 text-[13px] text-text-primary">{t.department || "—"}</td>
                      <td className="px-5 py-3.5 text-[13px] text-text-primary">{t.designation || "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {(typeof t.subjects === "string" ? t.subjects.split(",").filter(Boolean) : (t.subjects || [])).map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-semibold">{s.trim()}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-blue-600 bg-blue-50/30 rounded-lg">
                        {calculateDynamicExperience(t.experience || "0", t.joiningDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.isActive ? "Active" : "Inactive"} color={t.isActive ? "#10B981" : "#EF4444"} />
                      </td>
                      <td className="px-5 py-3.5">
                        <button 
                          onClick={() => setSelectedTeacher(t)} 
                          className="px-3 py-1.5 bg-surface border border-border text-text-primary text-[12px] font-semibold rounded-md hover:bg-border transition cursor-pointer"
                        >
                          View Profile
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

      {/* Teacher Profile Modal */}
      <AnimatePresence>
        {selectedTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-border"
            >
              <div className="p-6 border-b border-border flex justify-between items-start bg-surface">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-[24px] font-bold text-blue-600 shadow-sm border border-blue-200">
                    {(selectedTeacher.user?.name || "?")[0]}
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold text-text-primary font-[var(--font-heading)]">{selectedTeacher.user?.name}</h3>
                    <p className="text-[13px] text-text-secondary">{selectedTeacher.designation || "Teacher"} • {selectedTeacher.department}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTeacher(null)} className="text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer text-xl">✕</button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface p-3 rounded-xl border border-border">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Email ID</span>
                    <span className="text-[13px] text-text-primary font-medium">{selectedTeacher.user?.email}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-border">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Phone No</span>
                    <span className="text-[13px] text-text-primary font-medium">{selectedTeacher.user?.phone || "N/A"}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-border">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Total Experience</span>
                    <span className="text-[13px] text-text-primary font-medium">{calculateDynamicExperience(selectedTeacher.experience || "0", selectedTeacher.joiningDate)}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-border">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Qualification</span>
                    <span className="text-[13px] text-text-primary font-medium">{selectedTeacher.qualification || "N/A"}</span>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-border col-span-2">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">Subjects Handled</span>
                    <span className="text-[13px] text-text-primary font-medium">{selectedTeacher.subjects || "N/A"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end gap-3">
                  <button onClick={() => setSelectedTeacher(null)} className="px-4 py-2 border border-border text-text-primary bg-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-surface">Close</button>
                  {selectedTeacher.isActive && (
                    <button 
                      onClick={() => handleDeactivate(selectedTeacher.id)} 
                      disabled={isDeactivating}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold cursor-pointer hover:bg-red-100 disabled:opacity-50"
                    >
                      {isDeactivating ? "Removing..." : "Remove / Deactivate"}
                    </button>
                  )}
                  {!selectedTeacher.isActive && (
                    <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-semibold">Deactivated</span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
