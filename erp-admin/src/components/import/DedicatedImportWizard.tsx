"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  Loader2,
  FileText,
  UserPlus,
} from "lucide-react";

interface CellError {
  field: string;
  fieldLabel: string;
  value: any;
  message: string;
}

interface SampleRow {
  rowNumber: number;
  isValid: boolean;
  action: "CREATE" | "UPDATE" | "DUPLICATE_FILE" | "INVALID";
  values: Record<string, any>;
  errors: CellError[];
}

interface DedicatedImportWizardProps {
  moduleId: "students" | "staff" | "classes" | "subjects" | "guardians";
  title: string;
  subtitle: string;
  entityName: string;
  manualUrl: string;
  backUrl: string;
  requiredFieldsNote: string[];
}

export function DedicatedImportWizard({
  moduleId,
  title,
  subtitle,
  entityName,
  manualUrl,
  backUrl,
  requiredFieldsNote,
}: DedicatedImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preview Data
  const [previewSummary, setPreviewSummary] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    createCount: number;
    updateCount: number;
    duplicateFileCount: number;
  } | null>(null);
  const [sampleRows, setSampleRows] = useState<SampleRow[]>([]);
  const [allClassifiedRows, setAllClassifiedRows] = useState<any[]>([]);

  // Execution Options
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);
  const [clearEmptyFields, setClearEmptyFields] = useState(false);

  // Result
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    createdCount: number;
    updatedCount: number;
    jobId?: string;
    errorLog?: Array<{ rowNumber: number; errors: string[] }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = (format: "csv" | "xlsx") => {
    window.open(`/api/v1/admin/import/templates/${moduleId}/download?format=${format}`, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith(".csv") && !selected.name.endsWith(".xlsx")) {
        setErrorMsg("Please upload a valid .csv or .xlsx spreadsheet file.");
        return;
      }
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      setErrorMsg("Please select a file to continue.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleId", moduleId);

    try {
      const res = await fetch("/api/v1/admin/import/preview", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "File parsing and validation failed.");
      }

      setPreviewSummary(json.data.summary);
      setSampleRows(json.data.sampleRows || []);
      setAllClassifiedRows(json.data.classifiedRows || []);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during preview.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!allClassifiedRows.length) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/admin/import/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          classifiedRows: allClassifiedRows,
          clearEmptyFields,
          skipInvalidRows,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Import processing failed.");
      }

      setImportResult(json.data);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit import records.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!importResult?.jobId) return;
    window.open(`/api/v1/admin/import/jobs/${importResult.jobId}/errors`, "_blank");
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setErrorMsg(null);
    setPreviewSummary(null);
    setSampleRows([]);
    setAllClassifiedRows([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header with Breadcrumb Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2 no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {entityName} Directory</span>
          </Link>
          <h1 className="text-[26px] font-bold text-slate-900 font-[var(--font-heading)]">
            {title}
          </h1>
          <p className="text-[14px] text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Manual Alternative Callout Button */}
        <Link
          href={manualUrl}
          className="inline-flex items-center gap-2 px-4 py-2.5 h-[44px] rounded-xl text-[14px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 shadow-xs no-underline shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add {entityName} Manually</span>
        </Link>
      </div>

      {/* 2. Step Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
        {[
          { num: 1, label: "Select & Upload" },
          { num: 2, label: "Validate & Preview" },
          { num: 3, label: "Completed Results" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${
                  step === s.num
                    ? "bg-blue-700 text-white"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={`text-[13px] font-semibold ${
                  step === s.num ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < 2 && <div className="flex-1 h-[2px] bg-slate-200 mx-4" />}
          </React.Fragment>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-[14px] text-rose-800">
            <span className="font-bold">Import Error: </span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── STEP 1: DOWNLOAD TEMPLATE & UPLOAD FILE ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Template Download Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900 font-[var(--font-heading)]">
                  Step 1 — Download Official Template
                </h2>
                <p className="text-[14px] text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  To ensure 100% data integrity, always use the canonical SSVM template. It contains
                  pre-formatted column headers, validation instructions, and sample rows.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("csv")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border-none cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Download .CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Download .XLSX</span>
                </button>
              </div>
            </div>

            {/* Mandatory Fields Guide */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                Mandatory Columns:
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {requiredFieldsNote.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold bg-slate-100 text-slate-700 font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h2 className="text-[18px] font-bold text-slate-900 mb-2 font-[var(--font-heading)]">
              Step 2 — Select Completed Spreadsheet
            </h2>
            <p className="text-[14px] text-slate-500 mb-4">
              Select or drag and drop your populated spreadsheet (.csv or .xlsx format, max 10MB).
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              {file ? (
                <div>
                  <div className="text-[15px] font-bold text-slate-900">{file.name}</div>
                  <div className="text-[12px] text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB — Click to choose a different file
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[14px] font-bold text-slate-800">
                    Click to browse or drag and drop file here
                  </div>
                  <div className="text-[12px] text-slate-400 mt-1">
                    Supports Microsoft Excel (.xlsx) and standard CSV (.csv)
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={handleUploadAndAnalyze}
                disabled={!file || isUploading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer border-none shadow-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating & Parsing Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Preview</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: VALIDATE & PREVIEW ── */}
      {step === 2 && previewSummary && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[12px] text-slate-500 font-semibold">Total Rows</span>
              <div className="text-[24px] font-bold text-slate-900 mt-1">
                {previewSummary.totalRows}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20">
              <span className="text-[12px] text-emerald-700 font-semibold">Valid Records</span>
              <div className="text-[24px] font-bold text-emerald-700 mt-1">
                {previewSummary.validRows}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20">
              <span className="text-[12px] text-rose-700 font-semibold">Invalid / Rejected</span>
              <div className="text-[24px] font-bold text-rose-700 mt-1">
                {previewSummary.invalidRows}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20">
              <span className="text-[12px] text-amber-700 font-semibold">Duplicates in File</span>
              <div className="text-[24px] font-bold text-amber-700 mt-1">
                {previewSummary.duplicateFileCount}
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">
                  Data Verification Preview
                </h3>
                <p className="text-[13px] text-slate-500">
                  Review the first 50 rows. Rows with errors are highlighted in red.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInvalidRows}
                    onChange={(e) => setSkipInvalidRows(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Skip invalid rows and import valid ones</span>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Row</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Record Data Summary</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Validation Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleRows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={
                        r.isValid ? "hover:bg-slate-50/50" : "bg-rose-50/40 hover:bg-rose-50/60"
                      }
                    >
                      <td className="px-4 py-3 font-mono text-[12px] text-slate-500">
                        #{r.rowNumber}
                      </td>
                      <td className="px-4 py-3">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            <AlertCircle className="w-3 h-3" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-slate-800 max-w-md truncate">
                        {Object.entries(r.values || {})
                          .filter(([_, v]) => v !== undefined && v !== null && v !== "")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" | ")}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        {r.errors && r.errors.length > 0 ? (
                          <div className="space-y-0.5 text-rose-700">
                            {r.errors.map((e, i) => (
                              <div key={i}>
                                • <span className="font-semibold">{e.fieldLabel || e.field}:</span>{" "}
                                {e.message}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-medium">Ready to import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Upload Different File</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing || (previewSummary.validRows === 0 && !skipInvalidRows)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer border-none shadow-xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing {previewSummary.validRows} Records...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Import {previewSummary.validRows} Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: COMPLETED RESULTS ── */}
      {step === 3 && importResult && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center max-w-xl mx-auto space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-[22px] font-bold text-slate-900 font-[var(--font-heading)]">
              Bulk Import Completed
            </h2>
            <p className="text-[14px] text-slate-600 mt-2 leading-relaxed">
              Successfully processed and committed records to the school directory.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Success</span>
              <div className="text-[20px] font-bold text-emerald-600 mt-1">
                {importResult.successCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Created</span>
              <div className="text-[20px] font-bold text-blue-600 mt-1">
                {importResult.createdCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Rejected</span>
              <div className="text-[20px] font-bold text-rose-600 mt-1">
                {importResult.failedCount}
              </div>
            </div>
          </div>

          {importResult.failedCount > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-left">
              <div className="text-[13px] font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Some rows could not be imported</span>
              </div>
              <p className="text-[12px] text-rose-700 mt-1">
                Download the detailed error report containing exact line numbers and validation
                reasons for failed rows.
              </p>
              <button
                type="button"
                onClick={handleDownloadErrorReport}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-rose-800 bg-white border border-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Error Report (.CSV)</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border-none cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Import Another File</span>
            </button>

            <Link
              href={backUrl}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-xs no-underline"
            >
              <span>View {entityName} Directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
