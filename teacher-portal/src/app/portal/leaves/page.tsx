"use client";

import { useState } from "react";
import { CalendarDays, Clock, FileText, CheckCircle2, AlertCircle, Plus, X, Loader2 } from "lucide-react";
import { useLeaves, apiCall } from "@/lib/api-hooks";

export default function LeavesPage() {
  const { data: leavesRaw, isLoading, mutate } = useLeaves();
  const leaves = Array.isArray(leavesRaw) ? leavesRaw : leavesRaw?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pendingLeaves = leaves.filter((l: any) => l.status === "PENDING").length;
  const approvedLeaves = leaves.filter((l: any) => l.status === "APPROVED").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("Please provide a reason for the leave application.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiCall("/api/v1/hr/leaves", "POST", {
        leaveType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason: reason.trim(),
      });
      setSuccessMsg("Leave application submitted successfully for HR approval.");
      setIsModalOpen(false);
      setReason("");
      mutate();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit leave application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
            <CalendarDays className="text-red-500" /> Leave Management
          </h1>
          <p className="text-slate-500 mt-1">Apply for leave and track your HR attendance records.</p>
        </div>
        
        <button
          onClick={() => {
            setIsModalOpen(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs font-bold text-rose-700 hover:text-rose-900">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            {12 - approvedLeaves > 0 ? 12 - approvedLeaves : 0}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Casual Leaves Available</div>
            <div className="text-xs text-slate-400 mt-0.5">Remaining this academic year</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
            {approvedLeaves}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Approved Leaves</div>
            <div className="text-xs text-slate-400 mt-0.5">Taken this academic year</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">
            {pendingLeaves}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pending Applications</div>
            <div className="text-xs text-slate-400 mt-0.5">Awaiting HR Approval</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h2 className="font-bold text-lg text-slate-800">Recent Applications</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">{leaves.length} records</span>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading leave applications...</div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No recent leave applications found.</p>
            <p className="text-xs text-slate-400 mt-1">Submit a leave request using the &apos;Apply for Leave&apos; button above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaves.map((item: any) => {
              const statusColor =
                item.status === "APPROVED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : item.status === "REJECTED"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";

              return (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{item.leaveType} Leave</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{item.reason}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(item.startDate).toLocaleDateString()} — {new Date(item.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  {item.approverRemarks && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-w-xs">
                      <span className="font-semibold">HR Remarks:</span> {item.approverRemarks}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply for Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Apply for Leave</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="MATERNITY">Maternity / Paternity Leave</option>
                  <option value="EMERGENCY">Emergency / Compassionate Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Application
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the purpose of your leave request..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
