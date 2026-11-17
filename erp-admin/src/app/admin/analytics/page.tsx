"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { PageHeader, StatCard } from "@/components/DashboardLayout";
import { useSchoolAnalyticsOverview, useSchoolAnalyticsTrends } from "@/lib/api-hooks";
import { Users, TrendingUp, DollarSign, AlertTriangle, RefreshCw } from "lucide-react";

interface OverviewData {
  enrolment?: {
    total: number;
    active: number;
    inactive: number;
    gender?: { male: number; female: number; other: number };
  };
  attendance?: {
    overallRate: number;
    todayRate: number;
    totalRecords: number;
    presentRecords: number;
  };
  finances?: {
    totalBilled: number;
    totalCollected: number;
    totalDue: number;
    collectionRate: number;
  };
  defaulters?: {
    count: number;
  };
}

interface TrendPoint {
  month: string;
  enrolment: number;
  attendanceRate: number;
  feeBilled: number;
  feeCollected: number;
  feeDue: number;
  defaulters: number;
}

export default function AnalyticsPage() {
  const {
    data: overviewData,
    error: overviewError,
    isLoading: isOverviewLoading,
    mutate: mutateOverview,
  } = useSchoolAnalyticsOverview();

  const {
    data: trendsData,
    error: trendsError,
    isLoading: isTrendsLoading,
    mutate: mutateTrends,
  } = useSchoolAnalyticsTrends();

  const isLoading = isOverviewLoading || isTrendsLoading;
  const isError = Boolean(overviewError || trendsError);

  const overview: OverviewData = overviewData || {};
  const trends: TrendPoint[] = Array.isArray(trendsData) ? trendsData : [];

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Analytics" subtitle="Loading analytics and performance metrics..." />
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-border">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-text-secondary font-medium font-[var(--font-heading)]">
            Fetching institutional analytics data...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Analytics" subtitle="Institutional performance insights" />
        <div className="bg-white rounded-2xl border border-danger/30 p-8 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2 font-[var(--font-heading)]">
            Unable to Load School Analytics
          </h3>
          <p className="text-sm text-text-secondary mb-6 font-[var(--font-heading)]">
            {overviewError?.message || trendsError?.message || "An unexpected error occurred while fetching analytics records."}
          </p>
          <button
            onClick={() => {
              mutateOverview();
              mutateTrends();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasData =
    (overview.enrolment?.total ?? 0) > 0 ||
    trends.length > 0 ||
    (overview.finances?.totalBilled ?? 0) > 0;

  // Empty State
  if (!hasData) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Analytics" subtitle="Institutional performance insights" />
        <div className="bg-white rounded-2xl border border-border p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-surface text-text-secondary flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2 font-[var(--font-heading)]">
            No Analytics Records Found
          </h3>
          <p className="text-sm text-text-secondary mb-6 font-[var(--font-heading)]">
            Analytics data will appear automatically as students enroll, attendance is marked, and fee invoices are generated.
          </p>
          <button
            onClick={() => {
              mutateOverview();
              mutateTrends();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-border text-text-primary text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const enrolmentTotal = overview.enrolment?.total ?? 0;
  const attendanceRate = overview.attendance?.overallRate ?? 0;
  const totalBilled = overview.finances?.totalBilled ?? 0;
  const totalCollected = overview.finances?.totalCollected ?? 0;
  const totalDue = overview.finances?.totalDue ?? 0;
  const defaultersCount = overview.defaulters?.count ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="School Analytics"
          subtitle="Real-time academic, attendance, and financial performance insights"
        />
        <button
          onClick={() => {
            mutateOverview();
            mutateTrends();
          }}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-white hover:bg-surface text-text-secondary hover:text-text-primary text-xs font-medium transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👨‍🎓"
          label="Total Enrolment"
          value={String(enrolmentTotal)}
          color="#3B82F6"
        />
        <StatCard
          icon="📋"
          label="Attendance Rate"
          value={`${attendanceRate}%`}
          color="#10B981"
        />
        <StatCard
          icon="💰"
          label="Fee Collected"
          value={`₹${(totalCollected / 1000).toFixed(1)}K`}
          color="#FF6B00"
        />
        <StatCard
          icon="⚠️"
          label="Fee Defaulters"
          value={String(defaultersCount)}
          color="#EF4444"
        />
      </div>

      {/* Primary Analytics Grid: Native Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Enrolment Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary font-[var(--font-heading)] flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Student Enrolment Trend
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-[var(--font-heading)]">
                Cumulative student registrations over the past 6 months
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
              Active: {overview.enrolment?.active ?? 0}
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="enrolmentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  formatter={(val: any) => [val, "Students"]}
                />
                <Area
                  type="monotone"
                  dataKey="enrolment"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#enrolmentGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 2: Attendance Rate Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary font-[var(--font-heading)] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Attendance Rate Progression
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-[var(--font-heading)]">
                Monthly average institutional attendance percentage
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
              Today: {overview.attendance?.todayRate ?? attendanceRate}%
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  formatter={(val: any) => [`${val}%`, "Attendance Rate"]}
                />
                <Line
                  type="monotone"
                  dataKey="attendanceRate"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#10B981" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 3: Fee Collected vs Due */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary font-[var(--font-heading)] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Fee Collected vs Due
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-[var(--font-heading)]">
                Monthly tuition collection vs outstanding receivables
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-text-primary font-[var(--font-heading)]">
                ₹{(totalDue / 1000).toFixed(1)}K Due
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  formatter={(val: any, name: any) => [
                    `₹${Number(val).toLocaleString()}`,
                    name === "feeCollected" ? "Collected" : "Outstanding Due",
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 600 }}
                />
                <Bar
                  dataKey="feeCollected"
                  name="Collected"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="feeDue"
                  name="Outstanding Due"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 4: Fee Defaulters Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary font-[var(--font-heading)] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Defaulters Overview & Trend
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-[var(--font-heading)]">
                Students with overdue balance across active fee cycles
              </p>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">
              {defaultersCount} Current Defaulters
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  formatter={(val: any) => [val, "Defaulters"]}
                />
                <Bar
                  dataKey="defaulters"
                  fill="#EF4444"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Summary Financial & Demographic Footer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-xs text-text-secondary font-medium font-[var(--font-heading)]">
            Total Billed Invoices
          </div>
          <div className="text-xl font-bold text-text-primary mt-1 font-[var(--font-heading)]">
            ₹{totalBilled.toLocaleString()}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Overall collection efficiency: {overview.finances?.collectionRate ?? 0}%
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-xs text-text-secondary font-medium font-[var(--font-heading)]">
            Attendance Records Logged
          </div>
          <div className="text-xl font-bold text-text-primary mt-1 font-[var(--font-heading)]">
            {overview.attendance?.totalRecords ?? 0}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {overview.attendance?.presentRecords ?? 0} present attendance markers
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-xs text-text-secondary font-medium font-[var(--font-heading)]">
            Gender Distribution
          </div>
          <div className="text-sm font-semibold text-text-primary mt-2 flex items-center justify-between">
            <span>Male: {overview.enrolment?.gender?.male ?? 0}</span>
            <span>Female: {overview.enrolment?.gender?.female ?? 0}</span>
            <span>Other: {overview.enrolment?.gender?.other ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
