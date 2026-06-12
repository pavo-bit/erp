"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiCall, invalidateAll } from "@/lib/api-hooks";
import Papa from "papaparse";

export type ModalType = "NONE" | "NEW_ADMISSION" | "ADD_STUDENT" | "RECORD_FEE" | "MARK_ATTENDANCE" | "CREATE_EXAM" | "ADD_TEACHER" | "SEND_NOTICE";

interface Props {
  isOpen: ModalType;
  onClose: () => void;
}

export function QuickActionModals({ isOpen, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [validationReport, setValidationReport] = useState<any[] | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  
  // States for specific forms
  const [studentForm, setStudentForm] = useState({ name: "", rollNo: "", class: "", section: "", guardianName: "", guardianPhone: "" });
  const [feeForm, setFeeForm] = useState({ studentId: "", amount: "", type: "MONTHLY", dueDate: "" });
  const [examForm, setExamForm] = useState({ name: "", class: "", session: "2025-26", startDate: "", endDate: "" });
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", department: "", designation: "" });
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "", category: "General" });
  const [attendanceForm, setAttendanceForm] = useState({ class: "", date: new Date().toISOString().split('T')[0] });
  const [admissionForm, setAdmissionForm] = useState({ applicantName: "", applyingForClass: "", parentName: "", parentPhone: "" });

  if (isOpen === "NONE") return null;

  const resetState = () => {
    setStudentForm({ name: "", rollNo: "", class: "", section: "", guardianName: "", guardianPhone: "" });
    setFeeForm({ studentId: "", amount: "", type: "MONTHLY", dueDate: "" });
    setBulkFile(null);
    setValidationReport(null);
    setIsValidated(false);
  }

  const handleClose = () => {
    onClose();
    resetState();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (bulkMode && bulkFile) {
        if (!isValidated) {
          await handleBulkUpload(true);
        } else {
          await handleBulkUpload(false);
          handleClose();
        }
      } else {
        await handleSingleSubmit();
        handleClose();
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSingleSubmit = async () => {
    switch (isOpen) {
      case "ADD_STUDENT":
        await apiCall("/api/students", "POST", studentForm);
        invalidateAll("/api/students");
        invalidateAll("/api/stats/analytics");
        break;
      case "RECORD_FEE":
        await apiCall("/api/fees", "POST", { ...feeForm, amount: Number(feeForm.amount) });
        invalidateAll("/api/fees");
        invalidateAll("/api/stats/analytics");
        break;
      case "CREATE_EXAM":
        await apiCall("/api/exams", "POST", examForm);
        invalidateAll("/api/exams");
        break;
      case "ADD_TEACHER":
        await apiCall("/api/teachers", "POST", teacherForm);
        invalidateAll("/api/teachers");
        invalidateAll("/api/stats/analytics");
        break;
      case "SEND_NOTICE":
        const fd = new FormData();
        fd.append("title", noticeForm.title);
        fd.append("content", noticeForm.content);
        fd.append("category", noticeForm.category);
        fd.append("status", "PUBLISHED");
        await apiCall("/api/notices", "POST", fd);
        invalidateAll("/api/notices");
        invalidateAll("/api/stats/analytics");
        break;
      case "NEW_ADMISSION":
        await apiCall("/api/admissions", "POST", admissionForm);
        invalidateAll("/api/admissions");
        invalidateAll("/api/stats/analytics");
        break;
      case "MARK_ATTENDANCE":
        alert("Attendance roster initialized. Please visit Attendance module for bulk marking.");
        break;
    }
  };

  const handleBulkUpload = async (validateOnly: boolean) => {
    if (!bulkFile) return;

    return new Promise<void>((resolve, reject) => {
      Papa.parse(bulkFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const { data } = results;
            let type = "";
            if (isOpen === "ADD_STUDENT") type = "students";
            else if (isOpen === "ADD_TEACHER") type = "teachers";
            else if (isOpen === "RECORD_FEE") type = "invoices";
            
            if (!type) {
              throw new Error("Bulk upload not supported for this action.");
            }

            const payload = { type, data };
            const endpoint = validateOnly ? "/api/bulk/upload?action=validate" : "/api/bulk/upload";

            const res = await apiCall(endpoint, "POST", payload);
            
            if (validateOnly) {
              setValidationReport(res.data?.report || []);
              setIsValidated(true);
            } else {
              if (type === "students") invalidateAll("/api/students");
              if (type === "teachers") invalidateAll("/api/teachers");
              if (type === "invoices") invalidateAll("/api/fees");
              invalidateAll("/api/stats/analytics");
              alert(`Successfully imported ${data.length} records!`);
            }
            resolve();
          } catch (e: any) {
            reject(new Error(e.message || "Bulk upload failed"));
          }
        },
        error: (error: any) => {
          reject(new Error(error.message));
        }
      });
    });
  };

  const titles: Record<ModalType, string> = {
    NONE: "",
    NEW_ADMISSION: "New Admission Application",
    ADD_STUDENT: "Add New Student",
    RECORD_FEE: "Record Fee Payment",
    MARK_ATTENDANCE: "Mark Attendance",
    CREATE_EXAM: "Create New Exam",
    ADD_TEACHER: "Add New Teacher",
    SEND_NOTICE: "Send School Notice"
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={handleClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer text-lg">✕</button>
          
          <h2 className="text-xl font-bold mb-6 font-[var(--font-heading)]">{titles[isOpen]}</h2>

          {["ADD_STUDENT", "ADD_TEACHER", "RECORD_FEE"].includes(isOpen) && (
            <div className="flex gap-2 mb-6 bg-surface p-1 rounded-lg">
              <button onClick={() => { setBulkMode(false); resetState(); }} className={`flex-1 py-1.5 text-[13px] font-semibold rounded-md border-none cursor-pointer transition-all ${!bulkMode ? "bg-white shadow-sm text-primary" : "bg-transparent text-text-secondary"}`}>Manual Entry</button>
              <button onClick={() => { setBulkMode(true); resetState(); }} className={`flex-1 py-1.5 text-[13px] font-semibold rounded-md border-none cursor-pointer transition-all ${bulkMode ? "bg-white shadow-sm text-primary" : "bg-transparent text-text-secondary"}`}>Bulk Import (CSV)</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {bulkMode ? (
              <div className="flex flex-col gap-4">
                {!isValidated ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-surface/50">
                    <p className="text-[13px] text-text-secondary mb-4">Upload a CSV file with headers matching the fields.</p>
                    <input type="file" accept=".csv" onChange={e => { setBulkFile(e.target.files?.[0] || null); setIsValidated(false); setValidationReport(null); }} className="text-[12px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" required />
                  </div>
                ) : (
                  <div className="bg-surface p-4 rounded-xl border border-border">
                    <h4 className="font-semibold text-sm mb-3">Validation Report</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {validationReport?.map((r, i) => (
                        <div key={i} className={`p-2 rounded text-xs font-mono flex gap-2 ${r.status === 'ERROR' ? 'bg-red-100 text-red-700' : r.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          <span className="font-bold whitespace-nowrap">Row {r.row}:</span>
                          <span>{r.message}</span>
                        </div>
                      ))}
                    </div>
                    {validationReport?.some(r => r.status === 'ERROR') ? (
                      <div className="flex flex-col items-start gap-2 mt-3">
                        <p className="text-red-500 text-xs font-semibold">Please fix the errors in your CSV and upload again.</p>
                        <button 
                          type="button"
                          onClick={() => {
                            const errorRows = validationReport.filter(r => r.status === 'ERROR');
                            const csvContent = "data:text/csv;charset=utf-8," 
                              + "Row,Error Message\n"
                              + errorRows.map(e => `${e.row},"${e.message}"`).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", "import_errors.csv");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          Download Error CSV
                        </button>
                      </div>
                    ) : (
                      <p className="text-green-600 text-xs mt-3 font-semibold">Validation successful! You can now import the data.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {isOpen === "NEW_ADMISSION" && (
                  <>
                    <input placeholder="Applicant Name" required value={admissionForm.applicantName} onChange={e => setAdmissionForm({...admissionForm, applicantName: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Applying For Class" required value={admissionForm.applyingForClass} onChange={e => setAdmissionForm({...admissionForm, applyingForClass: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Parent Name" required value={admissionForm.parentName} onChange={e => setAdmissionForm({...admissionForm, parentName: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Parent Phone" required value={admissionForm.parentPhone} onChange={e => setAdmissionForm({...admissionForm, parentPhone: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                  </>
                )}

                {isOpen === "ADD_STUDENT" && (
                  <>
                    <input placeholder="Student Name" required value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Roll No" required value={studentForm.rollNo} onChange={e => setStudentForm({...studentForm, rollNo: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                      <input placeholder="Class" required value={studentForm.class} onChange={e => setStudentForm({...studentForm, class: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    </div>
                    <input placeholder="Section" required value={studentForm.section} onChange={e => setStudentForm({...studentForm, section: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Guardian Name" value={studentForm.guardianName} onChange={e => setStudentForm({...studentForm, guardianName: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                  </>
                )}

                {isOpen === "RECORD_FEE" && (
                  <>
                    <input placeholder="Student ID" required value={feeForm.studentId} onChange={e => setFeeForm({...feeForm, studentId: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Amount (₹)" type="number" required value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <select required value={feeForm.type} onChange={e => setFeeForm({...feeForm, type: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary bg-white">
                      <option value="MONTHLY">Monthly Fee</option>
                      <option value="ADMISSION">Admission Fee</option>
                      <option value="EXAM">Exam Fee</option>
                      <option value="TRANSPORT">Transport Fee</option>
                    </select>
                    <input type="date" required value={feeForm.dueDate} onChange={e => setFeeForm({...feeForm, dueDate: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                  </>
                )}

                {isOpen === "MARK_ATTENDANCE" && (
                  <>
                    <input placeholder="Class (e.g. X)" required value={attendanceForm.class} onChange={e => setAttendanceForm({...attendanceForm, class: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input type="date" required value={attendanceForm.date} onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <p className="text-[12px] text-text-secondary mt-2">Proceeding will initialize the attendance roster for this class and date.</p>
                  </>
                )}

                {isOpen === "CREATE_EXAM" && (
                  <>
                    <input placeholder="Exam Name" required value={examForm.name} onChange={e => setExamForm({...examForm, name: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Class" required value={examForm.class} onChange={e => setExamForm({...examForm, class: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" required value={examForm.startDate} onChange={e => setExamForm({...examForm, startDate: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                      <input type="date" required value={examForm.endDate} onChange={e => setExamForm({...examForm, endDate: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    </div>
                  </>
                )}

                {isOpen === "ADD_TEACHER" && (
                  <>
                    <input placeholder="Full Name" required value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Email" type="email" required value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Department" required value={teacherForm.department} onChange={e => setTeacherForm({...teacherForm, department: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <input placeholder="Designation" value={teacherForm.designation} onChange={e => setTeacherForm({...teacherForm, designation: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                  </>
                )}

                {isOpen === "SEND_NOTICE" && (
                  <>
                    <input placeholder="Notice Title" required value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
                    <select required value={noticeForm.category} onChange={e => setNoticeForm({...noticeForm, category: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary bg-white">
                      <option>General</option>
                      <option>Admission</option>
                      <option>Results</option>
                      <option>Finance</option>
                      <option>Events</option>
                    </select>
                    <textarea placeholder="Notice Content" required rows={4} value={noticeForm.content} onChange={e => setNoticeForm({...noticeForm, content: e.target.value})} className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary resize-none" />
                  </>
                )}
              </>
            )}

            <button type="submit" disabled={saving || (bulkMode && isValidated && validationReport?.some(r => r.status === 'ERROR'))} className="mt-4 w-full py-3 rounded-xl text-[14px] font-bold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">
              {saving ? "Processing..." : bulkMode ? (!isValidated ? "Validate Data" : "Import Data") : "Submit"}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
