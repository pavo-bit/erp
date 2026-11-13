"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UploadCloud,
  History,
  Trash2,
  Edit2,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";

interface ShiftClass {
  id: string;
  classId: string;
  class: {
    id: string;
    name: string;
    sortOrder: number;
  };
}

interface SchoolShift {
  id: string;
  name: string;
  type: "MORNING" | "DAY" | "EVENING";
  startTime: string;
  endTime: string;
  isActive: boolean;
  configurationVersion: number;
  publicationStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string;
  publishedById?: string;
  shiftClasses: ShiftClass[];
}

interface AcademicSession {
  id: string;
  name: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
}

interface SessionClass {
  id: string;
  name: string;
  sortOrder: number;
  activeStudents: number;
  assignedShift: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalClasses: number;
    assignedClasses: number;
    unassignedClasses: number;
    unassignedClassNames: string[];
    totalShifts: number;
  };
}

export default function SchoolShiftsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const resolvedParams = use(params);
  const schoolId = resolvedParams.schoolId;

  const [school, setSchool] = useState<any>(null);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [shifts, setShifts] = useState<SchoolShift[]>([]);
  const [sessionClasses, setSessionClasses] = useState<SessionClass[]>([]);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    type: "MORNING" as "MORNING" | "DAY" | "EVENING",
    startTime: "07:30",
    endTime: "12:30",
    classIds: [] as string[],
  });

  // 1. Load Initial School & Sessions Data
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        // Fetch school info
        const schoolRes = await fetch(`/api/v1/schools/${schoolId}`);
        const schoolData = await schoolRes.json();
        if (schoolData.success) {
          setSchool(schoolData.data);
        }

        // Fetch academic sessions
        const sessionsRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/sessions`);
        const sessionsData = await sessionsRes.json();
        if (sessionsData.success && Array.isArray(sessionsData.data)) {
          setSessions(sessionsData.data);
          const current = sessionsData.data.find((s: AcademicSession) => s.isCurrent);
          const initialSessionId = current ? current.id : sessionsData.data[0]?.id || "";
          setSelectedSessionId(initialSessionId);
        }
      } catch (err: any) {
        setErrorMessage("Failed to load institution data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [schoolId]);

  // 2. Load Shifts, Classes, & History when Session Changes
  useEffect(() => {
    if (!selectedSessionId) return;

    async function loadSessionData() {
      try {
        setErrorMessage("");
        // Load shifts
        const shiftsRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts?sessionId=${selectedSessionId}`);
        const shiftsData = await shiftsRes.json();
        if (shiftsData.success) {
          setShifts(shiftsData.data);
        }

        // Load classes for this session
        const classesRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/sessions/${selectedSessionId}/classes`);
        const classesData = await classesRes.json();
        if (classesData.success) {
          setSessionClasses(classesData.data);
        }

        // Load audit history
        const historyRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts/history`);
        const historyData = await historyRes.json();
        if (historyData.success) {
          setAuditHistory(historyData.data);
        }

        setValidationReport(null);
      } catch (err: any) {
        setErrorMessage("Failed to load shift assignments for the selected academic session.");
      }
    }
    loadSessionData();
  }, [schoolId, selectedSessionId]);

  // Handle Validation
  const handleValidate = async () => {
    if (!selectedSessionId) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setValidationReport(data.data);
      } else {
        setErrorMessage(data.error || "Validation failed.");
      }
    } catch {
      setErrorMessage("Network error during validation check.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Publish
  const handlePublish = async () => {
    if (!selectedSessionId) return;
    if (!confirm("Are you sure you want to publish this shift configuration? It will become active for all admissions in this academic session.")) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        // Reload shifts and history
        const shiftsRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts?sessionId=${selectedSessionId}`);
        const shiftsData = await shiftsRes.json();
        if (shiftsData.success) setShifts(shiftsData.data);

        const historyRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts/history`);
        const historyData = await historyRes.json();
        if (historyData.success) setAuditHistory(historyData.data);

        setValidationReport(null);
      } else {
        setErrorMessage(data.error || "Publication failed.");
      }
    } catch {
      setErrorMessage("Network error during shift configuration publication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingShiftId(null);
    setModalForm({
      name: "",
      type: "MORNING",
      startTime: "07:30",
      endTime: "12:30",
      classIds: [],
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (shift: SchoolShift) => {
    setEditingShiftId(shift.id);
    setModalForm({
      name: shift.name,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      classIds: shift.shiftClasses.map((sc) => sc.classId),
    });
    setIsModalOpen(true);
  };

  // Save Shift (Create or Update)
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.name || !modalForm.startTime || !modalForm.endTime) {
      alert("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const url = editingShiftId
        ? `/api/v1/super-admin/schools/${schoolId}/shifts/${editingShiftId}`
        : `/api/v1/super-admin/schools/${schoolId}/shifts`;

      const method = editingShiftId ? "PUT" : "POST";
      const payload = {
        ...modalForm,
        sessionId: selectedSessionId,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        // Refresh shifts and classes
        const shiftsRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts?sessionId=${selectedSessionId}`);
        const shiftsData = await shiftsRes.json();
        if (shiftsData.success) setShifts(shiftsData.data);

        const classesRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/sessions/${selectedSessionId}/classes`);
        const classesData = await classesRes.json();
        if (classesData.success) setSessionClasses(classesData.data);
      } else {
        setErrorMessage(data.error || "Failed to save shift configuration.");
      }
    } catch {
      setErrorMessage("Network error while saving shift.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Shift
  const handleDeleteShift = async (shiftId: string, shiftName: string) => {
    if (!confirm(`Are you sure you want to delete shift "${shiftName}"? All its class assignments will be unlinked.`)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/super-admin/schools/${schoolId}/shifts/${shiftId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setShifts(shifts.filter((s) => s.id !== shiftId));
        // Refresh classes
        const classesRes = await fetch(`/api/v1/super-admin/schools/${schoolId}/sessions/${selectedSessionId}/classes`);
        const classesData = await classesRes.json();
        if (classesData.success) setSessionClasses(classesData.data);
      } else {
        setErrorMessage(data.error || "Failed to delete shift.");
      }
    } catch {
      setErrorMessage("Network error while deleting shift.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle class selection in modal
  const handleToggleClass = (classId: string) => {
    setModalForm((prev) => {
      const exists = prev.classIds.includes(classId);
      return {
        ...prev,
        classIds: exists ? prev.classIds.filter((id) => id !== classId) : [...prev.classIds, classId],
      };
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-8 pt-2">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link
            href="/dashboard/schools"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to School Network
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-3 ml-4">
            <Clock className="w-4 h-4" /> Academic Governance
          </div>
          <h1 className="text-[36px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-slate-400 font-[var(--font-heading)] leading-tight">
            School Shift Configuration
          </h1>
          <p className="text-[15px] text-slate-400 mt-2 font-medium max-w-2xl">
            Configure, validate, and publish normalized academic session batch timings and class assignments for{" "}
            <span className="text-white font-bold">{school?.name || "Institution"}</span>.
          </p>
        </div>

        {/* Academic Session Selector */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
          <Calendar className="w-5 h-5 text-blue-400 ml-2" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500">Academic Session</span>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer pr-4"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} {s.isCurrent ? "★ (Current Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Governance Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Shifts & Class Mappings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Configured Shifts</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                {shifts.length}
              </span>
            </div>
            <button
              onClick={handleOpenCreateModal}
              disabled={isSubmitting || !selectedSessionId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add School Shift
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800">
              Loading shift definitions...
            </div>
          ) : shifts.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
              <Clock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white">No Shifts Configured</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                No school shifts are active for this session. Add a Morning, Day, or Evening shift to begin allocating classes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 relative group hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            shift.type === "MORNING"
                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                              : shift.type === "DAY"
                              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                              : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                          }`}
                        >
                          {shift.type} BATCH
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            shift.publicationStatus === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          v{shift.configurationVersion} {shift.publicationStatus}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-2">{shift.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{shift.startTime} – {shift.endTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditModal(shift)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteShift(shift.id, shift.name)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Assigned Classes */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Assigned Classes ({shift.shiftClasses?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {shift.shiftClasses && shift.shiftClasses.length > 0 ? (
                        shift.shiftClasses.map((sc) => (
                          <span
                            key={sc.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700/50"
                          >
                            {sc.class?.name || "Class"}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No classes assigned to this shift yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Complete Session Classes Summary Table */}
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Class Shift Allocation Roster</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live status of all classes belonging to this academic session.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {sessionClasses.filter((c) => c.assignedShift).length} / {sessionClasses.length} Assigned
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider font-bold">
                    <th className="p-4 pl-6">Class Name</th>
                    <th className="p-4">Active Students</th>
                    <th className="p-4">Allocated Shift</th>
                    <th className="p-4 text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  {sessionClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 pl-6 font-bold text-white">{cls.name}</td>
                      <td className="p-4 text-slate-400 flex items-center gap-1.5 font-mono">
                        <Users className="w-3.5 h-3.5 text-slate-500" /> {cls.activeStudents}
                      </td>
                      <td className="p-4">
                        {cls.assignedShift ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Clock className="w-3 h-3" /> {cls.assignedShift.name} ({cls.assignedShift.type})
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400/80 italic font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6">
                        {cls.assignedShift ? (
                          <span className="text-xs font-bold text-emerald-400">Ready</span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Validation, Publishing & Audit Trail */}
        <div className="space-y-6">
          {/* Publication Actions Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Publication Governance
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verify complete class coverage and timing sanity before publishing configurations for active admissions.
            </p>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleValidate}
                disabled={isSubmitting || shifts.length === 0}
                className="w-full py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Evaluating..." : "Run Conflict & Completeness Check"}
              </button>

              <button
                onClick={handlePublish}
                disabled={isSubmitting || shifts.length === 0}
                className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" /> Publish Shift Configuration
              </button>
            </div>

            {/* Validation Feedback */}
            {validationReport && (
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Validation Status</span>
                  {validationReport.isValid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Has Errors
                    </span>
                  )}
                </div>

                {/* Summary counters */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-lg font-black text-white">{validationReport.summary.assignedClasses}</span>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Assigned</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-lg font-black text-amber-400">{validationReport.summary.unassignedClasses}</span>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Unassigned</span>
                  </div>
                </div>

                {/* Errors */}
                {validationReport.errors.length > 0 && (
                  <div className="space-y-1.5">
                    {validationReport.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10 flex items-start gap-1.5">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {validationReport.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {validationReport.warnings.map((warn, i) => (
                      <div key={i} className="text-xs text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audit History Panel */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-blue-400" /> Configuration Audit Trail
            </h3>

            {auditHistory.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No audit records logged yet.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {auditHistory.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-white">{item.title}</span>
                      <span className="text-[10px]">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Shift Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingShiftId ? "Edit Shift Configuration" : "Create New School Shift"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Shift Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Batch"
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Shift Type *
                  </label>
                  <select
                    value={modalForm.type}
                    onChange={(e: any) => setModalForm({ ...modalForm, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="MORNING">MORNING</option>
                    <option value="DAY">DAY</option>
                    <option value="EVENING">EVENING</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={modalForm.startTime}
                      onChange={(e) => setModalForm({ ...modalForm, startTime: e.target.value })}
                      className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={modalForm.endTime}
                      onChange={(e) => setModalForm({ ...modalForm, endTime: e.target.value })}
                      className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Class Multi-Select Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Assign Applicable Classes
                  </label>
                  <span className="text-xs text-slate-500">
                    {modalForm.classIds.length} Selected
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 grid grid-cols-2 gap-2">
                  {sessionClasses.map((c) => {
                    const isChecked = modalForm.classIds.includes(c.id);
                    const isAssignedElsewhere =
                      c.assignedShift &&
                      (!editingShiftId || c.assignedShift.id !== editingShiftId);

                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs select-none transition-colors ${
                          isChecked
                            ? "bg-blue-600/20 border border-blue-500/30 text-white font-bold"
                            : isAssignedElsewhere
                            ? "opacity-50 bg-slate-800 text-slate-400"
                            : "bg-slate-800 hover:bg-slate-700/60 text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleClass(c.id)}
                          className="rounded border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="truncate">{c.name}</span>
                        {isAssignedElsewhere && (
                          <span className="text-[9px] text-amber-400 font-normal">
                            ({c.assignedShift?.name})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingShiftId ? "Update Shift" : "Create Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

