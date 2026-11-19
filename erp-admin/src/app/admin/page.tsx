"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Upload,
  GraduationCap,
  Users,
  CalendarCheck,
  CreditCard,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Bell,
  Calendar,
  BookOpen,
} from "lucide-react";
import { useAnalytics, useNotices, useEvents } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import ActivityFeed from "@/components/ActivityFeed";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data: analytics, isLoading } = useAnalytics();
  const { data: noticesRaw } = useNotices("limit=5");
  const { data: eventsRaw } = useEvents("limit=4&status=UPCOMING");

  const notices = Array.isArray(noticesRaw) ? noticesRaw : noticesRaw?.data || [];
  const events = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw?.data || [];

  const overview = analytics?.overview || {};
  const finance = analytics?.finance || {};

  return (
    <div className="space-y-8">
      {/* 1. Header with Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900 font-[var(--font-heading)]">
            School Administrative Dashboard
          </h1>
          <p className="text-[14px] text-slate-500 mt-1">
            Welcome back, {user?.name || "Administrator"}. Real-time institutional health and operational metrics.
          </p>
        </div>

        {/* School Context Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-[13px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Active Academic Session: 2026-2027</span>
        </div>
      </div>

      {/* 2. Overview Metric Cards (Real Verified Numbers Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider font-[var(--font-heading)]">
              Enrolled Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-slate-900 font-[var(--font-heading)]">
            {isLoading ? "—" : (overview.totalStudents?.toLocaleString() || "0")}
          </div>
          <div className="mt-2 text-[12px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-700 font-semibold">
              +{overview.recentAdmissions || 0}
            </span>{" "}
            new admissions this term
          </div>
        </div>

        {/* Total Teachers and Staff */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider font-[var(--font-heading)]">
              Teaching Faculty
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-slate-900 font-[var(--font-heading)]">
            {isLoading ? "—" : (overview.totalFaculty?.toLocaleString() || "0")}
          </div>
          <div className="mt-2 text-[12px] text-slate-500">
            Active faculty members on roll
          </div>
        </div>

        {/* Today's Attendance Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider font-[var(--font-heading)]">
              Today&apos;s Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-slate-900 font-[var(--font-heading)]">
            {isLoading ? "—" : `${overview.attendanceRate || 0}%`}
          </div>
          <div className="mt-2 text-[12px] text-slate-500">
            School-wide daily attendance rate
          </div>
        </div>

        {/* Fee Collection / Dues */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider font-[var(--font-heading)]">
              Fee Collections
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-slate-900 font-[var(--font-heading)]">
            {isLoading
              ? "—"
              : finance.totalCollected
              ? `₹${(finance.totalCollected / 100000).toFixed(1)}L`
              : "₹0"}
          </div>
          <div className="mt-2 text-[12px] text-slate-500">
            {finance.pendingCount ? (
              <span className="text-amber-700 font-semibold">
                {finance.pendingCount} pending fee invoices
              </span>
            ) : (
              "Term fee reconciliation ledger"
            )}
          </div>
        </div>
      </div>

      {/* 3. Four Core Institutional Quick Actions (Predictable Destinations) */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <div className="mb-4">
          <h2 className="text-[16px] font-bold text-slate-900 font-[var(--font-heading)]">
            Primary Administrative Actions
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Single-click shortcuts to canonical data creation and bulk import workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Add Student */}
          <Link
            href="/admin/students?action=create"
            className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all no-underline group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-700 group-hover:text-white transition-colors">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                Add Student
              </div>
              <div className="text-[12px] text-slate-500 truncate">
                Open student admission drawer
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
          </Link>

          {/* Action 2: Import Students */}
          <Link
            href="/admin/students/import"
            className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all no-underline group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-700 group-hover:text-white transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                Import Students
              </div>
              <div className="text-[12px] text-slate-500 truncate">
                Roster CSV upload & validation
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 transition-colors" />
          </Link>

          {/* Action 3: Add Teacher */}
          <Link
            href="/admin/teachers?action=create"
            className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all no-underline group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Add Teacher
              </div>
              <div className="text-[12px] text-slate-500 truncate">
                Appoint faculty member & access
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
          </Link>

          {/* Action 4: Import Teachers */}
          <Link
            href="/admin/teachers/import"
            className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all no-underline group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-700 group-hover:text-white transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                Import Staff
              </div>
              <div className="text-[12px] text-slate-500 truncate">
                Staff spreadsheet bulk import
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-colors" />
          </Link>
        </div>
      </div>

      {/* 4. Operational Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Activity Feed (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-[16px] font-bold text-slate-900 font-[var(--font-heading)]">
                Recent Institutional Activity
              </h3>
              <p className="text-[12px] text-slate-500">
                Audited timeline of administrative changes, roll calls, and notifications
              </p>
            </div>
            <Link
              href="/admin/notifications"
              className="text-[13px] text-blue-700 hover:text-blue-900 font-semibold no-underline"
            >
              View All Alerts →
            </Link>
          </div>
          <ActivityFeed />
        </div>

        {/* Right Column: Upcoming Events & Notices */}
        <div className="space-y-6">
          {/* Active Notices Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-700" />
                <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                  Important Notices
                </h3>
              </div>
              <Link
                href="/admin/notifications"
                className="text-[12px] text-blue-700 hover:underline font-semibold no-underline"
              >
                All
              </Link>
            </div>

            {notices.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-[13px]">
                No active announcements posted
              </div>
            ) : (
              <div className="space-y-3">
                {notices.slice(0, 3).map((notice: any) => (
                  <div
                    key={notice.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[13px]"
                  >
                    <div className="font-semibold text-slate-900 truncate">
                      {notice.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {notice.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Academic Events */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                  Upcoming Events
                </h3>
              </div>
              <Link
                href="/admin/events"
                className="text-[12px] text-blue-700 hover:underline font-semibold no-underline"
              >
                Calendar
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-[13px]">
                No upcoming calendar events
              </div>
            ) : (
              <div className="space-y-2.5">
                {events.slice(0, 3).map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-[13px]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                      📅
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{event.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {event.startDate
                          ? new Date(event.startDate).toLocaleDateString()
                          : "Scheduled"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
