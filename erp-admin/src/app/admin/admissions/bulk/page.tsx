"use client";

import React, { useState, useRef, useEffect } from "react";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  Building,
  RotateCcw,
  Check,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type AdmissionType = "NEW" | "READMISSION" | "TRANSFER";

interface PreviewSummary {
  batchId: string;
  admissionType: AdmissionType;
  templateVersion: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  duplicateReviewRows: number;
  readyToRegisterCount: number;
  entries: any[];
  summaryErrors: any[];
}

export default function BulkAdmissionRegistrationPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Configuration
  const [admissionType, setAdmissionType] = useState<AdmissionType>("NEW");
  const [sessionName, setSessionName] = useState("2026-2027");

  // Step 2: File & Attestation
  const [file, setFile] = useState<File | null>(null);
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split("T")[0]);
  const [approvingAuthority, setApprovingAuthority] = useState("");
  const [approvalRegisterNumber, setApprovalRegisterNumber] = useState("");
  const [attested, setAttested] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 3: Preview
  const [preview, setPreview] = useState<PreviewSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<"ALL" | "VALID" | "WARNING" | "DUPLICATE_REVIEW" | "INVALID">("ALL");
  const [clearEmptyFields, setClearEmptyFields] = useState(false);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);

  // Step 4: Results
  const [commitResult, setCommitResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    window.open(`/api/v1/admin/admissions/bulk/templates/${admissionType}/download`, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMessage(null);
    }
  };

  const handleAnalyzeWorkbook = async () => {
    if (!file) {
      setErrorMessage("Please select an Excel workbook (.xlsx) to upload.");
      return;
    }
    if (!approvingAuthority.trim()) {
      setErrorMessage("Approving Authority name/designation is required for offline admission verification.");
      return;
    }
    if (!attested) {
      setErrorMessage("You must explicitly confirm the offline admission approval attestation.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/admin/admissions/bulk/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze admission workbook.");
      }

      setPreview(data.data);
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Workbook analysis failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommitRegistrations = async () => {
    if (!preview) return;

    setIsCommitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/admissions/bulk/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: preview.batchId,
          admissionType,
          attestation: {
            admissionType,
            sessionId: sessionName,
            approvalDate,
            approvingAuthority,
            approvalRegisterNumber,
            attested: true,
          },
          entries: preview.entries,
          clearEmptyFields,
          skipInvalidRows,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to commit student registrations.");
      }

      setCommitResult(data.data);
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || "Registration commit failed.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setAttested(false);
    setPreview(null);
    setCommitResult(null);
    setErrorMessage(null);
  };

  const filteredEntries = preview?.entries.filter((e) => {
    if (previewFilter === "ALL") return true;
    return e.status === previewFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Bulk Student Admission Registration"
          subtitle="Process offline-approved student admissions into canonical Student Management records."
        />
        <div className="flex items-center gap-2">
          <Link
            href="/admin/admissions/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-hover border border-border text-text-primary rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <span>View Import History</span>
          </Link>
          <Link
            href="/admin/admissions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-hover border border-border text-text-secondary rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <span>Admission Register</span>
          </Link>
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { num: 1, label: "Select Type & Download" },
          { num: 2, label: "Upload & Attestation" },
          { num: 3, label: "Validation Preview" },
          { num: 4, label: "Commit & Registration" },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition ${
                isActive
                  ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                  : isDone
                  ? "bg-surface border-border text-text-primary font-medium"
                  : "bg-surface/30 border-transparent text-text-secondary opacity-60"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? "bg-primary text-white"
                    : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-surface border border-border text-text-secondary"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className="text-xs truncate">{s.label}</span>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 1: SELECT ADMISSION TYPE & TEMPLATE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-text-primary">1. Select Admission Workflow</h3>
            <p className="text-xs text-text-secondary">
              Each admission type adheres to distinct statutory requirements and maintains separate workbook templates.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                {
                  type: "NEW" as AdmissionType,
                  title: "New Admission",
                  icon: "🌱",
                  desc: "Students enrolling at SSVM for the first time. Generates a new permanent SSVM Admission/Registration Number.",
                },
                {
                  type: "READMISSION" as AdmissionType,
                  title: "Re-Admission",
                  icon: "🔄",
                  desc: "Returning students who previously attended SSVM. Existing SSVM Admission Number is MANDATORY. Retains permanent identity.",
                },
                {
                  type: "TRANSFER" as AdmissionType,
                  title: "Incoming Transfer",
                  icon: "🚚",
                  desc: "Students transferring from another school with Transfer Certificate. Preserves previous institution records separately.",
                },
              ].map((card) => {
                const selected = admissionType === card.type;
                return (
                  <div
                    key={card.type}
                    onClick={() => setAdmissionType(card.type)}
                    className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      selected
                        ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                        : "bg-surface border-border hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="text-2xl mb-2">{card.icon}</div>
                      <h4 className="font-bold text-sm text-text-primary">{card.title}</h4>
                      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{card.desc}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold">
                      <span className={selected ? "text-primary" : "text-text-secondary"}>
                        {selected ? "Active Selection" : "Click to select"}
                      </span>
                      {selected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download Box */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-primary">
                  Download {admissionType === "NEW" ? "New Admission" : admissionType === "READMISSION" ? "Re-Admission" : "Incoming Transfer"} Template (v1.0)
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Pre-configured multi-sheet Excel workbook with column contracts, validation notes, and relationship keys.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Workbook (.xlsx)</span>
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <span>Next: Upload & Attestation</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 2: UPLOAD & OFFLINE APPROVAL ATTESTATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* File Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/50 bg-surface/30 hover:bg-surface/60 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">
                {file ? file.name : "Select or drag and drop completed admission workbook"}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Format: Microsoft Excel (.xlsx). Must contain sheets: Students, Guardians, Academic_Placement.
              </p>
            </div>
            {file && (
              <span className="text-xs font-mono font-semibold px-3 py-1 bg-surface border border-border rounded-full text-text-primary">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Mandatory Offline Approval Attestation Form */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Offline Approval Evidence & Attestation (Mandatory)</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              SSVM uses paper-based admission forms. Verification and institutional decisions must occur offline before import.
              Untrusted Excel status cells are never accepted as admission authorization.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
              <div>
                <label className="font-bold text-text-primary block mb-1">
                  Offline Approval Date*
                </label>
                <input
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-bold text-text-primary block mb-1">
                  Approving Authority*
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. R. K. Sharma, Principal"
                  value={approvingAuthority}
                  onChange={(e) => setApprovingAuthority(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-bold text-text-primary block mb-1">
                  Approval Register Ref No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. REG-2026/ADM/44"
                  value={approvalRegisterNumber}
                  onChange={(e) => setApprovalRegisterNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Checkbox Attestation */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl mt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <div className="text-xs">
                  <span className="font-bold text-text-primary">
                    "I confirm that the student records in this import batch have already received the required offline admission approval from the institution."
                  </span>
                  <p className="text-text-secondary mt-1">
                    This user action will be permanently recorded in the immutable compliance audit ledger alongside your authenticated account ({user?.name || "User"}).
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleAnalyzeWorkbook}
              disabled={!file || !approvingAuthority.trim() || !attested || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing Workbook...</span>
                </>
              ) : (
                <>
                  <span>Analyze & Validate Workbook</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 3: VALIDATION PREVIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === 3 && preview && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-surface rounded-xl border border-border">
              <span className="text-[11px] font-bold text-text-secondary uppercase">Total Rows</span>
              <p className="text-xl font-bold text-text-primary mt-1">{preview.totalRows}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Valid Rows</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">{preview.validRows}</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-[11px] font-bold text-amber-600 uppercase">Warnings</span>
              <p className="text-xl font-bold text-amber-600 mt-1">{preview.warningRows}</p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <span className="text-[11px] font-bold text-purple-600 uppercase">Duplicate Review</span>
              <p className="text-xl font-bold text-purple-600 mt-1">{preview.duplicateReviewRows}</p>
            </div>
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
              <span className="text-[11px] font-bold text-error uppercase">Errors (Invalid)</span>
              <p className="text-xl font-bold text-error mt-1">{preview.invalidRows}</p>
            </div>
          </div>

          {/* Commit Options & Policies */}
          <div className="p-4 bg-surface rounded-xl border border-border space-y-3 text-xs">
            <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
              Commit Transaction Options
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipInvalidRows}
                  onChange={(e) => setSkipInvalidRows(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-bold text-text-primary">Skip invalid rows & commit valid rows</span>
                  <p className="text-text-secondary text-[11px]">
                    Allows partial batch commit. Invalid rows are excluded and logged in the error file.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearEmptyFields}
                  onChange={(e) => setClearEmptyFields(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-bold text-text-primary">Clear empty fields on re-admission updates</span>
                  <p className="text-text-secondary text-[11px]">
                    Disabled by default: existing database values are safely retained when cells are empty.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex gap-2 flex-wrap">
            {["ALL", "VALID", "WARNING", "DUPLICATE_REVIEW", "INVALID"].map((tab) => (
              <button
                key={tab}
                onClick={() => setPreviewFilter(tab as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  previewFilter === tab
                    ? "bg-primary text-white"
                    : "bg-surface border border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Preview Table */}
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
                  <th className="p-3">Import Key</th>
                  <th className="p-3">Applicant Name</th>
                  <th className="p-3">DOB / Gender</th>
                  <th className="p-3">Target Placement</th>
                  <th className="p-3">Guardians</th>
                  <th className="p-3">Validation Status</th>
                  <th className="p-3">Diagnostics & Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEntries?.map((entry) => (
                  <tr key={entry.importKey} className="hover:bg-surface/50 transition">
                    <td className="p-3 font-mono font-bold text-text-primary">
                      {entry.importKey}
                      <div className="text-[10px] text-text-secondary font-normal">
                        Row {entry.sourceRowNumber}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-text-primary">
                      {entry.student.name}
                      {entry.student.existingAdmissionNo && (
                        <div className="text-[10px] text-primary font-mono">
                          Existing: {entry.student.existingAdmissionNo}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-text-secondary">
                      {entry.student.dob}
                      <span className="ml-1 text-[10px] font-mono font-bold text-text-primary">
                        ({entry.student.gender})
                      </span>
                    </td>
                    <td className="p-3 font-medium text-text-primary">
                      {entry.placement ? (
                        <>
                          {entry.placement.className} {entry.placement.sectionName || ""}
                          <div className="text-[10px] text-text-secondary font-mono">
                            {entry.placement.sessionName}
                          </div>
                        </>
                      ) : (
                        <span className="text-error font-bold">Missing Placement</span>
                      )}
                    </td>
                    <td className="p-3 text-text-secondary">
                      {entry.guardians.length > 0 ? (
                        entry.guardians.map((g: any, i: number) => (
                          <div key={i} className="text-[11px]">
                            {g.guardian.name} ({g.relationship})
                          </div>
                        ))
                      ) : (
                        <span className="text-amber-500">None Linked</span>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        status={entry.status}
                        color={
                          entry.status === "VALID"
                            ? "#10B981"
                            : entry.status === "WARNING"
                            ? "#F59E0B"
                            : entry.status === "DUPLICATE_REVIEW"
                            ? "#8B5CF6"
                            : "#EF4444"
                        }
                      />
                    </td>
                    <td className="p-3 text-text-secondary max-w-xs">
                      {entry.errors.map((e: any, idx: number) => (
                        <div key={idx} className="text-error text-[11px] mb-1">
                          <strong>{e.fieldLabel}:</strong> {e.message}
                        </div>
                      ))}
                      {entry.warnings.map((w: any, idx: number) => (
                        <div key={idx} className="text-amber-600 text-[11px] mb-1">
                          <strong>{w.fieldLabel}:</strong> {w.message}
                        </div>
                      ))}
                      {entry.errors.length === 0 && entry.warnings.length === 0 && (
                        <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> All Checks Passed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleCommitRegistrations}
              disabled={isCommitting || (preview.readyToRegisterCount === 0 && !skipInvalidRows)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              {isCommitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Committing Registrations...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Commit {preview.readyToRegisterCount} Registrations to Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 4: RESULTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === 4 && commitResult && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-text-primary">
              Bulk Admission Registration Completed
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Batch #{commitResult.batchId} has been committed to canonical Student Management.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-center text-xs">
            <div className="p-4 bg-surface rounded-xl border border-border">
              <span className="text-[11px] font-bold text-text-secondary uppercase">Committed</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{commitResult.successCount}</p>
            </div>
            <div className="p-4 bg-surface rounded-xl border border-border">
              <span className="text-[11px] font-bold text-text-secondary uppercase">Failed</span>
              <p className="text-2xl font-bold text-error mt-1">{commitResult.failedCount}</p>
            </div>
            <div className="p-4 bg-surface rounded-xl border border-border">
              <span className="text-[11px] font-bold text-text-secondary uppercase">Total Rows</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{commitResult.totalRows}</p>
            </div>
          </div>

          {/* Committed Records Table */}
          <div className="border border-border rounded-xl overflow-hidden bg-card text-left max-h-64 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border text-text-secondary font-bold text-[11px]">
                  <th className="p-2.5">Key</th>
                  <th className="p-2.5">Student Name</th>
                  <th className="p-2.5">Assigned Admission No</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commitResult.results.map((r: any) => (
                  <tr key={r.importKey} className="hover:bg-surface/50">
                    <td className="p-2.5 font-mono font-bold text-text-primary">{r.importKey}</td>
                    <td className="p-2.5 font-semibold text-text-primary">{r.studentName}</td>
                    <td className="p-2.5 font-mono font-bold text-primary">{r.admissionNo}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-text-secondary">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-text-primary rounded-xl text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Import Another Batch</span>
            </button>
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <span>View in Student Directory</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

