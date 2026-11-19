"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Upload,
  RefreshCw,
  Mail,
  Briefcase,
  AlertCircle,
  GraduationCap,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/DashboardLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeacherEntryDrawer } from "@/components/teachers/TeacherEntryDrawer";
import { SubmissionSuccessModal } from "@/components/ui/SubmissionSuccessModal";
import { useTeachers, apiCall, invalidateAll } from "@/lib/api-hooks";

function TeachersPageContent() {
  const searchParams = useSearchParams();
  const { data: raw, isLoading, error, mutate } = useTeachers();
  const teachers = Array.isArray(raw) ? raw : raw?.data || [];

  // Filter States
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer & Success Dialog States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    id: string;
    name: string;
    employeeId?: string;
  } | null>(null);

  // Auto-open drawer if navigated with ?action=create
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const departments = [
    ...new Set(
      teachers.map((t: any) => t.department || t.departmentId).filter(Boolean)
    ),
  ];

  // Filtering
  const filteredTeachers = teachers.filter((t: any) => {
    const user = t.user || {};
    const nameMatch = (user.name || "").toLowerCase().includes(search.toLowerCase());
    const emailMatch = (user.email || "").toLowerCase().includes(search.toLowerCase());
    const empMatch = (t.employeeId || "").toLowerCase().includes(search.toLowerCase());
    const subjectMatch = (
      typeof t.subjects === "string" ? t.subjects : (t.subjects || []).join(" ")
    )
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesSearch = !search || nameMatch || emailMatch || empMatch || subjectMatch;

    const deptVal = t.department || t.departmentId || "";
    const matchesDept = deptFilter === "ALL" || deptVal === deptFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && t.isActive) ||
      (statusFilter === "INACTIVE" && !t.isActive);

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleTeacherCreated = (created: { id: string; name: string; employeeId?: string }) => {
    setIsDrawerOpen(false);
    setSuccessInfo(created);
    mutate();
  };

  const handleAddAnother = () => {
    setSuccessInfo(null);
    setIsDrawerOpen(true);
  };

  const handleDone = () => {
    setSuccessInfo(null);
    setIsDrawerOpen(false);
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold text-slate-900 font-[var(--font-heading)]">
              Teachers & Faculty Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {teachers.length} Faculty
            </span>
          </div>
          <p className="text-[14px] text-slate-500 mt-1">
            Manage academic staff profiles, department assignments, and portal login credentials.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/admin/teachers/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 h-[44px] rounded-xl text-[14px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs no-underline"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import Staff</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 h-[44px] rounded-xl text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            <span>Add Teacher</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by faculty name, email, employee ID, or subject..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[12px] text-slate-500 font-semibold">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-transparent text-[13px] text-slate-800 font-medium border-none outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d: any) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[12px] text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[13px] text-slate-800 font-medium border-none outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Faculty</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {(search || deptFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDeptFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="text-[13px] text-blue-700 hover:text-blue-900 font-semibold px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border-none bg-transparent cursor-pointer"
            >
              Clear Filters
            </button>
          )}

          <button
            type="button"
            onClick={() => mutate()}
            title="Refresh List"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[14px] text-slate-500 font-medium">Loading faculty directory...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-[14px] font-semibold">Error loading faculty: {(error as Error).message}</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12 text-slate-300" />}
            title="No faculty members found"
            description={
              search || deptFilter !== "ALL" || statusFilter !== "ALL"
                ? "No teachers matched your search or department filter. Try resetting filters."
                : "No faculty members have been registered yet. Add faculty individually or import staff from a spreadsheet."
            }
            primaryAction={{
              label: "Add Teacher",
              onClick: () => setIsDrawerOpen(true),
              icon: <Plus className="w-4 h-4" />,
            }}
            secondaryAction={{
              label: "Import Staff",
              href: "/admin/teachers/import",
              icon: <Upload className="w-4 h-4" />,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Faculty Details
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Employee ID
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Department & Role
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Subjects
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((t: any) => {
                  const user = t.user || {};
                  const initials = user.name
                    ? user.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "TC";

                  const subjectsList =
                    typeof t.subjects === "string"
                      ? t.subjects.split(",").map((s: string) => s.trim()).filter(Boolean)
                      : (t.subjects || []);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors h-[56px]">
                      {/* Name & Email */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-[12px] flex items-center justify-center border border-emerald-200 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="text-[14px] font-semibold text-slate-900">
                              {user.name || "—"}
                            </div>
                            <span className="text-[12px] text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {user.email || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[12px] font-mono font-semibold border border-slate-200">
                          {t.employeeId || "—"}
                        </span>
                      </td>

                      {/* Department & Designation */}
                      <td className="px-5 py-3">
                        <div className="text-[13px] font-semibold text-slate-900">
                          {t.designation || "Faculty Member"}
                        </div>
                        <span className="text-[12px] text-slate-500">
                          {t.department || t.departmentId || "Academics"}
                        </span>
                      </td>

                      {/* Subjects */}
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {subjectsList.length > 0 ? (
                            subjectsList.map((s: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-[12px] text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={t.isActive ? "Active" : "Inactive"}
                          color={t.isActive ? "#10B981" : "#EF4444"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. SlideOver Manual Entry Drawer */}
      <TeacherEntryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleTeacherCreated}
      />

      {/* 5. Success Modal with Add Another & Done Lifecycles */}
      <SubmissionSuccessModal
        isOpen={successInfo !== null}
        title="Teacher Added Successfully"
        recordIdentifier={successInfo?.employeeId}
        entityName="Teacher"
        message={`Faculty record for "${successInfo?.name}" has been permanently committed to the staff register with Teacher Portal credentials.`}
        onAddAnother={handleAddAnother}
        onDone={handleDone}
      />
    </div>
  );
}

export default function TeachersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[14px] text-slate-500 font-medium">Loading Teachers Management...</p>
        </div>
      }
    >
      <TeachersPageContent />
    </Suspense>
  );
}
