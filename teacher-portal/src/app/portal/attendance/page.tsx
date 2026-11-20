"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, Clock, Save, Users, AlertCircle } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { apiCall } from "@/lib/api-hooks";

interface StudentRecord {
  id: string;
  roll: string;
  name: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  remarks?: string;
}

const INITIAL_ROSTER: StudentRecord[] = [
  { id: "1", roll: "101", name: "Aarav Sharma", status: "PRESENT" },
  { id: "2", roll: "102", name: "Diya Patel", status: "PRESENT" },
  { id: "3", roll: "103", name: "Rohan Gupta", status: "ABSENT", remarks: "Medical leave" },
  { id: "4", roll: "104", name: "Sneha Reddy", status: "LATE", remarks: "School bus delayed" },
  { id: "5", roll: "105", name: "Arjun Singh", status: "PRESENT" },
  { id: "6", roll: "106", name: "Ananya Mishra", status: "PRESENT" },
  { id: "7", roll: "107", name: "Vikram Das", status: "PRESENT" },
  { id: "8", roll: "108", name: "Pooja Verma", status: "ABSENT" },
];

export default function TeacherAttendancePage() {
  const [selectedClass, setSelectedClass] = useState("10");
  const [selectedSection, setSelectedSection] = useState("A");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_ROSTER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setStatus = (id: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const markAll = (status: "PRESENT" | "ABSENT") => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: s.status,
        remarks: s.remarks || null,
      }));
      await apiCall("/api/v1/attendance", "POST", {
        sectionId: `${selectedClass}-${selectedSection}`,
        date,
        records,
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit attendance records");
    } finally {
      setIsSubmitting(false);
    }
  };

  const presentCount = students.filter((s) => s.status === "PRESENT").length;
  const absentCount = students.filter((s) => s.status === "ABSENT").length;
  const lateCount = students.filter((s) => s.status === "LATE").length;
  const attendanceRate = Math.round((presentCount / students.length) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Daily Roll Call & Attendance"
        subtitle="Mark classroom attendance for assigned sections. Attendance records sync with the parent portal in real time."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll("PRESENT")}
            >
              Mark All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll("ABSENT")}
            >
              Mark All Absent
            </Button>
          </div>
        }
      />

      {/* Class & Date Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
              <option value="11">Class 11</option>
              <option value="12">Class 12</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            icon={<Save className="w-4 h-4" />}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Submit Roll Call
          </Button>
        </div>
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-[14px] font-bold">Submission Failed</p>
              <p className="text-[12px] text-rose-700">{submitError}</p>
            </div>
          </div>
          <button
            onClick={() => setSubmitError(null)}
            className="text-[12px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {submitted && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[14px] font-bold">Attendance Submitted Successfully</p>
              <p className="text-[12px] text-emerald-700">
                Class {selectedClass}-{selectedSection} roll call for {date} has been recorded ({presentCount} present, {absentCount} absent, {lateCount} late).
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="text-[12px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[12px] font-semibold text-slate-500 uppercase">Enrolled</span>
          <div className="text-[24px] font-bold text-slate-900 mt-1">{students.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[12px] font-semibold text-emerald-700 uppercase">Present</span>
          <div className="text-[24px] font-bold text-emerald-700 mt-1">{presentCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[12px] font-semibold text-rose-700 uppercase">Absent</span>
          <div className="text-[24px] font-bold text-rose-700 mt-1">{absentCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[12px] font-semibold text-amber-700 uppercase">Attendance Rate</span>
          <div className="text-[24px] font-bold text-amber-700 mt-1">{attendanceRate}%</div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <span className="text-[14px] font-bold text-slate-800">
            Student Roster (Class {selectedClass}-{selectedSection})
          </span>
          <span className="text-[12px] text-slate-500">
            Click status pill to toggle Present / Absent / Late
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/30 text-[12px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Roll No</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Attendance Status</th>
                <th className="px-6 py-3.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors h-[56px]">
                  <td className="px-6 py-3 font-mono font-bold text-slate-700">
                    {student.roll}
                  </td>
                  <td className="px-6 py-3 font-semibold text-slate-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-3">
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, "PRESENT")}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold cursor-pointer transition-all ${
                          student.status === "PRESENT"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, "ABSENT")}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold cursor-pointer transition-all ${
                          student.status === "ABSENT"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, "LATE")}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold cursor-pointer transition-all ${
                          student.status === "LATE"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Late
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[13px] text-slate-500">
                    {student.remarks || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
