"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiCall, invalidateAll } from "@/lib/api-hooks";
import { toast } from "@/lib/toast";
import { X, Upload, ArrowRight, Check } from "lucide-react";

export type ModalType =
  | "NONE"
  | "NEW_ADMISSION"
  | "ADD_STUDENT"
  | "RECORD_FEE"
  | "MARK_ATTENDANCE"
  | "CREATE_EXAM"
  | "ADD_TEACHER"
  | "SEND_NOTICE";

interface Props {
  isOpen: ModalType;
  onClose: () => void;
}

export function QuickActionModals({ isOpen, onClose }: Props) {
  const [saving, setSaving] = useState(false);

  // States for specific single-entry forms
  const [studentForm, setStudentForm] = useState({
    name: "",
    rollNo: "1",
    class: "10",
    section: "A",
    guardianName: "",
    guardianPhone: "",
  });
  const [feeForm, setFeeForm] = useState({
    studentId: "",
    amount: "",
    type: "MONTHLY",
    dueDate: new Date().toISOString().split("T")[0],
  });
  const [examForm, setExamForm] = useState({
    name: "",
    class: "10",
    session: "2026-2027",
    startDate: "",
    endDate: "",
  });
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    department: "Academics",
    designation: "Teacher",
  });
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    category: "General",
  });
  const [attendanceForm, setAttendanceForm] = useState({
    class: "10",
    date: new Date().toISOString().split("T")[0],
  });
  const [admissionForm, setAdmissionForm] = useState({
    applicantName: "",
    applyingForClass: "10",
    parentName: "",
    parentPhone: "",
  });

  if (isOpen === "NONE") return null;

  const resetState = () => {
    setStudentForm({ name: "", rollNo: "1", class: "10", section: "A", guardianName: "", guardianPhone: "" });
    setFeeForm({ studentId: "", amount: "", type: "MONTHLY", dueDate: new Date().toISOString().split("T")[0] });
    setTeacherForm({ name: "", email: "", department: "Academics", designation: "Teacher" });
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      switch (isOpen) {
        case "ADD_STUDENT":
          await apiCall("/api/v1/students", "POST", studentForm);
          invalidateAll("/api/v1/students");
          invalidateAll("/api/v1/stats");
          toast("Student record created successfully!");
          break;
        case "RECORD_FEE":
          await apiCall("/api/v1/invoices", "POST", { ...feeForm, amount: Number(feeForm.amount) });
          invalidateAll("/api/v1/invoices");
          invalidateAll("/api/v1/stats");
          toast("Fee invoice recorded successfully!");
          break;
        case "CREATE_EXAM":
          await apiCall("/api/v1/exams", "POST", examForm);
          invalidateAll("/api/v1/exams");
          toast("Examination scheduled successfully!");
          break;
        case "ADD_TEACHER":
          await apiCall("/api/v1/teachers", "POST", teacherForm);
          invalidateAll("/api/v1/teachers");
          invalidateAll("/api/v1/stats");
          toast("Faculty member added successfully!");
          break;
        case "SEND_NOTICE": {
          const fd = new FormData();
          fd.append("title", noticeForm.title);
          fd.append("content", noticeForm.content);
          fd.append("category", noticeForm.category);
          fd.append("status", "PUBLISHED");
          await apiCall("/api/v1/notices", "POST", fd);
          invalidateAll("/api/v1/notices");
          invalidateAll("/api/v1/stats");
          toast("Notice broadcasted successfully!");
          break;
        }
        case "NEW_ADMISSION":
          await apiCall("/api/v1/admissions", "POST", admissionForm);
          invalidateAll("/api/v1/admissions");
          invalidateAll("/api/v1/stats");
          toast("Admission application submitted!");
          break;
        case "MARK_ATTENDANCE":
          toast("Attendance roster initialized. Redirecting to attendance roll call.");
          break;
      }
      handleClose();
    } catch (err: any) {
      toast(err.message || "Failed to process request");
    } finally {
      setSaving(false);
    }
  };

  const titles: Record<ModalType, string> = {
    NONE: "",
    NEW_ADMISSION: "New Admission Application",
    ADD_STUDENT: "Quick Add Student",
    RECORD_FEE: "Record Fee Payment",
    MARK_ATTENDANCE: "Mark Attendance Roll Call",
    CREATE_EXAM: "Schedule Examination",
    ADD_TEACHER: "Quick Add Faculty Member",
    SEND_NOTICE: "Publish School Notice",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="w-full max-w-lg bg-white rounded-2xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
            <h2 id="quick-modal-title" className="text-[19px] font-bold text-slate-900 font-[var(--font-heading)]">
              {titles[isOpen]}
            </h2>
            <button
              type="button"
              aria-label="Close modal"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors bg-transparent border-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Canonical Bulk Import Alternative Link */}
          {isOpen === "ADD_STUDENT" && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-blue-900 font-medium">Need to import multiple students from spreadsheet?</span>
              <Link
                href="/admin/students/import"
                onClick={handleClose}
                className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline shrink-0 no-underline"
              >
                <span>Bulk Import</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {isOpen === "ADD_TEACHER" && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-emerald-900 font-medium">Need to bulk import teaching faculty roster?</span>
              <Link
                href="/admin/teachers/import"
                onClick={handleClose}
                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline shrink-0 no-underline"
              >
                <span>Staff Import</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isOpen === "NEW_ADMISSION" && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Applicant Full Name *</label>
                  <input
                    required
                    value={admissionForm.applicantName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, applicantName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Applying For Class *</label>
                  <input
                    required
                    value={admissionForm.applyingForClass}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, applyingForClass: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Parent / Guardian Name *</label>
                  <input
                    required
                    value={admissionForm.parentName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, parentName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Parent Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={admissionForm.parentPhone}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, parentPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {isOpen === "ADD_STUDENT" && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Student Full Name *</label>
                  <input
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Class *</label>
                    <input
                      required
                      value={studentForm.class}
                      onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Section *</label>
                    <input
                      required
                      value={studentForm.section}
                      onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Roll No *</label>
                    <input
                      required
                      value={studentForm.rollNo}
                      onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Guardian Phone (Optional)</label>
                  <input
                    type="tel"
                    value={studentForm.guardianPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {isOpen === "RECORD_FEE" && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Student Identifier *</label>
                  <input
                    required
                    placeholder="Student ID or Roll No"
                    value={feeForm.studentId}
                    onChange={(e) => setFeeForm({ ...feeForm, studentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 2500"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Fee Type *</label>
                    <select
                      required
                      value={feeForm.type}
                      onChange={(e) => setFeeForm({ ...feeForm, type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="MONTHLY">Monthly Tuition</option>
                      <option value="ADMISSION">Admission Fee</option>
                      <option value="EXAM">Examination Fee</option>
                      <option value="TRANSPORT">Transport Fee</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={feeForm.dueDate}
                      onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {isOpen === "MARK_ATTENDANCE" && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Class Standard *</label>
                  <input
                    required
                    value={attendanceForm.class}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, class: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Attendance Date *</label>
                  <input
                    type="date"
                    required
                    value={attendanceForm.date}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {isOpen === "CREATE_EXAM" && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Examination Title *</label>
                  <input
                    required
                    placeholder="e.g. Mid-Term Summative Assessment"
                    value={examForm.name}
                    onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Class Standard *</label>
                  <input
                    required
                    value={examForm.class}
                    onChange={(e) => setExamForm({ ...examForm, class: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={examForm.startDate}
                      onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={examForm.endDate}
                      onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {isOpen === "ADD_TEACHER" && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    required
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Department</label>
                    <input
                      value={teacherForm.department}
                      onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      value={teacherForm.designation}
                      onChange={(e) => setTeacherForm({ ...teacherForm, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {isOpen === "SEND_NOTICE" && (
              <>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Notice Title *</label>
                  <input
                    required
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={noticeForm.category}
                    onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option>General</option>
                    <option>Academic</option>
                    <option>Examination</option>
                    <option>Finance</option>
                    <option>Emergency Alert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Announcement Body *</label>
                  <textarea
                    required
                    rows={4}
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 h-[44px] rounded-xl text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer border-none shadow-xs"
              >
                {saving ? "Processing..." : "Submit Record"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
