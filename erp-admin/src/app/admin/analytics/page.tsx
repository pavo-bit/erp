"use client";

import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader, StatCard } from "@/components/DashboardLayout";
import { useAnalytics, useFinanceStats } from "@/lib/api-hooks";

export default function AnalyticsPage() {
  const { data: analytics, isLoading: isAnalyticsLoading } = useAnalytics();
  const { data: financeData, isLoading: isFinanceLoading } = useFinanceStats();
  
  const overview = analytics?.overview || {};
  const finance = financeData?.finance || {};

  if (isAnalyticsLoading || isFinanceLoading) {
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
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finance.monthlyFees || []}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600, fontFamily: 'var(--font-heading)' }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-heading)' }}
                  formatter={(value: any) => [`₹${(value / 1000).toFixed(1)}K`, 'Collected']}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#FF6B00" 
                  radius={[6, 6, 6, 6]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
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
            <h4 className="text-[14px] font-semibold mb-3 font-[var(--font-heading)]">💰 Advanced Finance Analytics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                <div className="text-[18px] font-bold text-success font-[var(--font-heading)]">
                  ₹{((finance.totalCollected || 0) / 100000).toFixed(1)}L
                </div>
                <div className="text-[11px] text-text-secondary">Total Collected</div>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="text-[18px] font-bold text-primary font-[var(--font-heading)]">
                  ₹{((finance.expectedRevenue || 0) / 100000).toFixed(1)}L
                </div>
                <div className="text-[11px] text-text-secondary">Expected Revenue</div>
              </div>
              <div className="p-3 rounded-xl bg-warning/5 border border-warning/20">
                <div className="text-[18px] font-bold text-warning font-[var(--font-heading)]">
                  ₹{((finance.pendingCollection || 0) / 100000).toFixed(1)}L
                </div>
                <div className="text-[11px] text-text-secondary">Pending Collection</div>
              </div>
              <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
                <div className="text-[18px] font-bold text-danger font-[var(--font-heading)]">
                  {finance.defaultersCount || 0}
                </div>
                <div className="text-[11px] text-text-secondary">Defaulters</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[16px] font-semibold font-[var(--font-heading)]">📊 Advanced Enterprise Analytics (Grafana)</h3>
            <span className="text-[11px] bg-[#FF6B00]/10 text-[#FF6B00] px-2 py-1 rounded-full font-bold tracking-wide">ENTERPRISE TIER</span>
          </div>
          <div className="w-full h-[600px] rounded-xl overflow-hidden border border-border bg-[#f8f9fa]">
            <iframe
              src="http://localhost:3004/d/erp-overview/erp-executive-overview?orgId=1&kiosk=tv&theme=light"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ minHeight: '600px' }}
              title="Grafana Advanced Analytics"
            ></iframe>
          </div>
        </motion.div>
      </div>
    </>
  );
}
