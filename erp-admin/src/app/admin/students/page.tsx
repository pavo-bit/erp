"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  X,
  GraduationCap,
  Users,
  Building,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  Sparkles,
} from "lucide-react";
import { StatCard, StatusBadge } from "@/components/DashboardLayout";
import { SharedDataEntryHeader } from "@/components/import/SharedDataEntryHeader";
import { useStudents, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function StudentsDirectoryPage() {
  // Query States
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: "",
    admissionNo: "",
    rollNo: "1",
    class: "10",
    section: "A",
    session: "2026-2027",
    dob: "",
    gender: "MALE",
    bloodGroup: "O+",
    address: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    guardianRelation: "Father",
  });

  // Construct query parameters
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
  if (typeFilter !== "ALL") queryParams.set("admissionType", typeFilter);

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
    setTypeFilter("ALL");
    setPage(1);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      await apiCall("/api/v1/students", "POST", formData);
      invalidateAll("/api/v1/students");
      setShowModal(false);
      setFormData({
        name: "",
        admissionNo: "",
        rollNo: "1",
        class: "10",
        section: "A",
        session: "2026-2027",
        dob: "",
        gender: "MALE",
        bloodGroup: "O+",
        address: "",
        guardianName: "",
        guardianPhone: "",
        guardianEmail: "",
        guardianRelation: "Father",
      });
      mutate();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create student record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Shared Data-Entry & Bulk Actions */}
      <SharedDataEntryHeader
        title="Student Management & Directory"
        description="Comprehensive directory of canonical student records, academic placements, and profiles."
        moduleId="students"
        entityName="Student"
        onAddNew={() => {
          setErrorMsg("");
          setShowModal(true);
        }}
        onImportSuccess={() => {
          invalidateAll("/api/v1/students");
          mutate();
        }}
      />

      {/* 2. Key Metrics & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👨‍🎓"
          label="Registered Students"
          value={String(pagination.total || 0)}
          color="#3B82F6"
        />
        <StatCard
          icon="✅"
          label="Active In Register"
          value={String(students.filter((s: any) => s.isActive).length)}
          color="#10B981"
        />
        <StatCard
          icon="🔄"
          label="Re-admissions"
          value={String(students.filter((s: any) => s.admissionType === "READMISSION").length)}
          color="#8B5CF6"
        />
        <StatCard
          icon="🏫"
          label="Current Academic Session"
          value="2026-2027"
          color="#F59E0B"
        />
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, admission no, roll no, or guardian..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-gray-700 font-medium border-none outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Admission Type Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
            <span className="text-xs text-gray-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-gray-700 font-medium border-none outline-none cursor-pointer"
            >
              <option value="ALL">All Admissions</option>
              <option value="NEW">New Admission</option>
              <option value="READMISSION">Re-admission</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          {(search || statusFilter !== "ALL" || typeFilter !== "ALL") && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Clear Filters
            </button>
          )}

          <button
            onClick={() => mutate()}
            title="Refresh List"
            className="p-2 text-gray-500 hover:text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4. Student Directory Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500 font-medium">Loading canonical student records...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold">Error loading directory: {(error as Error).message}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No students match your query</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search terms or filters.</p>
            {(search || statusFilter !== "ALL" || typeFilter !== "ALL") && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75">
                  <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Admission No
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Placement & Roll
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Parent / Guardian
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Admission Type
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Profile Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Student Details */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/admin/students/${student.id}`}
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1.5 no-underline"
                            >
                              {student.name}
                            </Link>
                            <span className="text-xs text-gray-400 block font-normal">
                              {student.user?.email || "No Portal Account"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-mono font-medium">
                          {student.admissionNo || "—"}
                        </span>
                      </td>

                      {/* Class & Section */}
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-medium text-gray-900">
                          {student.className ? `${student.className} - ${student.sectionName || ""}` : "Unassigned"}
                        </div>
                        <span className="text-[11px] text-gray-400">
                          Roll No: <span className="font-semibold text-gray-600">{student.rollNo || "—"}</span>
                        </span>
                      </td>

                      {/* Parent / Guardian */}
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-medium text-gray-800">
                          {student.guardianName || "—"}
                        </div>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {student.guardianPhone || "—"}
                        </span>
                      </td>

                      {/* Admission Type */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            student.admissionType === "NEW"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : student.admissionType === "READMISSION"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {student.admissionType === "NEW"
                            ? "New"
                            : student.admissionType === "READMISSION"
                            ? "Re-admission"
                            : "Transfer"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          status={student.isActive ? "Active" : "Inactive"}
                          color={student.isActive ? "#10B981" : "#EF4444"}
                        />
                      </td>

                      {/* Profile Action Link */}
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-xs transition-colors no-underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Controls */}
        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 bg-gray-50/50">
          <div>
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-gray-900">{pagination.total}</span> registered students
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Modal: Add Single Canonical Student Record */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[92%] max-w-[620px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 z-[101] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Add Canonical Student</h3>
                    <p className="text-xs text-gray-500">Create student identity with academic placement</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-4">
                {/* Basic Demographics */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Student Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aarav Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Admission Number (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-generated if blank"
                        value={formData.admissionNo}
                        onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.rollNo}
                        onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Blood Group
                      </label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Placement Details */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Academic Placement
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Class Standard *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 10"
                        value={formData.class}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Section *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. A"
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Academic Session
                      </label>
                      <input
                        type="text"
                        value={formData.session}
                        onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Guardian Details */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Parent / Guardian Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Guardian Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Sharma"
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Guardian Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={formData.guardianPhone}
                        onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {saving ? "Registering Student..." : "Create Student Record"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
