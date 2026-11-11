"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Printer,
  Download,
  X,
  Search,
  Users,
  Settings,
  DollarSign,
  History,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import {
  useAdmissionOverview,
  useAdmissionFee,
  useAdmissionRegister,
  apiCall,
  invalidateAll,
} from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";

type AdmissionType = "NEW" | "READMISSION" | "TRANSFER";
type ActiveTab = "OVERVIEW" | "REGISTER" | "READMISSIONS" | "FEE_CONFIG" | "BULK_LINK";

export default function AdmissionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("OVERVIEW");

  // Form Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState<AdmissionType>("NEW");
  const [isIssuing, setIsIssuing] = useState(false);
  const [applicantName, setApplicantName] = useState("");
  const [sessionInput, setSessionInput] = useState("2026-2027");
  const [issuedSerial, setIssuedSerial] = useState<string | null>(null);

  // Fee Config Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [newFeeInput, setNewFeeInput] = useState<number>(200);
  const [feeReasonInput, setFeeReasonInput] = useState("");
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSuccess, setFeeSuccess] = useState<string | null>(null);
  const [feeSubmitting, setFeeSubmitting] = useState(false);

  // Register Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // SWR Data Hooks
  const { data: overviewData, isLoading: overviewLoading } = useAdmissionOverview();
  const { data: feeData, isLoading: feeLoading } = useAdmissionFee();

  // Construct Query Params for Server-Side Register
  const registerQueryParams = new URLSearchParams();
  if (searchQuery) registerQueryParams.set("search", searchQuery);
  if (filterClass) registerQueryParams.set("className", filterClass);
  if (filterGender) registerQueryParams.set("gender", filterGender);
  if (filterType) registerQueryParams.set("admissionType", filterType);
  if (filterStatus) registerQueryParams.set("status", filterStatus);
  registerQueryParams.set("page", String(page));
  registerQueryParams.set("limit", String(pageSize));

  const { data: registerData, isLoading: registerLoading } = useAdmissionRegister(
    registerQueryParams.toString()
  );

  const registeredStudents = registerData?.students || [];
  const pagination = registerData?.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 };

  const currentFee = feeData?.applicationFee ?? 200;
  const feeHistory = feeData?.history || [];

  // Handlers
  const handleFeeUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeError(null);
    setFeeSuccess(null);

    if (newFeeInput < 0) {
      setFeeError("Application fee cannot be negative.");
      return;
    }
    if (!feeReasonInput.trim()) {
      setFeeError("A valid administrative reason is required to modify the fee.");
      return;
    }

    setFeeSubmitting(true);
    try {
      await apiCall("/api/v1/admin/admissions/bulk/fee", "PUT", {
        applicationFee: newFeeInput,
        reason: feeReasonInput.trim(),
      });
      setFeeSuccess("Application fee successfully updated.");
      setFeeReasonInput("");
      invalidateAll("/api/v1/admin/admissions/bulk/fee");
      invalidateAll("/api/v1/admin/admissions/bulk/overview");
      setTimeout(() => {
        setIsFeeModalOpen(false);
        setFeeSuccess(null);
      }, 1200);
    } catch (err: any) {
      setFeeError(err.message || "Failed to update application fee.");
    } finally {
      setFeeSubmitting(false);
    }
  };

  const handleIssueForm = async () => {
    if (!applicantName.trim()) {
      alert("Please provide the applicant full name.");
      return;
    }
    setIsIssuing(true);
    try {
      const res = await apiCall("/api/v1/admin/admissions/bulk/forms/issue", "POST", {
        formType: viewerType,
        applicantName: applicantName.trim(),
        academicSession: sessionInput.trim() || "2026-2027",
      });
      setIssuedSerial(res.formNumber);
      invalidateAll("/api/v1/admin/admissions/bulk/overview");
      // Trigger PDF download with snapshot form number
      window.open(
        `/api/v1/admin/admissions/bulk/forms/${viewerType}/pdf?formNumber=${encodeURIComponent(
          res.formNumber
        )}`,
        "_blank"
      );
    } catch (err: any) {
      alert(err.message || "Failed to issue form.");
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDownloadPdf = (type: AdmissionType) => {
    window.open(`/api/v1/admin/admissions/bulk/forms/${type}/pdf`, "_blank");
  };

  const handlePrintForm = (type: AdmissionType) => {
    const printUrl = `/api/v1/admin/admissions/bulk/forms/${type}/print`;
    const printWindow = window.open(printUrl, "_blank", "width=900,height=1100");
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <>
      <PageHeader
        title="Admission Management"
        subtitle="Official paper-based admission lifecycle, canonical register, and form issuance"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewerType("NEW");
                setIsViewerOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Open Admission Forms
            </button>
            <Link
              href="/admin/admissions/bulk"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Bulk Registration
            </Link>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="👥"
          label="Registered Students"
          value={String(overviewData?.totalStudentsRegistered ?? (overviewLoading ? "..." : 0))}
          color="#3B82F6"
        />
        <StatCard
          icon="📄"
          label="Forms Issued"
          value={String(overviewData?.totalFormsIssued ?? (overviewLoading ? "..." : 0))}
          color="#10B981"
        />
        <StatCard
          icon="🔄"
          label="Active Admissions"
          value={String(overviewData?.activeAdmissions ?? (overviewLoading ? "..." : 0))}
          color="#8B5CF6"
        />
        <StatCard
          icon="💰"
          label="Application Fee"
          value={`₹${currentFee}`}
          color="#F59E0B"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3 flex-wrap">
        {[
          { id: "OVERVIEW", label: "Admission Overview", icon: FileText },
          { id: "REGISTER", label: "Student Admission Register", icon: Users },
          { id: "READMISSIONS", label: "Re-admission Records", icon: UserCheck },
          { id: "FEE_CONFIG", label: "Fee Configuration & Audit", icon: DollarSign },
          { id: "BULK_LINK", label: "Bulk Excel Wizard", icon: FileSpreadsheet },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === "BULK_LINK") {
                  window.location.assign("/admin/admissions/bulk");
                  return;
                }
                setActiveTab(t.id as ActiveTab);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Institutional Admission Workflow</h2>
            <p className="text-sm text-gray-600 mb-6">
              SSVM ERP operates an authentic paper-based admission lifecycle ensuring strict offline approval
              and verified physical documents. No unverified online applicant records are registered directly.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm mb-3">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Form Issue & Sale</h3>
                <p className="text-xs text-gray-600">
                  Application form issued at cash desk with official serial number and non-refundable application fee (₹{currentFee}).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm mb-3">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Document Collection</h3>
                <p className="text-xs text-gray-600">
                  Parent submits completed application with birth certificate, previous school records, and transfer certificates.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm mb-3">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Office Verification</h3>
                <p className="text-xs text-gray-600">
                  Principal and admission committee verify academic eligibility and physically sign the office-use verification block.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm mb-3">
                  4
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Registration & Placement</h3>
                <p className="text-xs text-gray-600">
                  Student registered via Excel Bulk Wizard or canonical enrollment with permanent admission number and class allotment.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Access to Forms */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Official Admission Form Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  type: "NEW" as AdmissionType,
                  title: "New Admission Form",
                  desc: "Standard 2-page institutional form for first-time student enrolments with guardian details, health, and facilities.",
                  badge: "Standard",
                },
                {
                  type: "READMISSION" as AdmissionType,
                  title: "Re-admission Form",
                  desc: "Preserves existing student identity and permanent admission number across academic session transitions.",
                  badge: "Identity Preserved",
                },
                {
                  type: "TRANSFER" as AdmissionType,
                  title: "Transfer Admission Form",
                  desc: "Captures previous school records, Transfer Certificate (TC) number, issuing board, and migration clearance.",
                  badge: "TC Verified",
                },
              ].map((f) => (
                <div
                  key={f.type}
                  className="p-5 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                        {f.badge}
                      </span>
                      <span className="text-xs font-bold text-gray-500">₹{currentFee}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-1">{f.title}</h3>
                    <p className="text-xs text-gray-600 mb-4">{f.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setViewerType(f.type);
                        setIsViewerOpen(true);
                      }}
                      className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
                    >
                      Preview Form
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(f.type)}
                      title="Download PDF"
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePrintForm(f.type)}
                      title="Print Form"
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ADMISSION REGISTER */}
      {activeTab === "REGISTER" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Search & Filter Toolbar */}
          <div className="p-5 border-b border-gray-200 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by student name, admission no, roll no, or phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                <select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Classes</option>
                  {[
                    "LKG",
                    "UKG",
                    "Class 1",
                    "Class 2",
                    "Class 3",
                    "Class 4",
                    "Class 5",
                    "Class 6",
                    "Class 7",
                    "Class 8",
                    "Class 9",
                    "Class 10",
                    "Class 11",
                    "Class 12",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={filterGender}
                  onChange={(e) => {
                    setFilterGender(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Admission Types</option>
                  <option value="NEW">New Admission</option>
                  <option value="READMISSION">Re-admission</option>
                  <option value="TRANSFER">Transfer Admission</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl text-xs border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ALUMNI">Alumni</option>
                  <option value="TRANSFERRED">Transferred</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {registerLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-500">Loading student admission register...</p>
            </div>
          ) : registeredStudents.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No registered students found</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your search criteria or register students via Bulk Wizard.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-600 font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Student Name</th>
                    <th className="px-5 py-3.5">Admission No</th>
                    <th className="px-5 py-3.5">Class & Section</th>
                    <th className="px-5 py-3.5">Academic Session</th>
                    <th className="px-5 py-3.5">Gender</th>
                    <th className="px-5 py-3.5">Admission Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {registeredStudents.map((s: any) => {
                    const studentName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unnamed Student";
                    const className = s.enrollments?.[0]?.class?.name || s.currentClass || "—";
                    const sectionName = s.enrollments?.[0]?.section?.name || s.currentSection || "";
                    const session = s.enrollments?.[0]?.academicSession?.name || "2026-2027";
                    const admType = s.admissionType || "NEW";

                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">
                          {studentName}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-blue-600 font-semibold">
                          {s.admissionNo || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-gray-700">
                          {className} {sectionName ? `(${sectionName})` : ""}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{session}</td>
                        <td className="px-5 py-3.5 text-gray-600 capitalize">
                          {s.gender ? s.gender.toLowerCase() : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              admType === "READMISSION"
                                ? "bg-purple-100 text-purple-700"
                                : admType === "TRANSFER"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {admType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge
                            status={s.status || "ACTIVE"}
                            color={s.status === "ACTIVE" ? "#10B981" : "#6B7280"}
                          />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/admin/students?search=${encodeURIComponent(s.admissionNo || "")}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Profile
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
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
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RE-ADMISSION RECORDS */}
      {activeTab === "READMISSIONS" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Permanent Identity Re-admission Ledger</h2>
              <p className="text-xs text-gray-600">
                Re-admitted students retain their original admission number and canonical identity across academic sessions.
              </p>
            </div>
            <button
              onClick={() => {
                setViewerType("READMISSION");
                setIsViewerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
            >
              <FileText className="w-4 h-4" />
              Print Re-admission Blank Form
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <th className="px-4 py-3">Permanent Admission No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Previous Academic History</th>
                  <th className="px-4 py-3">Current Placement</th>
                  <th className="px-4 py-3">Identity Integrity</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {registeredStudents
                  .filter((s: any) => s.admissionType === "READMISSION")
                  .map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">{s.admissionNo}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {`${s.firstName || ""} ${s.lastName || ""}`.trim()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.enrollments?.length > 1
                          ? `${s.enrollments.length} Recorded Sessions`
                          : "Re-enrolled Student"}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {s.enrollments?.[0]?.class?.name || s.currentClass || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Preserved Single Identity
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/students?search=${encodeURIComponent(s.admissionNo || "")}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View History
                        </Link>
                      </td>
                    </tr>
                  ))}
                {registeredStudents.filter((s: any) => s.admissionType === "READMISSION").length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-500">
                      No re-admission students found in the current register page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FEE CONFIGURATION & AUDIT */}
      {activeTab === "FEE_CONFIG" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                Institutional Policy
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-2">
                Application Fee: ₹{currentFee}
              </h2>
              <p className="text-xs text-gray-600 mt-1 max-w-xl">
                Charged non-refundably upon the physical issuance of the blank admission application.
                Previously issued paper forms retain their original fee snapshot immutably.
              </p>
            </div>
            <button
              onClick={() => {
                setNewFeeInput(currentFee);
                setIsFeeModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              <Settings className="w-4 h-4" />
              Configure Application Fee
            </button>
          </div>

          {/* Fee Change Audit Trail */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Immutable Fee Audit History
              </h3>
              <span className="text-xs text-gray-500">{feeHistory.length} Recorded Adjustments</span>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Authorized User</th>
                    <th className="px-4 py-3">Previous Fee</th>
                    <th className="px-4 py-3">New Fee</th>
                    <th className="px-4 py-3">Administrative Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {feeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Default fee active (₹200). No fee modifications have been executed yet.
                      </td>
                    </tr>
                  ) : (
                    feeHistory.map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(h.timestamp).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{h.userName}</td>
                        <td className="px-4 py-3 text-gray-500 line-through">₹{h.previousFee}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">₹{h.newFee}</td>
                        <td className="px-4 py-3 text-gray-700">{h.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FORM VIEWER MODAL WITH A4 PREVIEW, PRINT, PDF, AND CLOSE BUTTON */}
      <AnimatePresence>
        {isViewerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-200"
            >
              {/* Modal Top Bar */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-200 p-1 rounded-xl">
                    {(["NEW", "READMISSION", "TRANSFER"] as AdmissionType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setViewerType(t);
                          setIssuedSerial(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          viewerType === t ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {t === "NEW" ? "New Admission" : t === "READMISSION" ? "Re-admission" : "Transfer"}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800">
                    Application Fee: ₹{currentFee} (Non-refundable)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintForm(viewerType)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(viewerType)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>

                  {/* Clearly Visible Close Button at Top-Right */}
                  <button
                    onClick={() => {
                      setIsViewerOpen(false);
                      setIssuedSerial(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold hover:bg-red-500 hover:text-white transition cursor-pointer ml-2"
                    title="Close Form Viewer"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                </div>
              </div>

              {/* Form Serial Issuance Bar */}
              <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">Issue Form to Applicant:</span>
                  <input
                    type="text"
                    placeholder="Applicant full name..."
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="px-2.5 py-1 rounded bg-white border border-blue-200 text-xs w-48"
                  />
                  <input
                    type="text"
                    value={sessionInput}
                    onChange={(e) => setSessionInput(e.target.value)}
                    className="px-2 py-1 rounded bg-white border border-blue-200 text-xs w-24"
                  />
                  <button
                    disabled={isIssuing || !applicantName.trim()}
                    onClick={handleIssueForm}
                    className="px-3 py-1 rounded bg-blue-600 text-white font-semibold text-xs disabled:opacity-50 hover:bg-blue-700"
                  >
                    {isIssuing ? "Issuing..." : "Issue & Download"}
                  </button>
                </div>
                {issuedSerial && (
                  <span className="text-emerald-700 font-bold">
                    Issued Serial: {issuedSerial} (Fee Locked at ₹{currentFee})
                  </span>
                )}
              </div>

              {/* Live A4 Form Preview */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-100 flex justify-center">
                <div className="bg-white w-full max-w-[780px] p-8 shadow-md border border-gray-300 text-gray-900 font-sans text-xs">
                  {/* Header */}
                  <div className="border-b-2 border-gray-800 pb-3 mb-4 flex justify-between items-start">
                    <div className="flex-1">
                      <h1 className="text-base font-black tracking-wide text-gray-900 uppercase">
                        SSVM HIGHER SECONDARY SCHOOL
                      </h1>
                      <p className="text-[10px] text-gray-600">
                        Affiliated to CBSE / State Educational Board • Institutional Code: SSVM-9842
                      </p>
                      <p className="text-[10px] text-gray-600">
                        Campus Office: 124 Education Enclave, Academic City • Helpline: +91 44 2839 0000
                      </p>
                      <div className="mt-2 inline-block bg-gray-900 text-white font-bold text-[11px] px-3 py-0.5 rounded-xs tracking-wider">
                        {viewerType === "NEW"
                          ? "STUDENT ADMISSION APPLICATION FORM"
                          : viewerType === "READMISSION"
                          ? "RE-ADMISSION APPLICATION FORM"
                          : "INCOMING TRANSFER ADMISSION FORM"}
                      </div>
                    </div>

                    {/* Passport Photo Box (32mm x 40mm) */}
                    <div className="w-28 h-36 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-center p-2 bg-gray-50 text-[10px] text-gray-500">
                      <span>Affix Recent Passport Size Photograph</span>
                      <span className="text-[9px] mt-1">(32mm × 40mm)</span>
                    </div>
                  </div>

                  {/* Notice & Serial */}
                  <div className="flex justify-between items-center bg-gray-100 p-2 mb-4 font-mono text-[11px] border border-gray-200">
                    <div>
                      Form Serial:{" "}
                      <span className="font-bold text-blue-700">{issuedSerial || "BLANK-FORM"}</span>
                    </div>
                    <div>
                      Academic Session: <span className="font-bold">2026-2027</span>
                    </div>
                    <div>
                      Application Fee: <span className="font-bold">₹{currentFee} (Non-refundable)</span>
                    </div>
                  </div>

                  {/* Section 1: Student Information */}
                  <div className="mb-4">
                    <div className="bg-gray-200 px-2 py-1 font-bold text-[11px] uppercase tracking-wide mb-2">
                      1. Student Personal Information
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Full Name of Candidate (in BLOCK letters):</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Class Applied For:</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Date of Birth (DD/MM/YYYY):</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Gender & Blood Group:</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Nationality & Religion:</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Social Category (GEN / OBC / SC / ST / EWS):</span>
                        <div className="h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Parent & Guardian Details */}
                  <div className="mb-4">
                    <div className="bg-gray-200 px-2 py-1 font-bold text-[11px] uppercase tracking-wide mb-2">
                      2. Parent and Guardian Particulars
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Father's Name & Occupation:</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Mother's Name & Occupation:</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Primary Mobile Contact:</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5">
                        <span className="text-gray-500 block text-[9px]">Email Address (if applicable):</span>
                        <div className="h-5" />
                      </div>
                      <div className="border border-gray-300 p-1.5 col-span-2">
                        <span className="text-gray-500 block text-[9px]">Permanent & Residential Address:</span>
                        <div className="h-8" />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Previous Schooling & TC (Type Specific) */}
                  {viewerType === "READMISSION" ? (
                    <div className="mb-4">
                      <div className="bg-gray-200 px-2 py-1 font-bold text-[11px] uppercase tracking-wide mb-2">
                        3. Permanent Identity & Re-admission Details
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="border border-gray-300 p-1.5">
                          <span className="text-gray-500 block text-[9px]">Permanent SSVM Admission Number:</span>
                          <div className="h-5 font-mono font-bold text-purple-700" />
                        </div>
                        <div className="border border-gray-300 p-1.5">
                          <span className="text-gray-500 block text-[9px]">Last Academic Session Enrolled:</span>
                          <div className="h-5" />
                        </div>
                      </div>
                    </div>
                  ) : viewerType === "TRANSFER" ? (
                    <div className="mb-4">
                      <div className="bg-gray-200 px-2 py-1 font-bold text-[11px] uppercase tracking-wide mb-2">
                        3. Transfer & Previous School Clearance
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="border border-gray-300 p-1.5">
                          <span className="text-gray-500 block text-[9px]">Previous School Name & Location:</span>
                          <div className="h-5" />
                        </div>
                        <div className="border border-gray-300 p-1.5">
                          <span className="text-gray-500 block text-[9px]">Transfer Certificate (TC) No & Date:</span>
                          <div className="h-5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="bg-gray-200 px-2 py-1 font-bold text-[11px] uppercase tracking-wide mb-2">
                        3. Institutional Facilities Selection
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="border border-gray-300 p-1.5">
                          <span className="font-semibold block mb-1">School Transport:</span>
                          <div>[ ] Required (Route: __________)</div>
                          <div>[ ] Not Required</div>
                        </div>
                        <div className="border border-gray-300 p-1.5">
                          <span className="font-semibold block mb-1">Hostel Accommodation:</span>
                          <div>[ ] Day Scholar</div>
                          <div>[ ] Resident Boarder</div>
                        </div>
                        <div className="border border-gray-300 p-1.5">
                          <span className="font-semibold block mb-1">Dietary / Health:</span>
                          <div>[ ] Vegetarian [ ] Non-Veg</div>
                          <div>Medical: ________________</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 4: Declaration */}
                  <div className="mb-4">
                    <div className="bg-gray-200 px-2 py-1 font-bold text-[11px] uppercase tracking-wide mb-1">
                      4. Parent / Guardian Undertaking
                    </div>
                    <p className="text-[9px] text-gray-600 leading-tight">
                      I hereby certify that all information furnished above is correct and verified against original
                      certificates. I understand that admission is provisional subject to verification by the institution.
                    </p>
                    <div className="flex justify-between items-end mt-6 pt-2 text-[10px]">
                      <div>Date: _______________ Place: _______________</div>
                      <div className="text-right">
                        <div className="border-t border-gray-400 w-44 pt-1">
                          Signature of Parent / Guardian
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Office Use Only Block */}
                  <div className="border-2 border-gray-800 p-3 bg-gray-50">
                    <div className="font-bold text-[11px] uppercase tracking-wider mb-2 text-gray-900 flex justify-between">
                      <span>FOR OFFICE USE ONLY (Verification & Registration)</span>
                      <span className="font-mono text-gray-700">Fee: ₹{currentFee}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="border-b border-gray-300 pb-1">Application Ref: ______________</div>
                      <div className="border-b border-gray-300 pb-1">Date of Admission: ____________</div>
                      <div className="border-b border-gray-300 pb-1">Allotted Class/Sec: ___________</div>
                      <div className="border-b border-gray-300 pb-1">Allotted Roll No: _____________</div>
                      <div className="border-b border-gray-300 pb-1">Fee Receipt Ref: ______________</div>
                      <div className="border-b border-gray-300 pb-1">Permanent Adm No: _____________</div>
                    </div>
                    <div className="flex justify-between items-end mt-6 text-[10px]">
                      <div>Verification Officer Signature: __________________</div>
                      <div className="text-right">
                        <div className="border-t border-gray-400 w-44 pt-1 font-semibold">
                          Principal Seal & Signature
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Fee Notice */}
                  <div className="mt-3 text-right font-bold text-[10px] text-gray-600">
                    Application Fee: ₹{currentFee} (Non-refundable)
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FEE CONFIGURATION MODAL */}
      <AnimatePresence>
        {isFeeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  Update Application Fee
                </h3>
                <button
                  onClick={() => setIsFeeModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFeeUpdate} className="mt-4 space-y-4">
                {feeError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{feeError}</span>
                  </div>
                )}
                {feeSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{feeSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Current Application Fee
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">
                    ₹{currentFee}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Application Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={newFeeInput}
                    onChange={(e) => setNewFeeInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Default institutional fee is ₹200.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Reason for Fee Change *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter official resolution or administrative reason..."
                    value={feeReasonInput}
                    onChange={(e) => setFeeReasonInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="p-3 rounded-xl bg-blue-50 text-[11px] text-blue-800">
                  <ShieldAlert className="w-4 h-4 text-blue-600 inline mr-1" />
                  This modification will be permanently logged in the audit trail. All previously issued forms retain their snapshot fee.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFeeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={feeSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                  >
                    {feeSubmitting ? "Updating..." : "Save Fee Configuration"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
