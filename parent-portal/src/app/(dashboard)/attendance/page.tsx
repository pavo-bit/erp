"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function AttendancePage() {
  const [selectedChild, setSelectedChild] = useState(1);

  const children = [
    { id: 1, name: "Aarav Sharma", class: "Class X-A" },
    { id: 2, name: "Diya Sharma", class: "Class VIII-B" }
  ];

  // Mock Calendar Data
  const daysInMonth = 31;
  const firstDay = 3; // Wednesday
  const today = 15;
  
  const getStatus = (day: number) => {
    if (day > today) return null;
    if (day === 5 || day === 12) return "absent";
    if (day === 8) return "late";
    return "present";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Attendance Record</h1>
          <p className="text-slate-500 dark:text-slate-400">Track daily attendance and historical data.</p>
        </div>
        
        {/* Child Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedChild === child.id 
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Calendar View */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center">
              <CalendarIcon className="mr-2 text-blue-500" /> October 2026
            </h2>
            <div className="flex space-x-2">
              <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-500 dark:text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square p-2" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const status = getStatus(day);
              
              let bgClass = "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700";
              let icon = null;

              if (status === "present") {
                bgClass = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50";
                icon = <CheckCircle2 size={14} className="text-emerald-500 absolute bottom-1.5 right-1.5 opacity-50" />;
              } else if (status === "absent") {
                bgClass = "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50";
                icon = <XCircle size={14} className="text-red-500 absolute bottom-1.5 right-1.5 opacity-50" />;
              } else if (status === "late") {
                bgClass = "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50";
                icon = <Clock size={14} className="text-amber-500 absolute bottom-1.5 right-1.5 opacity-50" />;
              }

              if (day === today) {
                bgClass += " ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900";
              }

              return (
                <div 
                  key={day} 
                  className={`relative aspect-square rounded-xl p-2 font-medium flex items-start justify-start transition-all hover:scale-105 cursor-pointer ${bgClass}`}
                >
                  <span className={day === today ? "bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1 shadow-md shadow-blue-500/30" : ""}>
                    {day}
                  </span>
                  {icon}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Summary (Oct)</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mr-3">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="font-medium text-emerald-800 dark:text-emerald-300">Present</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">12 Days</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mr-3">
                    <XCircle size={16} className="text-red-600 dark:text-red-400" />
                  </div>
                  <span className="font-medium text-red-800 dark:text-red-300">Absent</span>
                </div>
                <span className="font-bold text-red-600 dark:text-red-400">2 Days</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mr-3">
                    <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="font-medium text-amber-800 dark:text-amber-300">Late</span>
                </div>
                <span className="font-bold text-amber-600 dark:text-amber-400">1 Day</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Overall Attendance</span>
                <span className="text-sm font-bold text-emerald-600">80%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2.5 rounded-full" style={{ width: '80%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Requires 75% to appear for finals.</p>
            </div>
          </div>
          
          <div className="glass-card p-6 border-l-4 border-l-blue-500">
            <h3 className="font-bold mb-2">Need a leave?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">You can apply for your child's leave digitally without sending a written note.</p>
            <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/30">
              Apply for Leave
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
