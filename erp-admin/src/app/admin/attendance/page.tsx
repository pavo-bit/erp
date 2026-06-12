"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useAttendance, useTeacherAttendance } from "@/lib/api-hooks";

export default function AttendancePage() {
  const [tab, setTab] = useState<"students" | "teachers">("students");
  const { data: studentRaw, isLoading: loadingStudents } = useAttendance();
  const { data: teacherRaw, isLoading: loadingTeachers } = useTeacherAttendance();

  const studentAttendance = Array.isArray(studentRaw) ? studentRaw : studentRaw?.data || [];
  const teacherAttendance = Array.isArray(teacherRaw) ? teacherRaw : teacherRaw?.data || [];

  const sPresent = studentAttendance.filter((a: Record<string, string>) => a.status === "PRESENT").length;
  const sAbsent = studentAttendance.filter((a: Record<string, string>) => a.status === "ABSENT").length;
  const sLate = studentAttendance.filter((a: Record<string, string>) => a.status === "LATE").length;
  const sTotal = studentAttendance.length;
  const sRate = sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : 0;

  const tPresent = teacherAttendance.filter((a: Record<string, string>) => a.status === "PRESENT").length;
  const tAbsent = teacherAttendance.filter((a: Record<string, string>) => a.status === "ABSENT").length;

  const statusColors: Record<string, string> = { PRESENT: "#10B981", ABSENT: "#EF4444", LATE: "#F59E0B", HOLIDAY: "#3B82F6" };

  return (
    <>
      <PageHeader 
        title="Attendance Management" 
        subtitle="Monitor student and teacher attendance" 
        action={
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">
            + Mark Attendance
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="✅" label="Present (Students)" value={String(sPresent)} color="#10B981" />
        <StatCard icon="❌" label="Absent (Students)" value={String(sAbsent)} color="#EF4444" />
        <StatCard icon="⏰" label="Late (Students)" value={String(sLate)} color="#F59E0B" />
        <StatCard icon="📊" label="Attendance Rate" value={`${sRate}%`} color="#3B82F6" />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        {(["students", "teachers"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-all font-[var(--font-heading)] capitalize
              ${tab === t ? "bg-primary text-white shadow-md" : "bg-white text-text-secondary hover:bg-surface"}`}
          >{t} Attendance</button>
        ))}
      </div>

      {tab === "students" ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
          {loadingStudents ? (
            <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
          ) : studentAttendance.length === 0 ? (
            <p className="text-[13px] text-text-secondary text-center py-12">No attendance records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Student", "Roll No", "Class", "Date", "Status", "Marked By"].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentAttendance.slice(0, 30).map((a: Record<string, unknown>) => {
                    const student = a.student as Record<string, string> || {};
                    const marker = a.markedBy as Record<string, unknown>;
                    const markerUser = marker?.user as Record<string, string>;
                    return (
                      <tr key={a.id as string} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-text-primary">{student.name || "—"}</td>
                        <td className="px-5 py-3.5 text-[12px] text-text-secondary">{student.rollNo || "—"}</td>
                        <td className="px-5 py-3.5 text-[13px] text-text-primary">{student.class}-{student.section}</td>
                        <td className="px-5 py-3.5 text-[12px] text-text-secondary">
                          {new Date(a.date as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={a.status as string} color={statusColors[a.status as string] || "#666"} /></td>
                        <td className="px-5 py-3.5 text-[12px] text-text-secondary">{markerUser?.name || "Admin"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-[15px] font-semibold font-[var(--font-heading)]">Teacher Attendance</h3>
            <div className="flex gap-3 text-[12px]">
              <span className="text-green-600 font-semibold">Present: {tPresent}</span>
              <span className="text-red-600 font-semibold">Absent: {tAbsent}</span>
            </div>
          </div>
          {loadingTeachers ? (
            <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
          ) : teacherAttendance.length === 0 ? (
            <p className="text-[13px] text-text-secondary text-center py-12">No teacher attendance records</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Teacher", "Date", "Status"].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teacherAttendance.slice(0, 30).map((a: Record<string, unknown>) => {
                    const teacher = a.teacher as Record<string, unknown> || {};
                    const user = teacher?.user as Record<string, string> || {};
                    return (
                      <tr key={a.id as string} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-text-primary">{user.name || "—"}</td>
                        <td className="px-5 py-3.5 text-[12px] text-text-secondary">
                          {new Date(a.date as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={a.status as string} color={statusColors[a.status as string] || "#666"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
