"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { FileSpreadsheet, RefreshCw, ArrowLeft, Download, AlertTriangle, CheckCircle2, Eye, X } from "lucide-react";
import Link from "next/link";

interface BatchJob {
  id: string;
  type: string;
  status: string;
  progress: number;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorFile?: string | null;
  createdAt: string;
}

export default function AdmissionImportHistoryPage() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);

  const fetchHistory = () => {
    setLoading(true);
    fetch("/api/v1/admin/admissions/bulk/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJobs(data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Admission Bulk Import History"
          subtitle="Audit ledger of past bulk student admission batches and transactional ingestion results."
        />
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-hover border border-border text-text-primary rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/admissions/bulk"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <span>+ New Bulk Registration</span>
          </Link>
        </div>
      </div>

      {/* History Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
              <th className="p-3">Batch ID</th>
              <th className="p-3">Admission Workflow</th>
              <th className="p-3">Upload Timestamp</th>
              <th className="p-3">Total Rows</th>
              <th className="p-3">Registered / Success</th>
              <th className="p-3">Failed / Skipped</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-text-secondary">
                  No admission bulk import batches found.
                </td>
              </tr>
            )}
            {jobs.map((j) => {
              const workflowName = j.type.replace("ADMISSION_BULK_", "");
              return (
                <tr key={j.id} className="hover:bg-surface/50 transition">
                  <td className="p-3 font-mono font-bold text-text-primary">{j.id}</td>
                  <td className="p-3">
                    <span className="font-semibold text-text-primary">
                      {workflowName === "NEW"
                        ? "New Admission"
                        : workflowName === "READMISSION"
                        ? "Re-Admission"
                        : "Incoming Transfer"}
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary font-mono">
                    {new Date(j.createdAt).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </td>
                  <td className="p-3 font-mono font-semibold text-text-primary">{j.totalRows}</td>
                  <td className="p-3 font-mono font-bold text-emerald-600">{j.successRows}</td>
                  <td className="p-3 font-mono font-bold text-error">{j.failedRows}</td>
                  <td className="p-3">
                    <StatusBadge
                      status={j.status}
                      color={
                        j.status === "COMPLETED"
                          ? "#10B981"
                          : j.status === "PARTIALLY_COMPLETED"
                          ? "#F59E0B"
                          : "#EF4444"
                      }
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedJob(j)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-surface rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Details & Error Diagnostics Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
              <h3 className="font-bold text-sm text-text-primary">
                Batch Diagnostics: {selectedJob.id}
              </h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-surface rounded-xl border border-border">
                  <span className="text-text-secondary uppercase text-[10px] font-bold">Total</span>
                  <p className="text-lg font-bold text-text-primary mt-0.5">{selectedJob.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-emerald-600 uppercase text-[10px] font-bold">Registered</span>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">{selectedJob.successRows}</p>
                </div>
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                  <span className="text-error uppercase text-[10px] font-bold">Failed</span>
                  <p className="text-lg font-bold text-error mt-0.5">{selectedJob.failedRows}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-text-primary mb-2">Error Log & Diagnostics</h4>
                {selectedJob.errorFile ? (
                  <pre className="p-4 bg-surface rounded-xl border border-border text-[11px] font-mono text-text-secondary max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedJob.errorFile}
                  </pre>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No errors recorded for this batch. All rows registered cleanly.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-border bg-surface/50 flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

