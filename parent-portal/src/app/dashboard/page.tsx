"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { apiCall } from "@/lib/api-hooks";
import { TrendingUp, Award, CalendarClock, BookOpen } from "lucide-react";

export default function DashboardOverview() {
  const { user, selectedStudentId } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChildStats() {
      if (!selectedStudentId) return;
      setLoading(true);
      try {
        // We will mock this response until we build a dedicated parent dashboard endpoint
        // Or we can use existing endpoints if they support parent role nicely
        const [attendanceRes, invoiceRes] = await Promise.all([
          apiCall(`/api/attendance?studentId=${selectedStudentId}&limit=10`),
          apiCall(`/api/invoices?studentId=${selectedStudentId}&status=PENDING`)
        ]);

        const attendances = attendanceRes.data || [];
        const invoices = invoiceRes.data || [];

        const presentCount = attendances.filter((a: any) => a.status === 'PRESENT').length;
        const totalCount = attendances.length || 1;

        setStats({
          attendanceRate: Math.round((presentCount / totalCount) * 100) || 0,
          pendingFees: invoices.reduce((sum: number, inv: any) => sum + inv.remainingAmount, 0),
          recentAttendances: attendances.slice(0, 5),
          upcomingDues: invoices.slice(0, 3)
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchChildStats();
  }, [selectedStudentId]);

  if (!selectedStudentId) {
    return <div className="text-center p-10 text-slate-500">No child records found.</div>;
  }

  const child = user?.guardian?.students?.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome, {user?.name.split(" ")[0]}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here is the latest overview for <strong className="text-slate-700 dark:text-slate-300">{child?.name}</strong>.
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Attendance Rate", value: loading ? "..." : `${stats?.attendanceRate}%`, icon: CalendarClock, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Pending Fees", value: loading ? "..." : `₹${stats?.pendingFees.toLocaleString()}`, icon: IndianRupeeIcon, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Recent Assignments", value: "3 Pending", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Latest Result", value: "88% (Term 1)", icon: Award, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Recent Attendance</h3>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>)}
            </div>
          ) : stats?.recentAttendances?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentAttendances.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${a.status === 'PRESENT' ? 'bg-emerald-500' : a.status === 'LATE' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium">{new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                    a.status === 'PRESENT' ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                    a.status === 'LATE' ? 'text-amber-700 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400' : 
                    'text-red-700 bg-red-100 dark:bg-red-500/20 dark:text-red-400'
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No recent attendance records.</p>
          )}
        </motion.div>

        {/* Pending Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Pending Dues</h3>
            <button className="text-sm font-semibold text-blue-600 dark:text-blue-400">View All</button>
          </div>
          {loading ? (
             <div className="animate-pulse space-y-3">
             {[1, 2].map(i => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>)}
           </div>
          ) : stats?.upcomingDues?.length > 0 ? (
            <div className="space-y-4">
              {stats.upcomingDues.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <h4 className="font-semibold text-sm">{inv.type} Fee</h4>
                    <p className="text-xs text-slate-500 mt-1">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600 dark:text-red-400">₹{inv.remainingAmount.toLocaleString()}</p>
                    <button className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg">Pay Now</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 items-center justify-center mb-3">
                <CheckIcon />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="text-xs text-slate-500 mt-1">No pending fees for this student.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function IndianRupeeIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
  );
}

function CheckIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 6 9 17l-5-5"/></svg>
}
