"use client";

import { motion } from "framer-motion";
import { PageHeader, StatCard } from "@/components/DashboardLayout";
import { useAnalytics } from "@/lib/api-hooks";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();
  const overview = analytics?.overview || {};
  const finance = analytics?.finance || {};

  if (isLoading) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Loading..." />
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Analytics" subtitle="Platform-wide statistics and insights" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👨‍🎓" label="Total Students" value={String(overview.totalStudents || 0)} color="#3B82F6" />
        <StatCard icon="👨‍🏫" label="Faculty Members" value={String(overview.totalFaculty || 0)} color="#8B5CF6" />
        <StatCard icon="📋" label="Attendance Rate" value={`${overview.attendanceRate || 0}%`} color="#10B981" />
        <StatCard icon="🎓" label="Alumni Network" value={String(overview.totalAlumni || 0)} color="#FF6B00" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Fee Collection Trend */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border p-6">
          <h3 className="text-[16px] font-semibold mb-6 font-[var(--font-heading)]">📈 Monthly Fee Collection</h3>
          <div className="flex items-end gap-3 h-[160px]">
            {(finance.monthlyFees || []).map((d: { month: string; amount: number }, i: number) => {
              const max = Math.max(...(finance.monthlyFees || []).map((x: { amount: number }) => x.amount), 1);
              const h = Math.max((d.amount / max) * 100, 5);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-text-primary font-[var(--font-heading)]">
                    ₹{(d.amount / 1000).toFixed(0)}K
                  </span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.2 + i * 0.1 }}
                    className="w-full rounded-t-lg"
                    style={{ background: d.amount > 0 ? "linear-gradient(to top, #FF6B00, #FF8C3A)" : "#E5E7EB", minHeight: 4 }} />
                  <span className="text-[10px] text-text-secondary font-[var(--font-heading)]">{d.month}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Platform Overview */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-border p-6">
          <h3 className="text-[16px] font-semibold mb-6 font-[var(--font-heading)]">🎯 Platform Overview</h3>
          <div className="flex flex-col gap-4">
            {[
              { label: "Active Notices", value: overview.activeNotices || 0, max: 20, color: "#FF6B00" },
              { label: "Upcoming Events", value: overview.upcomingEvents || 0, max: 10, color: "#3B82F6" },
              { label: "New Admissions", value: overview.recentAdmissions || 0, max: 200, color: "#10B981" },
              { label: "Total Parents", value: overview.totalParents || 0, max: 500, color: "#8B5CF6" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-text-primary font-[var(--font-heading)]">{item.label}</span>
                  <span className="text-[12px] font-semibold text-text-primary font-[var(--font-heading)]">{item.value}</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                    transition={{ delay: 0.3, duration: 0.6 }} className="h-full rounded-full" style={{ background: item.color, minWidth: "8px" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-border">
            <h4 className="text-[14px] font-semibold mb-3 font-[var(--font-heading)]">💰 Finance Summary</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                <div className="text-[18px] font-bold text-success font-[var(--font-heading)]">
                  ₹{((finance.totalCollected || 0) / 100000).toFixed(1)}L
                </div>
                <div className="text-[11px] text-text-secondary">Collected</div>
              </div>
              <div className="p-3 rounded-xl bg-warning/5 border border-warning/20">
                <div className="text-[18px] font-bold text-warning font-[var(--font-heading)]">
                  ₹{((finance.totalPending || 0) / 100000).toFixed(1)}L
                </div>
                <div className="text-[11px] text-text-secondary">Pending</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
