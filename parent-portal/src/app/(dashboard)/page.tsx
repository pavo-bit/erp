"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, Clock, CheckCircle2, TrendingUp, Calendar, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const children = [
    { id: 1, name: "Aarav Sharma", class: "Class X-A", attendance: "92%", nextExam: "Mathematics (15th Oct)" },
    { id: 2, name: "Diya Sharma", class: "Class VIII-B", attendance: "98%", nextExam: "Science (16th Oct)" }
  ];

  const recentNotices = [
    { id: 1, title: "Diwali Holidays Announcement", date: "Oct 10", priority: "high" },
    { id: 2, title: "Term 1 Results Published", date: "Oct 08", priority: "normal" }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Area */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back, Sanjay 👋</h1>
        <p className="text-slate-500 dark:text-slate-400">Here's an overview of your children's academic progress.</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Pending Fees</h3>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">₹4,500</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Due in 5 days (Oct 15)</p>
          <button className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center">
            Pay Now <ArrowUpRight size={16} className="ml-1" />
          </button>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Overall Attendance</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">95%</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Excellent track record</p>
          <button className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center">
            View Details <ArrowUpRight size={16} className="ml-1" />
          </button>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Pending Assignments</h3>
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Clock size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">3</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Across both children</p>
          <button className="mt-4 text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center">
            View Homework <ArrowUpRight size={16} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Children Overview */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold">Your Children</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {children.map((child) => (
              <div key={child.id} className="glass-card p-6 flex flex-col h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 border-2 border-white dark:border-slate-700 shadow-md flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-300">
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{child.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{child.class}</p>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Attendance</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{child.attendance}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: child.attendance }}></div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Next Exam</p>
                    <p className="text-sm font-medium">{child.nextExam}</p>
                  </div>
                </div>

                <button className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg text-sm font-medium transition-colors">
                  View Full Profile
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold">Recent Notices</h2>
              <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {recentNotices.map((notice) => (
                <div key={notice.id} className="group cursor-pointer">
                  <div className="flex items-start">
                    <div className={`mt-1 w-2 h-2 rounded-full mr-3 shrink-0 ${notice.priority === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-500'}`} />
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">{notice.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center">
                        <Calendar size={12} className="mr-1" /> {notice.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="glass-card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 border-none text-white shadow-xl shadow-blue-600/20">
            <h2 className="font-bold text-lg mb-2">Apply for Leave</h2>
            <p className="text-sm text-blue-100 mb-6 leading-relaxed">Submit a leave application for your child online.</p>
            <button className="w-full py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95">
              New Application
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
