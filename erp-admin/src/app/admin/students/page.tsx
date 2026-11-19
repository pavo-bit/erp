"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Phone,
  GraduationCap,
  Users,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/DashboardLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { StudentEntryDrawer } from "@/components/students/StudentEntryDrawer";
import { SubmissionSuccessModal } from "@/components/ui/SubmissionSuccessModal";
import { useStudents } from "@/lib/api-hooks";

function StudentsDirectoryContent() {
  const searchParams = useSearchParams();

  // Query / Filter States
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Drawer & Success Dialog States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    id: string;
    admissionNo: string;
    name: string;
  } | null>(null);

  // Auto-open drawer if navigated with ?action=create
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  // Construct query params
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
  if (classFilter !== "ALL") queryParams.set("class", classFilter);

  const { data: responseData, isLoading, error, mutate } = useStudents(queryParams.toString());

  const students = responseData?.data || [];
  const pagination = responseData?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("ALL");
    setClassFilter("ALL");
    setPage(1);
  };

  const handleStudentCreated = (created: { id: string; admissionNo: string; name: string }) => {
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
      {/* 1. Header with Clear Institutional Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold text-slate-900 font-[var(--font-heading)]">
              Student Directory
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {pagination.total} Enrolled
            </span>
          </div>
          <p className="text-[14px] text-slate-500 mt-1">
            Official institutional register of student identities, academic placements, and family relationships.
          </p>
        </div>

        {/* Action Buttons: 44px medium height, high accessibility */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/admin/students/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 h-[44px] rounded-xl text-[14px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs no-underline"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import Students</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 h-[44px] rounded-xl text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* 2. Search, Filter & Density Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by student name, roll number, or admission ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[12px] text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[13px] text-slate-800 font-medium border-none outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active in Register</option>
              <option value="INACTIVE">Inactive / Archived</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-[12px] text-slate-500 font-semibold">Class:</span>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[13px] text-slate-800 font-medium border-none outline-none cursor-pointer"
            >
              <option value="ALL">All Classes</option>
              <option value="1">Class 1</option>
              <option value="2">Class 2</option>
              <option value="3">Class 3</option>
              <option value="4">Class 4</option>
              <option value="5">Class 5</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
              <option value="11">Class 11</option>
              <option value="12">Class 12</option>
            </select>
          </div>

          {(search || statusFilter !== "ALL" || classFilter !== "ALL") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[13px] text-blue-700 hover:text-blue-900 font-semibold px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border-none bg-transparent cursor-pointer"
            >
              Clear Filters
            </button>
          )}

          <button
            type="button"
            onClick={() => mutate()}
            title="Refresh Directory"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3. Table or State Handling */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[14px] text-slate-500 font-medium">Loading institutional student register...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-[14px] font-semibold">Error loading register: {(error as Error).message}</p>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-12 h-12 text-slate-300" />}
            title="No students match the criteria"
            description={
              search || statusFilter !== "ALL" || classFilter !== "ALL"
                ? "Try adjusting your search terms or clearing active filters to view students."
                : "No students have been registered in the institutional roll yet. Begin by adding a student or importing a roster."
            }
            primaryAction={{
              label: "Add Student",
              onClick: () => setIsDrawerOpen(true),
              icon: <Plus className="w-4 h-4" />,
            }}
            secondaryAction={{
              label: "Import Students",
              href: "/admin/students/import",
              icon: <Upload className="w-4 h-4" />,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Student Details
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Admission ID
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Class & Roll
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Parent / Guardian
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)] text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student: any) => {
                  const initials = student.name
                    ? student.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "ST";

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/60 transition-colors h-[56px]"
                    >
                      {/* Student Details */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-[12px] flex items-center justify-center border border-blue-200 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/admin/students/${student.id}`}
                              className="text-[14px] font-semibold text-slate-900 hover:text-blue-700 transition-colors no-underline block"
                            >
                              {student.name}
                            </Link>
                            <span className="text-[12px] text-slate-500 block font-normal">
                              {student.user?.email || "No Portal Account Linked"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[12px] font-mono font-semibold border border-slate-200">
                          {student.admissionNo || "—"}
                        </span>
                      </td>

                      {/* Class & Roll */}
                      <td className="px-5 py-3">
                        <div className="text-[13px] font-semibold text-slate-900">
                          {student.className ? `Class ${student.className} (${student.sectionName || "A"})` : "Unallocated"}
                        </div>
                        <span className="text-[12px] text-slate-500">
                          Roll No: <span className="font-semibold text-slate-700">{student.rollNo || "—"}</span>
                        </span>
                      </td>

                      {/* Parent / Guardian */}
                      <td className="px-5 py-3">
                        <div className="text-[13px] font-medium text-slate-800">
                          {student.guardianName || "—"}
                        </div>
                        <span className="text-[12px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {student.guardianPhone || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={student.isActive ? "Active" : "Inactive"}
                          color={student.isActive ? "#10B981" : "#EF4444"}
                        />
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[12px] font-semibold transition-colors no-underline border border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Record</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Pagination */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-600 bg-slate-50/50">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{pagination.total}</span> registered students
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[12px] outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SlideOver Manual Entry Drawer */}
      <StudentEntryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleStudentCreated}
      />

      {/* 6. Success Modal with Add Another & Done Lifecycles */}
      <SubmissionSuccessModal
        isOpen={successInfo !== null}
        title="Student Added Successfully"
        recordIdentifier={successInfo?.admissionNo}
        entityName="Student"
        message={`Student record for "${successInfo?.name}" has been permanently registered in the school directory.`}
        onAddAnother={handleAddAnother}
        onDone={handleDone}
      />
    </div>
  );
}

export default function StudentsDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[14px] text-slate-500 font-medium">Loading Student Management...</p>
        </div>
      }
    >
      <StudentsDirectoryContent />
    </Suspense>
  );
}
