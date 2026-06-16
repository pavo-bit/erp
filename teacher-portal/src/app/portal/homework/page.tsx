"use client";

import { motion } from "framer-motion";
import { BookOpen, Plus, Clock, CheckCircle2 } from "lucide-react";

export default function HomeworkPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
            <BookOpen className="text-teal-600" /> Homework & Assignments
          </h1>
          <p className="text-slate-500 mt-1">Assign coursework and monitor student submissions.</p>
        </div>
        
        <button className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Create Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Chapter {i} Exercises</h3>
                  <p className="text-sm text-slate-500 mt-1">Mathematics • Class X-A</p>
                  <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Due Tomorrow</span>
                    <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> 24/30 Submitted</span>
                  </div>
                </div>
              </div>
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                Review Submissions
              </button>
            </div>
          ))}
        </div>
        
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl p-6 text-white shadow-xl shadow-teal-500/20">
            <h3 className="font-bold text-lg mb-2">Needs Grading</h3>
            <div className="text-4xl font-black mb-4">12</div>
            <p className="text-teal-50 text-sm">Submissions waiting for your review across all active assignments.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
