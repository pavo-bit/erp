"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useAdmissions, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function AdmissionsPage() {
  const { data: raw, isLoading } = useAdmissions();
  const admissions = Array.isArray(raw) ? raw : raw?.data || [];
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL" ? admissions : admissions.filter((a: Record<string, string>) => a.status === filter);
  const pending = admissions.filter((a: Record<string, string>) => a.status === "PENDING").length;
  const reviewing = admissions.filter((a: Record<string, string>) => a.status === "UNDER_REVIEW").length;
  const approved = admissions.filter((a: Record<string, string>) => a.status === "APPROVED").length;
  const rejected = admissions.filter((a: Record<string, string>) => a.status === "REJECTED").length;

  const handleReview = async (id: string, status: string) => {
    try {
      await apiCall(`/api/admissions/${id}/review`, "PUT", { status });
      invalidateAll("/api/admissions");
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "#F59E0B", UNDER_REVIEW: "#3B82F6", APPROVED: "#10B981", REJECTED: "#EF4444", ENROLLED: "#8B5CF6",
  };

  return (
    <>
      <PageHeader 
        title="Admission Management" 
        subtitle="Manage online applications, review, and enrollment" 
        action={
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">
            + New Admission
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📋" label="Pending" value={String(pending)} color="#F59E0B" />
        <StatCard icon="🔍" label="Under Review" value={String(reviewing)} color="#3B82F6" />
        <StatCard icon="✅" label="Approved" value={String(approved)} color="#10B981" />
        <StatCard icon="❌" label="Rejected" value={String(rejected)} color="#EF4444" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ENROLLED"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold border-none cursor-pointer transition-all font-[var(--font-heading)]
              ${filter === s ? "bg-primary text-white shadow-md" : "bg-white text-text-secondary border border-border hover:bg-surface"}`}
          >{s.replace("_", " ")}</button>
        ))}
      </div>

      {/* Applications List */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-text-secondary text-center py-12">No applications found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Applicant", "Class", "Parent", "Phone", "Status", "Applied", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[12px] font-semibold text-text-secondary uppercase tracking-[0.06em] font-[var(--font-heading)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a: Record<string, string>) => (
                  <tr key={a.id} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-text-primary">{a.applicantName}</td>
                    <td className="px-5 py-3.5 text-[13px] text-text-primary">{a.applyingForClass}</td>
                    <td className="px-5 py-3.5 text-[13px] text-text-primary">{a.parentName}</td>
                    <td className="px-5 py-3.5 text-[13px] text-text-secondary">{a.parentPhone}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={a.status} color={statusColors[a.status] || "#666"} /></td>
                    <td className="px-5 py-3.5 text-[12px] text-text-secondary">
                      {new Date(a.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        {a.status === "PENDING" && (
                          <>
                            <button onClick={() => handleReview(a.id, "UNDER_REVIEW")}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-blue-100 transition-colors">
                              Review
                            </button>
                            <button onClick={() => handleReview(a.id, "APPROVED")}
                              className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-green-100 transition-colors">
                              Approve
                            </button>
                          </>
                        )}
                        {a.status === "UNDER_REVIEW" && (
                          <>
                            <button onClick={() => handleReview(a.id, "APPROVED")}
                              className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-green-100 transition-colors">
                              Approve
                            </button>
                            <button onClick={() => handleReview(a.id, "REJECTED")}
                              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold border-none cursor-pointer hover:bg-red-100 transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </>
  );
}
