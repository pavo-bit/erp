"use client";

import { motion } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useTeachers } from "@/lib/api-hooks";

export default function TeachersPage() {
  const { data: raw, isLoading } = useTeachers();
  const teachers = Array.isArray(raw) ? raw : raw?.data || [];

  const totalTeachers = teachers.length;
  const departments = [...new Set(teachers.map((t: Record<string, string>) => t.department).filter(Boolean))];

  return (
    <>
      <PageHeader title="Teacher Management" subtitle="Manage faculty profiles, departments, and assignments" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👨‍🏫" label="Total Teachers" value={String(totalTeachers)} color="#3B82F6" />
        <StatCard icon="🏢" label="Departments" value={String(departments.length)} color="#10B981" />
        <StatCard icon="✅" label="Active" value={String(teachers.filter((t: Record<string, boolean>) => t.isActive).length)} color="#8B5CF6" />
        <StatCard icon="📚" label="Subjects Covered" value={String(new Set(teachers.flatMap((t: Record<string, string[]>) => t.subjects || [])).size)} color="#F59E0B" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Email", "Department", "Designation", "Subjects", "Experience", "Status"].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map((t: Record<string, unknown>) => {
                  const user = t.user as Record<string, string> || {};
                  return (
                    <tr key={t.id as string} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[14px] font-bold text-blue-600">
                            {(user.name || "?")[0]}
                          </div>
                          <span className="text-[13px] font-semibold text-text-primary">{user.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-text-secondary">{user.email || "—"}</td>
                      <td className="px-5 py-3.5 text-[13px] text-text-primary">{t.department as string || "—"}</td>
                      <td className="px-5 py-3.5 text-[13px] text-text-primary">{t.designation as string || "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {((t.subjects as string[]) || []).map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-semibold">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-text-secondary">{t.experience as string || "—"}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.isActive ? "Active" : "Inactive"} color={t.isActive ? "#10B981" : "#EF4444"} />
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
