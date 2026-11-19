"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarCheck,
  Calendar,
  BookOpen,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

function getSubjectCount(subjects: string | string[] | undefined | null): number {
  if (!subjects) return 2;
  if (Array.isArray(subjects)) return subjects.length || 2;
  if (typeof subjects === "string") {
    const parts = subjects.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.length || 2;
  }
  return 2;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const teacher = user?.teacher;

  const quickStats = [
    { icon: CalendarCheck, label: "Classes Today", value: "5 Assigned", color: "text-teal-700 bg-teal-50 border-teal-200" },
    { icon: Users, label: "Total Students", value: "185", color: "text-blue-700 bg-blue-50 border-blue-200" },
    { icon: BookOpen, label: "Active Subjects", value: String(getSubjectCount(teacher?.subjects)), color: "text-purple-700 bg-purple-50 border-purple-200" },
    { icon: Clock, label: "Next Period", value: "10:30 AM (Sec 10-A)", color: "text-amber-700 bg-amber-50 border-amber-200" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900 font-[var(--font-heading)]">
            Welcome, {user?.name || "Teacher"}
          </h1>
          <p className="text-[14px] text-slate-500 mt-1">
            {teacher?.designation || "Faculty Member"} • {teacher?.department || "Academic Department"}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Daily Roll Call Active</span>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-[22px] font-bold text-slate-900 font-[var(--font-heading)]">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Daily Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/portal/attendance"
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-500 shadow-xs transition-all no-underline group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mb-3 group-hover:bg-teal-700 group-hover:text-white transition-colors">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="text-[16px] font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
            Mark Daily Attendance
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Conduct roll call for today&apos;s assigned sections and sync to parent portal.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[13px] font-bold text-teal-700">
            <span>Open Roll Call</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/portal/timetable"
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-500 shadow-xs transition-all no-underline group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-3 group-hover:bg-blue-700 group-hover:text-white transition-colors">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-[16px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            View Schedule & Timetable
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Check weekly period timetable, classroom allocations, and substitutions.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[13px] font-bold text-blue-700">
            <span>View Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href="/portal/homework"
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-500 shadow-xs transition-all no-underline group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center mb-3 group-hover:bg-purple-700 group-hover:text-white transition-colors">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-[16px] font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
            Assign Homework & Tasks
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Publish syllabus reading assignments and classroom deliverables.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[13px] font-bold text-purple-700">
            <span>Assignments LMS</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
