"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Check,
  AlertTriangle,
  Download,
  Info,
} from "lucide-react";

interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  required: boolean;
  enumValues?: string[];
  description: string;
  example: string | number;
  aliases: string[];
}

interface TemplateDefinition {
  moduleId: string;
  moduleName: string;
  category: string;
  description: string;
  uniqueIdentifier: string;
  fields: FieldDefinition[];
}

interface CellError {
  field: string;
  fieldLabel: string;
  value: any;
  message: string;
}

interface PreviewRow {
  rowNumber: number;
  isValid: boolean;
  action: "CREATE" | "UPDATE" | "DUPLICATE_FILE" | "INVALID";
  sanitizedValues: Record<string, any>;
  errors: CellError[];
}

interface BulkImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  entityName?: string;
  onSuccess?: () => void;
}

export function BulkImportWizardModal({
  isOpen,
  onClose,
  moduleId,
  entityName = "Records",
  onSuccess,
}: BulkImportWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template & Server Preview Response
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [previewSummary, setPreviewSummary] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    createCount: number;
    updateCount: number;
    duplicateCount: number;
  } | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);

  // Execution Options
  const [clearEmptyFields, setClearEmptyFields] = useState<boolean>(false);
  const [skipInvalidRows, setSkipInvalidRows] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    createdCount: number;
    updatedCount: number;
    jobId?: string;
    errorLog?: Array<{ rowNumber: number; errors: string[] }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setErrorMessage(null);
    setTemplate(null);
    setFileHeaders([]);
    setColumnMappings({});
    setPreviewSummary(null);
    setPreviewRows([]);
    setClearEmptyFields(false);
    setSkipInvalidRows(true);
    setImportResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMessage(null);
    }
  };

  // Step 1: Upload File and Fetch Preview
  const handleUploadAndAnalyze = async () => {
    if (!file) {
      setErrorMessage("Please select a file (.xlsx or .csv) to continue.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleId", moduleId);

    try {
      const res = await fetch("/api/v1/admin/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "File parsing and validation failed.");
      }

      setTemplate(data.data.template);
      setFileHeaders(data.data.headers || []);
      setColumnMappings(data.data.initialMappings || {});
      setPreviewSummary(data.data.summary);
      setPreviewRows(data.data.rows || []);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during preview.");
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2 -> Step 3: Re-validate with any user-adjusted column mappings
  const handleApplyMappingsAndPreview = async () => {
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleId", moduleId);
    formData.append("columnMappings", JSON.stringify(columnMappings));

    try {
      const res = await fetch("/api/v1/admin/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to validate mappings.");
      }

      setPreviewSummary(data.data.summary);
      setPreviewRows(data.data.rows || []);
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Mapping update error.");
    } finally {
      setIsUploading(false);
    }
  };

  // Step 3 -> Step 4: Execute Process
  const handleExecuteImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleId", moduleId);
    formData.append("columnMappings", JSON.stringify(columnMappings));
    formData.append("clearEmptyFields", String(clearEmptyFields));
    formData.append("skipInvalidRows", String(skipInvalidRows));

    try {
      const res = await fetch("/api/v1/admin/import/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to commit import records.");
      }

      setImportResult(data.data);
      setStep(4);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Import execution failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden">
        {/* Wizard Header & Stepper */}
        <div className="p-5 border-b border-border bg-surface/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Universal Bulk Import: {template?.moduleName || entityName}
                </h2>
                <p className="text-xs text-text-secondary">
                  High-speed batch ingestion with non-compacting column mapping and transactional commits.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicators */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { num: 1, label: "Upload File" },
              { num: 2, label: "Column Mapping" },
              { num: 3, label: "Validate & Review" },
              { num: 4, label: "Commit & Results" },
            ].map((s) => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                    isActive
                      ? "bg-primary/10 border-primary text-primary font-bold"
                      : isDone
                      ? "bg-surface border-border text-text-primary font-medium"
                      : "bg-surface/30 border-transparent text-text-secondary opacity-60"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? "bg-primary text-white"
                        : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-surface border border-border text-text-secondary"
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : s.num}
                  </div>
                  <span className="truncate">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {errorMessage && (
            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 1: FILE UPLOAD */}
          {/* ───────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/50 bg-surface/30 hover:bg-surface/60 rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary">
                    {file ? file.name : "Click to select or drag and drop spreadsheet"}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Accepts Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv).
                  </p>
                </div>
                {file && (
                  <span className="text-xs font-mono font-semibold px-3 py-1 bg-surface border border-border rounded-full text-text-primary">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              {/* Policy Notes */}
              <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-text-primary text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Important Bulk Ingestion Invariants</span>
                </div>
                <ul className="text-xs text-text-secondary space-y-1.5 list-disc pl-5">
                  <li>
                    <strong>Empty cells never shift columns:</strong> Empty cells retain their natural column index and are translated to database <code className="bg-surface px-1 py-0.5 rounded text-primary">NULL</code>.
                  </li>
                  <li>
                    <strong>Never use placeholder strings:</strong> Do not enter literal "N/A", "null", or dashes for empty values.
                  </li>
                  <li>
                    <strong>Automatic deduplication:</strong> Duplicate rows within the same uploaded file are flagged before database mutation.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 2: COLUMN MAPPING */}
          {/* ───────────────────────────────────────────────────────── */}
          {step === 2 && template && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-text-primary">Map File Columns to Module Attributes</h3>
                  <p className="text-xs text-text-secondary">
                    Review and confirm how header columns from your spreadsheet correspond to system attributes.
                  </p>
                </div>
                <span className="text-xs font-medium text-text-secondary bg-surface px-3 py-1.5 rounded-lg border border-border">
                  Detected {fileHeaders.length} Columns in File
                </span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
                      <th className="p-3">System Field</th>
                      <th className="p-3">Requirement</th>
                      <th className="p-3">Data Type</th>
                      <th className="p-3">Matched File Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {template.fields.map((f) => {
                      const currentMapped = columnMappings[f.name] || "";
                      return (
                        <tr key={f.name} className="hover:bg-surface/50 transition">
                          <td className="p-3 font-semibold text-text-primary">
                            {f.label}
                            <div className="text-[10px] text-text-secondary font-mono">({f.name})</div>
                          </td>
                          <td className="p-3">
                            {f.required ? (
                              <span className="text-error font-bold text-[10px] bg-error/10 px-2 py-0.5 rounded-full">
                                MANDATORY
                              </span>
                            ) : (
                              <span className="text-text-secondary text-[10px] bg-surface px-2 py-0.5 rounded-full border border-border">
                                OPTIONAL
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-primary font-semibold">
                            {f.type.toUpperCase()}
                          </td>
                          <td className="p-3">
                            <select
                              value={currentMapped}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnMappings((prev) => {
                                  const updated = { ...prev };
                                  if (val) updated[f.name] = val;
                                  else delete updated[f.name];
                                  return updated;
                                });
                              }}
                              className="w-full max-w-xs px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">— Do Not Import / Leave Empty —</option>
                              {fileHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 3: VALIDATION PREVIEW */}
          {/* ───────────────────────────────────────────────────────── */}
          {step === 3 && previewSummary && (
            <div className="space-y-6">
              {/* Metric Badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <span className="text-[11px] font-bold text-text-secondary uppercase">Total Rows</span>
                  <p className="text-xl font-bold text-text-primary mt-1">{previewSummary.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">Valid Rows</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{previewSummary.validRows}</p>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-600 uppercase">New Records</span>
                  <p className="text-xl font-bold text-blue-600 mt-1">{previewSummary.createCount}</p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Updates / Duplicates</span>
                  <p className="text-xl font-bold text-amber-600 mt-1">
                    {previewSummary.updateCount} <span className="text-xs text-text-secondary font-normal">({previewSummary.duplicateCount} intra-file dup)</span>
                  </p>
                </div>
              </div>

              {/* Execution Policy Configuration */}
              <div className="p-4 bg-surface rounded-xl border border-border space-y-4">
                <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                  Transaction Commit Policy
                </h4>

                <div className="space-y-3 text-xs">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearEmptyFields}
                      onChange={(e) => setClearEmptyFields(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-bold text-text-primary">
                        Clear empty fields (overwrite existing values with NULL)
                      </span>
                      <p className="text-text-secondary mt-0.5">
                        Disabled by default: existing database values are safely preserved when updating records. If checked, empty cells will wipe existing values to NULL.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipInvalidRows}
                      onChange={(e) => setSkipInvalidRows(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-bold text-text-primary">
                        Skip invalid rows and commit valid rows
                      </span>
                      <p className="text-text-secondary mt-0.5">
                        Enables partial batch ingestion. Invalid rows will be recorded in the error log while valid rows are committed.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Error Detail Log Table */}
              {previewSummary.invalidRows > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-error font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Identified Issues ({previewSummary.invalidRows} Rows Requiring Attention)</span>
                  </div>

                  <div className="border border-error/20 rounded-xl overflow-hidden bg-error/5 max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-error/10 border-b border-error/20 text-error font-bold">
                          <th className="p-2.5">Row #</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Field / Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-error/10">
                        {previewRows
                          .filter((r) => !r.isValid)
                          .map((r) => (
                            <tr key={r.rowNumber} className="hover:bg-error/10 transition">
                              <td className="p-2.5 font-mono font-bold text-text-primary">
                                Row {r.rowNumber}
                              </td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/20 text-error">
                                  {r.action}
                                </span>
                              </td>
                              <td className="p-2.5 text-error">
                                {r.errors.map((e, idx) => (
                                  <div key={idx}>
                                    <strong>{e.fieldLabel}:</strong> {e.message}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STEP 4: IMPORT RESULTS */}
          {/* ───────────────────────────────────────────────────────── */}
          {step === 4 && importResult && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-text-primary">Bulk Import Completed Successfully</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Transactional changes have been safely committed to the database.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-center">
                <div className="p-4 bg-surface rounded-xl border border-border">
                  <span className="text-[11px] font-bold text-text-secondary uppercase">Created</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{importResult.createdCount}</p>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-border">
                  <span className="text-[11px] font-bold text-text-secondary uppercase">Updated</span>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{importResult.updatedCount}</p>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-border">
                  <span className="text-[11px] font-bold text-text-secondary uppercase">Failed / Skipped</span>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{importResult.failedCount}</p>
                </div>
              </div>

              {importResult.errorLog && importResult.errorLog.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-lg mx-auto text-left text-xs space-y-2">
                  <div className="font-bold text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Skipped Row Diagnostics ({importResult.errorLog.length} rows)</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errorLog.map((log, idx) => (
                      <div key={idx} className="text-text-secondary">
                        <strong className="text-text-primary">Row {log.rowNumber}:</strong> {log.errors.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-between">
          <div>
            {step > 1 && step < 4 && (
              <button
                onClick={() => setStep((prev) => (prev - 1) as any)}
                disabled={isUploading || isProcessing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Step
              </button>
            )}
            {step === 4 && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Import Another File
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                onClick={handleUploadAndAnalyze}
                disabled={!file || isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing File...
                  </>
                ) : (
                  <>
                    Analyze & Map Columns
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleApplyMappingsAndPreview}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {isUploading ? "Validating Rows..." : "Validate & Review"}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing || (previewSummary?.validRows === 0 && !skipInvalidRows)}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Committing Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Commit Import to Database
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

