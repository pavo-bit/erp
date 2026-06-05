"use client";

import { motion } from "framer-motion";
import { StatCard, PageHeader, ActivityItem, StatusBadge } from "@/components/DashboardLayout";
import { useAnalytics, useNotices, useEvents } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";

const quickActions = [
  { icon: "📢", label: "New Notice", color: "#FF6B00", href: "/admin/notices" },
  { icon: "📅", label: "New Event", color: "#3B82F6", href: "/admin/events" },
  { icon: "📷", label: "Upload Photos", color: "#10B981", href: "/admin/gallery" },
  { icon: "📝", label: "Publish Results", color: "#8B5CF6", href: "/admin/results" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: analytics } = useAnalytics();
  const { data: noticesRaw } = useNotices("limit=6");
  const { data: eventsRaw } = useEvents("limit=4&status=UPCOMING");

  const notices = Array.isArray(noticesRaw) ? noticesRaw : noticesRaw?.data || noticesRaw || [];
  const events = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw?.data || eventsRaw || [];
  const overview = analytics?.overview || {};
  const finance = analytics?.finance || {};

  const recentActivities = [
    ...notices.slice(0, 3).map((n: Record<string, string>) => ({
      icon: "📢",
      title: n.title,
      desc: n.category,
      time: new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    })),
    ...events.slice(0, 3).map((e: Record<string, string>) => ({
      icon: "📅",
      title: e.title,
      desc: e.venue,
      time: new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    })),
  ];

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        subtitle={`Welcome back, ${user?.name?.split(" ")[0] || "Admin"}. Here's what's happening at SSVM today.`}
        action={
          <div className="flex gap-2">
            {quickActions.map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white border-none cursor-pointer
                  transition-transform duration-200 hover:scale-105 font-[var(--font-heading)] no-underline"
                style={{ background: a.color }}
              >
                {a.icon} {a.label}
              </a>
            ))}
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👨‍🎓" label="Total Students" value={overview.totalStudents?.toLocaleString() || "—"} change={`+${overview.recentAdmissions || 0}`} color="#FF6B00" />
        <StatCard icon="📢" label="Active Notices" value={String(overview.activeNotices || 0)} color="#3B82F6" />
        <StatCard icon="📅" label="Upcoming Events" value={String(overview.upcomingEvents || 0)} color="#10B981" />
        <StatCard icon="💰" label="Fee Collected" value={finance.totalCollected ? `₹${(finance.totalCollected / 100000).toFixed(1)}L` : "—"} color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-border p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[16px] font-semibold font-[var(--font-heading)]">Recent Activity</h3>
            <a href="/admin/notices" className="text-[12px] text-primary font-semibold cursor-pointer font-[var(--font-heading)] no-underline">
              View All →
            </a>
          </div>
          {recentActivities.length > 0 ? (
            recentActivities.map((a, i) => <ActivityItem key={i} {...a} />)
          ) : (
            <p className="text-[13px] text-text-secondary py-8 text-center">No recent activity yet</p>
          )}
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-border p-6"
        >
          <h3 className="text-[16px] font-semibold mb-5 font-[var(--font-heading)]">Key Metrics</h3>
          <div className="flex flex-col gap-3">
            {[
              { title: "Total Faculty", value: String(overview.totalFaculty || 0), color: "#10B981" },
              { title: "Total Alumni", value: String(overview.totalAlumni || 0), color: "#8B5CF6" },
              { title: "Attendance Rate", value: `${overview.attendanceRate || 0}%`, color: "#3B82F6" },
              { title: "Pending Fees", value: finance.totalPending ? `₹${(finance.totalPending / 100000).toFixed(1)}L` : "₹0", color: "#F59E0B" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-border/30 transition-colors"
              >
                <span className="text-[13px] font-medium text-text-primary">{item.title}</span>
                <StatusBadge status={item.value} color={item.color} />
              </div>
            ))}
          </div>

          {/* Monthly Fee Chart */}
          <div className="mt-6 pt-5 border-t border-border">
            <h4 className="text-[14px] font-semibold mb-3 font-[var(--font-heading)]">Fee Collection</h4>
            <div className="flex items-end gap-1.5 h-[80px]">
              {(finance.monthlyFees || []).map((m: { month: string; amount: number }, i: number) => {
                const max = Math.max(...(finance.monthlyFees || []).map((x: { amount: number }) => x.amount), 1);
                const h = Math.max((m.amount / max) * 100, 5);
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex-1 rounded-t-md cursor-pointer group relative"
                    style={{
                      background: m.amount > 0 ? "#FF6B00" : "#FF6B0020",
                    }}
                    title={`${m.month}: ₹${m.amount.toLocaleString()}`}
                  />
                );
              })}
            </div>
            {finance.monthlyFees && (
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-text-secondary">{finance.monthlyFees[0]?.month}</span>
                <span className="text-[10px] text-text-secondary">{finance.monthlyFees[finance.monthlyFees.length - 1]?.month}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
