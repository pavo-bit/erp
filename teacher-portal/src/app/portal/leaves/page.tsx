"use client";

import { CalendarDays, Clock, FileText, CheckCircle2 } from "lucide-react";

export default function LeavesPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent flex items-center gap-2">
            <CalendarDays className="text-red-500" /> Leave Management
          </h1>
          <p className="text-slate-500 mt-1">Apply for leave and track your HR attendance records.</p>
        </div>
        
        <button className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95">
          Apply for Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">12</div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Casual Leaves</div>
            <div className="text-xs text-slate-400 mt-0.5">Remaining this year</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">5</div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sick Leaves</div>
            <div className="text-xs text-slate-400 mt-0.5">Remaining this year</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">2</div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pending</div>
            <div className="text-xs text-slate-400 mt-0.5">Awaiting HR Approval</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h2 className="font-bold text-lg text-slate-800">Recent Applications</h2>
        </div>
        <div className="p-6 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p>No recent leave applications found.</p>
        </div>
      </div>
    </div>
  );
}
