"use client";

import React, { useState, useEffect } from "react";
import { SlideOverDrawer } from "@/components/ui/SlideOverDrawer";
import { ConfirmDiscardModal } from "@/components/ui/ConfirmDiscardModal";
import { apiCall, invalidateAll } from "@/lib/api-hooks";
import {
  User,
  Briefcase,
  BookOpen,
  KeyRound,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface TeacherEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: { id: string; name: string; employeeId?: string }) => void;
}

interface TeacherFormData {
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  designation: string;
  department: string;
  qualification: string;
  experience: string;
  subjects: string;
  password?: string;
}

const INITIAL_FORM: TeacherFormData = {
  name: "",
  email: "",
  phone: "",
  employeeId: "",
  designation: "Assistant Teacher",
  department: "Academics",
  qualification: "B.Ed / M.Sc",
  experience: "3 years",
  subjects: "",
  password: "",
};

export function TeacherEntryDrawer({
  isOpen,
  onClose,
  onSuccess,
}: TeacherEntryDrawerProps) {
  const [formData, setFormData] = useState<TeacherFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM);
      setErrorMsg(null);
      setValidationErrors({});
    }
  }, [isOpen]);

  const isDirty =
    formData.name.trim() !== "" ||
    formData.email.trim() !== "" ||
    formData.phone.trim() !== "" ||
    formData.employeeId.trim() !== "" ||
    formData.subjects.trim() !== "";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Teacher name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (formData.phone.trim() && !/^\d{10}$/.test(formData.phone.trim())) {
      errors.phone = "Phone number must be 10 digits";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || undefined,
      employeeId: formData.employeeId.trim() || undefined,
      designation: formData.designation.trim() || "Teacher",
      department: formData.department.trim() || undefined,
      qualification: formData.qualification.trim() || undefined,
      experience: formData.experience.trim() || undefined,
      subjects: formData.subjects.trim() || undefined,
      password: formData.password?.trim() || "teacher123",
    };

    try {
      const response = await apiCall("/api/v1/teachers", "POST", payload);
      invalidateAll("/api/v1/teachers");

      const created = response?.data || response;
      const returnedId = created?.id || "teacher-created";

      onSuccess({
        id: returnedId,
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim() || undefined,
      });
    } catch (err: any) {
      setErrorMsg(
        err.message || "Failed to create faculty record. Please verify the information entered."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <SlideOverDrawer
        isOpen={isOpen}
        onClose={handleRequestClose}
        title="Add Faculty & Staff Member"
        subtitle="Permanent institutional faculty appointment & portal access provisioning"
        badge="Staff Directory"
        isDirty={isDirty}
        onConfirmClose={() => setShowDiscardConfirm(true)}
        width="2xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer border-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 cursor-pointer border-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Committing Staff Record...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Faculty Member</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[13px] text-rose-800">
                <span className="font-bold">Error creating teacher: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Section 1 — Personal & Contact Details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 1 — Personal Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Sunita Patra"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.name ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-[12px] text-rose-600 mt-1 font-medium">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Institutional Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. s.patra@ssvm.edu"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.email ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {validationErrors.email && (
                  <p className="text-[12px] text-rose-600 mt-1 font-medium">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Contact Mobile Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.phone ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {validationErrors.phone && (
                  <p className="text-[12px] text-rose-600 mt-1 font-medium">{validationErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 — Employment & Credentials */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 2 — Employment Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Employee / Staff ID
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="e.g. EMP-2026-104"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Senior PGT Teacher"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Academics">Academics</option>
                  <option value="Science & Mathematics">Science & Mathematics</option>
                  <option value="Humanities & Languages">Humanities & Languages</option>
                  <option value="Sports & Physical Education">Sports & Physical Education</option>
                  <option value="Computer Science & ICT">Computer Science & ICT</option>
                  <option value="Administration & Operations">Administration & Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Highest Qualification
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g. M.Sc., B.Ed."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Prior Experience
                </label>
                <input
                  type="text"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g. 5 years teaching secondary mathematics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3 — Teaching Subjects */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 3 — Teaching Subjects
              </h3>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                Primary Subjects
                <span className="text-[11px] font-normal text-slate-400 ml-1">
                  (Comma-separated)
                </span>
              </label>
              <input
                type="text"
                name="subjects"
                value={formData.subjects}
                onChange={handleChange}
                placeholder="e.g. Mathematics, Physics, Advanced Statistics"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[12px] text-slate-500 mt-1.5">
                Class and timetable allocations will be assigned separately through Academic Operations & Timetable management.
              </p>
            </div>
          </div>

          {/* Section 4 — Account Security */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <KeyRound className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 4 — Portal Account Access
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Initial Portal Password
                  <span className="text-[11px] font-normal text-slate-400 ml-1">
                    (Defaults to &apos;teacher123&apos; if left blank)
                  </span>
                </label>
                <input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="teacher123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[12px] text-blue-800 leading-relaxed">
                A system onboarding email will be delivered to the teacher&apos;s email address with instructions to reset their password upon initial login to the Teacher Portal.
              </div>
            </div>
          </div>
        </form>
      </SlideOverDrawer>

      <ConfirmDiscardModal
        isOpen={showDiscardConfirm}
        onKeepEditing={() => setShowDiscardConfirm(false)}
        onDiscard={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
      />
    </>
  );
}
