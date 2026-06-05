"use client";

import { motion } from "framer-motion";
import { PageHeader, StatCard } from "@/components/DashboardLayout";
import { useFees } from "@/lib/api-hooks";

export default function FeesPage() {
  const { data: raw, isLoading } = useFees("limit=100");
  const fees = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const totalCollected = fees.filter((f: Record<string, string>) => f.status === "PAID").reduce((s: number, f: Record<string, number>) => s + f.amount, 0);
  const totalPending = fees.filter((f: Record<string, string>) => f.status === "PENDING" || f.status === "OVERDUE").reduce((s: number, f: Record<string, number>) => s + f.amount, 0);
  const defaulterCount = fees.filter((f: Record<string, string>) => f.status === "OVERDUE").length;
  const collectionRate = fees.length > 0 ? Math.round((fees.filter((f: Record<string, string>) => f.status === "PAID").length / fees.length) * 100) : 0;

  const defaulters = fees
    .filter((f: Record<string, string>) => f.status === "PENDING" || f.status === "OVERDUE")
    .slice(0, 6);

  return (
    <>
      <PageHeader title="Fee Management" subtitle="Track collections, pending dues, and generate reports" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="💰" label="Total Collected" value={`₹${(totalCollected / 1000).toFixed(0)}K`} color="#10B981" />
        <StatCard icon="⏳" label="Pending Dues" value={`₹${(totalPending / 1000).toFixed(0)}K`} color="#F59E0B" />
        <StatCard icon="🚨" label="Defaulters" value={String(defaulterCount)} color="#EF4444" />
        <StatCard icon="📊" label="Collection Rate" value={`${collectionRate}%`} color="#3B82F6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All Fees */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border p-6">
          <h3 className="text-[16px] font-semibold mb-6 font-[var(--font-heading)]">Recent Fee Records</h3>
          {isLoading ? (
            <div className="py-8 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {fees.slice(0, 10).map((f: Record<string, unknown>) => {
                const student = f.student as Record<string, unknown> || {};
                const user = student.user as Record<string, unknown> || {};
                return (
                  <div key={f.id as string} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                    <div>
                      <div className="text-[13px] font-semibold text-text-primary font-[var(--font-heading)]">{user.name as string || "—"}</div>
                      <div className="text-[11px] text-text-secondary">{f.type as string} · {new Date(f.dueDate as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[14px] font-bold font-[var(--font-heading)] ${(f.status as string) === "PAID" ? "text-success" : "text-danger"}`}>
                        ₹{(f.amount as number).toLocaleString()}
                      </span>
                      <div className="text-[10px] text-text-secondary">{f.status as string}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Defaulters */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[16px] font-semibold font-[var(--font-heading)]">Pending Fees</h3>
          </div>
          <div className="flex flex-col gap-3">
            {defaulters.length === 0 ? (
              <p className="text-[13px] text-text-secondary text-center py-6">🎉 No pending fees!</p>
            ) : (
              defaulters.map((d: Record<string, unknown>) => {
                const student = d.student as Record<string, unknown> || {};
                const user = student.user as Record<string, unknown> || {};
                return (
                  <div key={d.id as string} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                    <div>
                      <div className="text-[13px] font-semibold text-text-primary font-[var(--font-heading)]">{user.name as string || "—"}</div>
                      <div className="text-[11px] text-text-secondary">{d.type as string}</div>
                    </div>
                    <span className="text-[14px] font-bold text-danger font-[var(--font-heading)]">₹{(d.amount as number).toLocaleString()}</span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
