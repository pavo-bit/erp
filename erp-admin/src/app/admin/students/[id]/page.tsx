"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Users,
  Edit,
  Printer,
  ChevronRight,
  BookOpen,
  Activity,
  History,
  X,
  RefreshCw,
  Building,
  School,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/DashboardLayout";
import { useStudent, apiCall, invalidateAll } from "@/lib/api-hooks";

type TabKey =
  | "OVERVIEW"
  | "PERSONAL"
  | "GUARDIANS"
  | "ACADEMICS"
  | "ADMISSION"
  | "FEES"
  | "ATTENDANCE"
  | "DOCUMENTS"
  | "HISTORY";

export default function StudentCanonicalProfilePage() {
  const router = useRouter();
  const routeParams = useParams();
  const studentId = (routeParams?.id as string) || "";

  const [activeTab, setActiveTab] = useState<TabKey>("OVERVIEW");
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: response, isLoading, error, mutate } = useStudent(studentId);
  const student = response?.data;

  // Edit form state
  const [editForm, setEditForm] = useState<any>({});

  const openEditModal = () => {
    if (!student) return;
    setEditForm({
      name: student.name || "",
      rollNo: student.rollNo || "",
      admissionNo: student.admissionNo || "",
      dob: student.dob ? new Date(student.dob).toISOString().split("T")[0] : "",
      gender: student.gender || "MALE",
      bloodGroup: student.bloodGroup || "",
      address: student.address || "",
      isActive: student.isActive ?? true,
    });
    setErrorMsg("");
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      await apiCall(`/api/v1/students/${studentId}`, "PUT", editForm);
      invalidateAll(`/api/v1/students`);
      setShowEditModal(false);
      mutate();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update student profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-500">Loading canonical student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-red-700 mb-6">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
          <h2 className="text-lg font-bold">Student Record Not Found</h2>
          <p className="text-sm text-red-600 mt-1">
            {error ? (error as Error).message : "No active student record corresponds to this identifier."}
          </p>
        </div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Student Directory
        </Link>
      </div>
    );
  }

  const initials = student.name
    ? student.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  const attendanceSummary = student.attendanceSummary || {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    percentage: 100,
  };

  const feeSummary = student.feeSummary || {
    totalInvoiced: 0,
    totalPaid: 0,
    outstandingBalance: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Breadcrumb & Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors no-underline bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Student Directory
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Profile
          </button>
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* 2. Canonical Student Header Profile Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{student.name}</h1>
                <StatusBadge
                  status={student.isActive ? "Active" : "Inactive"}
                  color={student.isActive ? "#10B981" : "#EF4444"}
                />
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    student.admissionType === "NEW"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : student.admissionType === "READMISSION"
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {student.admissionType === "NEW"
                    ? "New Admission"
                    : student.admissionType === "READMISSION"
                    ? "Re-admission"
                    : "Transfer Admission"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium pt-1">
                <div className="flex items-center gap-1.5 font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                  <span>Adm No:</span>
                  <span className="font-bold">{student.admissionNo || "Pending"}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>
                    Class {student.sectionRef?.class?.name || "Unassigned"} - Section{" "}
                    {student.sectionRef?.name || "A"} (Roll #{student.rollNo || "1"})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Session: {student.sectionRef?.class?.session?.name || "2026-2027"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center gap-6 text-xs text-gray-600 shrink-0 w-full md:w-auto justify-between md:justify-start">
            <div>
              <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">
                Attendance
              </span>
              <span className="text-base font-bold text-gray-900">
                {attendanceSummary.percentage}%
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">
                Fee Balance
              </span>
              <span
                className={`text-base font-bold ${
                  feeSummary.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                ₹{feeSummary.outstandingBalance.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="mt-8 border-b border-gray-200 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { key: "OVERVIEW", label: "Overview", icon: BookOpen },
            { key: "PERSONAL", label: "Personal", icon: User },
            { key: "GUARDIANS", label: "Parents & Guardians", icon: Users },
            { key: "ACADEMICS", label: "Academics & LMS", icon: GraduationCap },
            { key: "ADMISSION", label: "Admission & Verification", icon: Award },
            { key: "FEES", label: "Fees & Ledger", icon: CreditCard },
            { key: "ATTENDANCE", label: "Attendance", icon: CheckCircle2 },
            { key: "DOCUMENTS", label: "Documents", icon: FileText },
            { key: "HISTORY", label: "Lifecycle & History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isSelected
                    ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Content Sections */}
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Academic Placement Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Academic Placement Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <span className="text-gray-400 block mb-0.5">Class Standard</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {student.sectionRef?.class?.name || "Unassigned"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <span className="text-gray-400 block mb-0.5">Section</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {student.sectionRef?.name || "A"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <span className="text-gray-400 block mb-0.5">Roll Number</span>
                    <span className="font-bold text-gray-900 text-sm">{student.rollNo || "1"}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <span className="text-gray-400 block mb-0.5">Academic Session</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {student.sectionRef?.class?.session?.name || "2026-2027"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Guardian Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Primary Guardian Contact
                </h3>
                {student.guardian ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Guardian Name</span>
                      <span className="font-semibold text-gray-900">{student.guardian.primaryName}</span>
                      <span className="text-[11px] text-gray-400 block">
                        ({student.guardian.primaryRelation || "Parent"})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Contact Phone</span>
                      <span className="font-semibold text-gray-900 font-mono">
                        {student.guardian.primaryPhone}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Email Address</span>
                      <span className="font-semibold text-gray-900">
                        {student.guardian.primaryEmail || "No Email Recorded"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No primary guardian linked to this student record.</p>
                )}
              </div>

              {/* Recent Timeline Events */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  Recent Lifecycle Events
                </h3>
                <div className="space-y-3">
                  {(student.timelines || []).slice(0, 3).map((tl: any) => (
                    <div key={tl.id} className="flex items-start gap-3 text-xs p-3 rounded-xl bg-gray-50">
                      <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{tl.title}</span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(tl.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-gray-600 text-[11px] mt-0.5">{tl.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Portal Account & Quick Stats */}
            <div className="space-y-6">
              {/* Student Portal Account */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Student Portal Account
                </h3>
                {student.user ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Username / Email</span>
                      <span className="font-mono text-gray-900 font-semibold">{student.user.email}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Account Status</span>
                      <StatusBadge
                        status={student.user.isActive ? "Active" : "Disabled"}
                        color={student.user.isActive ? "#10B981" : "#EF4444"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Account Created</span>
                      <span className="text-gray-700 font-medium">
                        {new Date(student.user.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    No portal user account currently attached to this student record.
                  </div>
                )}
              </div>

              {/* Institution Identity */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <School className="w-4 h-4 text-emerald-600" />
                  Institution Scope
                </h3>
                <div className="text-xs space-y-1.5">
                  <div className="font-semibold text-gray-900">{student.school?.name}</div>
                  <div className="text-gray-500 font-mono">Code: {student.school?.code}</div>
                  <div className="text-gray-400 text-[11px] pt-1">
                    Internal Identifier: <span className="font-mono">{student.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL INFORMATION */}
        {activeTab === "PERSONAL" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-6">Personal Demographics & Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-gray-400 block mb-1">Full Legal Name</span>
                <span className="font-semibold text-gray-900 text-sm">{student.name}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Date of Birth</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {student.dob ? new Date(student.dob).toLocaleDateString("en-IN") : "Not Recorded"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Gender</span>
                <span className="font-semibold text-gray-900 text-sm uppercase">{student.gender || "OTHER"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Blood Group</span>
                <span className="font-semibold text-gray-900 text-sm">{student.bloodGroup || "Not Specified"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Permanent Education Number (PEN)</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{student.pen || "Not Provided"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Category & Social Classification</span>
                <span className="font-semibold text-gray-900 text-sm">{student.category || "GENERAL"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Religion</span>
                <span className="font-semibold text-gray-900 text-sm">{student.religion || "Not Specified"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Nationality</span>
                <span className="font-semibold text-gray-900 text-sm">{student.nationality || "Indian"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Mother Tongue</span>
                <span className="font-semibold text-gray-900 text-sm">{student.motherTongue || "Odia"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Locality / Sector</span>
                <span className="font-semibold text-gray-900 text-sm">{student.locality || "Not Specified"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Postal PIN Code</span>
                <span className="font-mono font-semibold text-gray-900 text-sm">{student.pincode || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Emergency Phone</span>
                <span className="font-mono font-bold text-red-600 text-sm">{student.emergencyPhone || "Same as Guardian"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Permanent Admission Number</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{student.admissionNo || "Pending"}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Enrolled Date</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {new Date(student.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-gray-400 block mb-1">Medical Conditions / Information</span>
                <span className="font-medium text-gray-700 text-sm">
                  {student.medicalInfo || "None reported on admission form."}
                </span>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-gray-400 block mb-1">Residential Address</span>
                <span className="font-medium text-gray-900 text-sm">
                  {student.address || "No residential address provided on form."}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GUARDIANS */}
        {activeTab === "GUARDIANS" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-6">Parent & Guardian Relationships</h3>
              {student.guardian ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-1">Primary Guardian Name</span>
                    <span className="font-semibold text-gray-900 text-sm">{student.guardian.primaryName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">Relationship to Student</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {student.guardian.primaryRelation || "Father"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">Mobile Contact</span>
                    <span className="font-mono font-bold text-gray-900 text-sm">
                      {student.guardian.primaryPhone}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">Email Address</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {student.guardian.primaryEmail || "No Email Recorded"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">Secondary Contact Person</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {student.guardian.secondaryName || "Not Recorded"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">Secondary Contact Phone</span>
                    <span className="font-mono text-gray-900 text-sm">
                      {student.guardian.secondaryPhone || "Not Recorded"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No guardian details on record for this student.</p>
              )}
            </div>

            {/* Sibling Relationships */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Siblings Sharing Same Guardian ({student.guardian?.students?.length || 0})
              </h3>
              {(student.guardian?.students || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {student.guardian.students.map((sib: any) => (
                    <div
                      key={sib.id}
                      className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">{sib.name}</span>
                        <span className="text-gray-500 text-[11px]">
                          Adm No: {sib.admissionNo} • Class: {sib.sectionRef?.class?.name || "Standard"}
                        </span>
                      </div>
                      <Link
                        href={`/admin/students/${sib.id}`}
                        className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-blue-600 font-medium text-xs hover:bg-blue-50 no-underline"
                      >
                        View Profile
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No other siblings are linked to this primary guardian.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACADEMICS & LMS */}
        {activeTab === "ACADEMICS" && (
          <div className="space-y-6">
            {/* Examination Marks */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Examination Marks & Assessments ({(student.marks || []).length})
              </h3>
              {(student.marks || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="p-3 font-semibold text-gray-600">Exam</th>
                        <th className="p-3 font-semibold text-gray-600">Subject</th>
                        <th className="p-3 font-semibold text-gray-600">Score Obtained</th>
                        <th className="p-3 font-semibold text-gray-600">Max Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {student.marks.map((m: any) => (
                        <tr key={m.id}>
                          <td className="p-3 font-medium text-gray-900">{m.exam?.name || "Terminal Exam"}</td>
                          <td className="p-3 text-gray-700">{m.subject?.name || "Subject"}</td>
                          <td className="p-3 font-bold text-blue-600">{m.obtainedMarks}</td>
                          <td className="p-3 text-gray-500">{m.maxMarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No examination mark sheets recorded for this session yet.</p>
              )}
            </div>

            {/* LMS Submissions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Classroom LMS Assignment Submissions ({(student.submissions || []).length})
              </h3>
              {(student.submissions || []).length > 0 ? (
                <div className="space-y-2">
                  {student.submissions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-gray-900 block">
                          {sub.assignment?.title || "Classwork Assignment"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Submitted on {new Date(sub.submittedAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <StatusBadge
                        status={sub.status}
                        color={sub.status === "GRADED" ? "#10B981" : "#3B82F6"}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No assignment submissions uploaded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ADMISSION & VERIFICATION */}
        {activeTab === "ADMISSION" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-gray-900">Official Admission Record & Attestation</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-gray-400 block mb-1">Admission Type</span>
                <span className="font-bold text-gray-900 text-sm">{student.admissionType}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Permanent Admission Number</span>
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {student.admissionNo || "Pending Allocation"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Registration Date</span>
                <span className="font-semibold text-gray-900 text-sm">
                  {new Date(student.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {student.admissionRecord && (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Offline Administrative Approval Attestation</span>
                </div>
                <p className="text-blue-800 leading-relaxed font-medium">
                  {student.admissionRecord.remarks || "Offline admission verified by authority."}
                </p>
                <div className="text-[11px] text-blue-600 pt-1 border-t border-blue-200 flex items-center justify-between">
                  <span>Enrolled Class: {student.admissionRecord.applyingForClass}</span>
                  <span>Registered: {new Date(student.admissionRecord.appliedAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
            )}

            {/* Previous Education & Incoming Transfer Certificate Card */}
            {(student.previousSchool || student.tcNumber || student.admissionType === "TRANSFER") && (
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Previous Education & Incoming Transfer Certificate</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800 uppercase">
                    {student.tcStatus || "SUBMITTED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-xs">
                  <div>
                    <span className="text-amber-700 block mb-0.5 font-medium">Previous Institution</span>
                    <span className="font-bold text-gray-900 text-sm">{student.previousSchool || "Not Specified"}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 block mb-0.5 font-medium">Board / Affiliation</span>
                    <span className="font-semibold text-gray-900">{student.previousBoard || "CBSE / State Board"}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 block mb-0.5 font-medium">Last Class Completed</span>
                    <span className="font-semibold text-gray-900">{student.previousClass || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 block mb-0.5 font-medium">Transfer Certificate Number</span>
                    <span className="font-mono font-bold text-amber-900">{student.tcNumber || "Pending Clearance"}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 block mb-0.5 font-medium">TC Issue Date</span>
                    <span className="font-semibold text-gray-900">
                      {student.tcDate ? new Date(student.tcDate).toLocaleDateString("en-IN") : "Not Recorded"}
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-700 block mb-0.5 font-medium">Previous Roll / Serial</span>
                    <span className="font-mono text-gray-800">{student.previousRollNo || "N/A"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FEES & LEDGER */}
        {activeTab === "FEES" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 font-medium block mb-1">Total Invoiced</span>
                <span className="text-xl font-bold text-gray-900">
                  ₹{feeSummary.totalInvoiced.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 font-medium block mb-1">Total Paid Amount</span>
                <span className="text-xl font-bold text-emerald-600">
                  ₹{feeSummary.totalPaid.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 font-medium block mb-1">Outstanding Balance</span>
                <span
                  className={`text-xl font-bold ${
                    feeSummary.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  ₹{feeSummary.outstandingBalance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Fee Invoices ({(student.invoices || []).length})
              </h3>
              {(student.invoices || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="p-3 font-semibold text-gray-600">Invoice #</th>
                        <th className="p-3 font-semibold text-gray-600">Due Date</th>
                        <th className="p-3 font-semibold text-gray-600">Amount</th>
                        <th className="p-3 font-semibold text-gray-600">Paid</th>
                        <th className="p-3 font-semibold text-gray-600">Balance</th>
                        <th className="p-3 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {student.invoices.map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="p-3 font-mono font-semibold text-gray-900">{inv.invoiceNumber}</td>
                          <td className="p-3 text-gray-600">{new Date(inv.dueDate).toLocaleDateString("en-IN")}</td>
                          <td className="p-3 font-semibold">₹{Number(inv.amount).toLocaleString("en-IN")}</td>
                          <td className="p-3 text-emerald-600">₹{Number(inv.paidAmount).toLocaleString("en-IN")}</td>
                          <td className="p-3 font-bold text-amber-600">₹{Number(inv.balance).toLocaleString("en-IN")}</td>
                          <td className="p-3">
                            <StatusBadge
                              status={inv.status}
                              color={inv.status === "PAID" ? "#10B981" : "#F59E0B"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No invoices have been generated for this student.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: ATTENDANCE */}
        {activeTab === "ATTENDANCE" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-6">Attendance Metrics & Performance</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-gray-50 text-center">
                  <span className="text-xs text-gray-400 block mb-1">Total Sessions</span>
                  <span className="text-xl font-bold text-gray-900">{attendanceSummary.totalDays}</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 text-center">
                  <span className="text-xs text-emerald-600 block mb-1">Present</span>
                  <span className="text-xl font-bold text-emerald-700">{attendanceSummary.presentDays}</span>
                </div>
                <div className="p-4 rounded-xl bg-red-50 text-center">
                  <span className="text-xs text-red-600 block mb-1">Absent</span>
                  <span className="text-xl font-bold text-red-700">{attendanceSummary.absentDays}</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 text-center">
                  <span className="text-xs text-amber-600 block mb-1">Late Attendance</span>
                  <span className="text-xl font-bold text-amber-700">{attendanceSummary.lateDays}</span>
                </div>
              </div>

              {/* Recent Logs */}
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Recent Daily Roll-call Records
              </h4>
              {(student.attendance || []).length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {student.attendance.map((att: any) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold text-gray-800">
                          {new Date(att.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <StatusBadge
                        status={att.status}
                        color={att.status === "PRESENT" ? "#10B981" : "#EF4444"}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No daily attendance logs recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: DOCUMENTS & CERTIFICATES */}
        {activeTab === "DOCUMENTS" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Verified Student Documents ({(student.documents || []).length})
              </h3>
              {(student.documents || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {student.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/75 flex flex-col justify-between text-xs space-y-3"
                    >
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px] mb-1">
                          {doc.category}
                        </span>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {doc.title || "Official Document"}
                        </h4>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          Uploaded: {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium no-underline pt-2 border-t border-gray-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Document
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No documents attached to this student record.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: LIFECYCLE & HISTORY */}
        {activeTab === "HISTORY" && (
          <div className="space-y-6">
            {/* Student Lifecycle Timelines */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Chronological Student Timelines ({(student.timelines || []).length})
              </h3>
              <div className="space-y-4">
                {(student.timelines || []).map((tl: any, i: number) => (
                  <div key={tl.id} className="relative flex items-start gap-4 text-xs">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-sm">{tl.title}</span>
                        <span className="text-gray-400 text-[11px]">
                          {new Date(tl.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{tl.description}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[10px] font-mono font-semibold">
                        {tl.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                System Audit Trail ({(student.auditLogs || []).length})
              </h3>
              {(student.auditLogs || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="p-3 font-semibold text-gray-600">Action</th>
                        <th className="p-3 font-semibold text-gray-600">Actor</th>
                        <th className="p-3 font-semibold text-gray-600">Details</th>
                        <th className="p-3 font-semibold text-gray-600">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {student.auditLogs.map((log: any) => (
                        <tr key={log.id}>
                          <td className="p-3 font-mono font-bold text-gray-900">{log.action}</td>
                          <td className="p-3 text-gray-700">{log.user?.name || "System"}</td>
                          <td className="p-3 text-gray-600 max-w-xs truncate">{log.details || "—"}</td>
                          <td className="p-3 text-gray-400">
                            {new Date(log.createdAt).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No administrative audit entries logged.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal: Edit Student Information */}
      <AnimatePresence>
        {showEditModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[550px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 z-[101] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">Edit Student Details</h3>
                <button
                  onClick={() => setShowEditModal(false)}
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

              <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
                <div>
                  <label className="font-medium text-gray-700 block mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Roll Number</label>
                    <input
                      type="text"
                      value={editForm.rollNo || ""}
                      onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Gender</label>
                    <select
                      value={editForm.gender || "MALE"}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editForm.dob || ""}
                      onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-gray-700 block mb-1">Blood Group</label>
                    <input
                      type="text"
                      placeholder="e.g. O+, B+"
                      value={editForm.bloodGroup || ""}
                      onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-gray-700 block mb-1">Residential Address</label>
                  <textarea
                    rows={2}
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-gray-700">
                    Active Student Status in Register
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {saving ? "Saving Changes..." : "Save Profile Changes"}
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

