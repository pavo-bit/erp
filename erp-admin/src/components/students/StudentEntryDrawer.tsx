"use client";

import React, { useState, useEffect } from "react";
import { SlideOverDrawer } from "@/components/ui/SlideOverDrawer";
import { ConfirmDiscardModal } from "@/components/ui/ConfirmDiscardModal";
import { apiCall, invalidateAll } from "@/lib/api-hooks";
import {
  User,
  GraduationCap,
  Users,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  Building,
  Bus,
} from "lucide-react";

interface StudentEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: { id: string; admissionNo: string; name: string }) => void;
  defaultSession?: string;
  defaultClass?: string;
  defaultSection?: string;
}

interface StudentFormData {
  firstName: string;
  lastName: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  bloodGroup: string;
  admissionNo: string;
  rollNo: string;
  session: string;
  className: string;
  section: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelation: string;
  address: string;
  hostelRequired: boolean;
  transportRequired: boolean;
}

const INITIAL_FORM_DATA: StudentFormData = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "MALE",
  bloodGroup: "O+",
  admissionNo: "",
  rollNo: "1",
  session: "2026-2027",
  className: "10",
  section: "A",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianRelation: "Father",
  address: "",
  hostelRequired: false,
  transportRequired: false,
};

export function StudentEntryDrawer({
  isOpen,
  onClose,
  onSuccess,
  defaultSession = "2026-2027",
  defaultClass = "10",
  defaultSection = "A",
}: StudentEntryDrawerProps) {
  const [formData, setFormData] = useState<StudentFormData>(() => ({
    ...INITIAL_FORM_DATA,
    session: defaultSession,
    className: defaultClass,
    section: defaultSection,
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Update session/class defaults if props change
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        session: defaultSession,
        className: defaultClass,
        section: defaultSection,
      }));
      setErrorMsg(null);
      setValidationErrors({});
    }
  }, [isOpen, defaultSession, defaultClass, defaultSection]);

  // Check if form is dirty
  const isDirty =
    formData.firstName.trim() !== "" ||
    formData.lastName.trim() !== "" ||
    formData.guardianName.trim() !== "" ||
    formData.guardianPhone.trim() !== "" ||
    formData.admissionNo.trim() !== "" ||
    formData.address.trim() !== "";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

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

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.className.trim()) {
      errors.className = "Class is required";
    }
    if (!formData.section.trim()) {
      errors.section = "Section is required";
    }
    if (formData.guardianPhone.trim() && !/^\d{10}$/.test(formData.guardianPhone.trim())) {
      errors.guardianPhone = "Guardian phone must be a 10-digit number";
    }
    if (
      formData.guardianEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardianEmail.trim())
    ) {
      errors.guardianEmail = "Please enter a valid email address";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const fullName = formData.lastName.trim()
      ? `${formData.firstName.trim()} ${formData.lastName.trim()}`
      : formData.firstName.trim();

    const payload = {
      name: fullName,
      admissionNo: formData.admissionNo.trim() || undefined,
      rollNo: formData.rollNo.trim() || "1",
      class: formData.className.trim(),
      className: formData.className.trim(),
      section: formData.section.trim(),
      session: formData.session.trim(),
      dob: formData.dob || undefined,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup,
      address: formData.address.trim() || undefined,
      guardianName: formData.guardianName.trim() || undefined,
      guardianPhone: formData.guardianPhone.trim() || undefined,
      guardianEmail: formData.guardianEmail.trim() || undefined,
      guardianRelation: formData.guardianRelation,
    };

    try {
      const response = await apiCall("/api/v1/students", "POST", payload);
      invalidateAll("/api/v1/students");

      const created = response?.data || response;
      const returnedAdmissionNo =
        created?.admissionNo || formData.admissionNo || "ADM-REGISTERED";
      const returnedId = created?.id || "student-created";

      onSuccess({
        id: returnedId,
        admissionNo: returnedAdmissionNo,
        name: fullName,
      });
    } catch (err: any) {
      setErrorMsg(
        err.message || "Failed to register student record. Please check the values entered."
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
        title="Register New Student"
        subtitle="Permanent official institutional admission & enrollment record"
        badge="Official Register"
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
                  <span>Committing Record...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Student</span>
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
                <span className="font-bold">Error saving record: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Section 1 — Personal Details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 1 — Personal Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="e.g. Aarav"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.firstName ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {validationErrors.firstName && (
                  <p className="text-[12px] text-rose-600 mt-1 font-medium">
                    {validationErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 — Admission & Academic Details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <GraduationCap className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 2 — Admission Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Admission Number
                  <span className="text-[11px] font-normal text-slate-400 ml-1">
                    (Auto-generated if empty)
                  </span>
                </label>
                <input
                  type="text"
                  name="admissionNo"
                  value={formData.admissionNo}
                  onChange={handleChange}
                  placeholder="e.g. ADM-2026-0042"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  placeholder="e.g. 15"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Academic Session <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Class <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="className"
                    value={formData.className}
                    onChange={handleChange}
                    placeholder="e.g. 10"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {validationErrors.className && (
                    <p className="text-[11px] text-rose-600 mt-1">{validationErrors.className}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                    Section <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    placeholder="e.g. A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {validationErrors.section && (
                    <p className="text-[11px] text-rose-600 mt-1">{validationErrors.section}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 — Guardian & Multi-Child Link Details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Users className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 3 — Guardian Details
              </h3>
            </div>

            <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
              Entering an existing guardian&apos;s phone number automatically associates this student with the same family parent account.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Primary Guardian Name
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Relationship
                </label>
                <select
                  name="guardianRelation"
                  value={formData.guardianRelation}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Legal Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Guardian Mobile Number
                </label>
                <input
                  type="tel"
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.guardianPhone ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {validationErrors.guardianPhone && (
                  <p className="text-[12px] text-rose-600 mt-1">{validationErrors.guardianPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  Guardian Email
                </label>
                <input
                  type="email"
                  name="guardianEmail"
                  value={formData.guardianEmail}
                  onChange={handleChange}
                  placeholder="e.g. guardian@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.guardianEmail ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {validationErrors.guardianEmail && (
                  <p className="text-[12px] text-rose-600 mt-1">{validationErrors.guardianEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4 — Additional Information & Address */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 4 — Residential Address
              </h3>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                Permanent Residential Address
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Street, locality, city, state and PIN code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Section 5 — Campus Facilities Allocation */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Building className="w-4 h-4 text-blue-700" />
              <h3 className="text-[15px] font-bold text-slate-900 font-[var(--font-heading)]">
                Section 5 — Campus Facilities Allocation
              </h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  name="hostelRequired"
                  checked={formData.hostelRequired}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hostel Facility Requested</span>
                  </div>
                  <div className="text-[12px] text-slate-500">
                    Flag for warden room allocation review upon admission confirmation.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  name="transportRequired"
                  checked={formData.transportRequired}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-slate-500" />
                    <span>School Bus Transport Requested</span>
                  </div>
                  <div className="text-[12px] text-slate-500">
                    Flag for transport route and bus-stop assignment.
                  </div>
                </div>
              </label>
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
