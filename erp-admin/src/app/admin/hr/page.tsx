"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useSalaries, useLeaves, apiCall, invalidateAll } from "@/lib/api-hooks";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function HRPage() {
  const [tab, setTab] = useState<"salaries" | "leaves">("salaries");
  const { data: salaryRaw, isLoading: loadingSalaries } = useSalaries();
  const { data: leaveRaw, isLoading: loadingLeaves } = useLeaves();

  const salaries = Array.isArray(salaryRaw) ? salaryRaw : salaryRaw?.data || [];
  const leaves = Array.isArray(leaveRaw) ? leaveRaw : leaveRaw?.data || [];

  const totalSalary = salaries.reduce((s: number, sal: Record<string, number>) => s + (sal.netPay || 0), 0);
  const paidSalaries = salaries.filter((s: Record<string, string>) => s.status === "PAID");
  const pendingSalaries = salaries.filter((s: Record<string, string>) => s.status === "PENDING");
  const pendingLeaves = leaves.filter((l: Record<string, string>) => l.status === "PENDING");

  const handlePaySalary = async (id: string) => {
    try {
      await apiCall(`/api/hr/salaries/${id}/pay`, "PUT");
      invalidateAll("/api/hr/salaries");
    } catch (e) { alert((e as Error).message); }
  };

  const handleLeaveAction = async (id: string, status: string) => {
    try {
      await apiCall(`/api/hr/leaves/${id}`, "PUT", { status });
      invalidateAll("/api/hr/leaves");
    } catch (e) { alert((e as Error).message); }
  };

  const statusColors: Record<string, string> = {
    PAID: "#10B981", PENDING: "#F59E0B", HOLD: "#EF4444",
    APPROVED: "#10B981", REJECTED: "#EF4444",
  };

  return (
    <>
      <PageHeader title="HR & Payroll" subtitle="Manage teacher salaries, payslips, and leave requests" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="💰" label="Total Payroll" value={`₹${(totalSalary / 1000).toFixed(0)}K`} color="#3B82F6" />
        <StatCard icon="✅" label="Paid" value={String(paidSalaries.length)} color="#10B981" />
        <StatCard icon="⏳" label="Pending Salary" value={String(pendingSalaries.length)} color="#F59E0B" />
        <StatCard icon="📋" label="Pending Leaves" value={String(pendingLeaves.length)} color="#8B5CF6" />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        {(["salaries", "leaves"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-all font-[var(--font-heading)] capitalize
              ${tab === t ? "bg-primary text-white shadow-md" : "bg-white text-text-secondary hover:bg-surface"}`}
          >{t === "salaries" ? "💰 Salaries" : "📋 Leave Requests"}</button>
        ))}
      </div>

      {tab === "salaries" ? (
        <motion.div key="salaries" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
          {loadingSalaries ? (
            <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
          ) : salaries.length === 0 ? (
            <p className="text-[13px] text-text-secondary text-center py-12">No salary records</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Teacher", "Month", "Basic", "Allowances", "Deductions", "Net Pay", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((s: Record<string, unknown>) => {
                    const teacher = s.teacher as Record<string, unknown> || {};
                    const user = teacher?.user as Record<string, string> || {};
                    return (
                      <tr key={s.id as string} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-text-primary">{user.name || "—"}</td>
                        <td className="px-5 py-3.5 text-[13px]">{MONTHS[s.month as number]} {s.year as number}</td>
                        <td className="px-5 py-3.5 text-[13px]">₹{(s.basicPay as number)?.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-[13px] text-green-600">+₹{(s.allowances as number)?.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-[13px] text-red-500">-₹{(s.deductions as number)?.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-[13px] font-bold">₹{(s.netPay as number)?.toLocaleString()}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={s.status as string} color={statusColors[s.status as string] || "#666"} /></td>
                        <td className="px-5 py-3.5">
                          {s.status === "PENDING" && (
                            <button onClick={() => handlePaySalary(s.id as string)}
                              className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-green-100 transition-colors">
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div key="leaves" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
          {loadingLeaves ? (
            <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
          ) : leaves.length === 0 ? (
            <p className="text-[13px] text-text-secondary text-center py-12">No leave requests</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Teacher", "Type", "From", "To", "Reason", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l: Record<string, unknown>) => {
                    const requester = l.requester as Record<string, unknown> || {};
                    const user = requester?.user as Record<string, string> || {};
                    return (
                      <tr key={l.id as string} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-text-primary">{user.name || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[11px] font-semibold">{l.leaveType as string}</span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-text-secondary">
                          {new Date(l.startDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-text-secondary">
                          {new Date(l.endDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-text-secondary max-w-[200px] truncate">{l.reason as string}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={l.status as string} color={statusColors[l.status as string] || "#666"} /></td>
                        <td className="px-5 py-3.5">
                          {l.status === "PENDING" && (
                            <div className="flex gap-1.5">
                              <button onClick={() => handleLeaveAction(l.id as string, "APPROVED")}
                                className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-green-100 transition-colors">
                                Approve
                              </button>
                              <button onClick={() => handleLeaveAction(l.id as string, "REJECTED")}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-red-100 transition-colors">
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
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
