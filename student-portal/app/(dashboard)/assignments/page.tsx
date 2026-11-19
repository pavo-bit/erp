"use client";

import { useState } from "react";
import { useMyAssignments } from "@/lib/student-api-hooks";
import { BookOpen, Calendar, Clock, CheckCircle2, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/DataTable";

export default function AssignmentsPage() {
  const { data: assignmentsData, isLoading } = useMyAssignments("current-section");
  const [activeTab, setActiveTab] = useState("pending");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading assignments...
      </div>
    );
  }

  const assignments = assignmentsData?.data || [];

  const filteredAssignments = assignments.filter((a: any) => {
    if (activeTab === "pending") return !a.isSubmitted;
    if (activeTab === "submitted") return a.isSubmitted && !a.isGraded;
    if (activeTab === "graded") return a.isGraded;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="My Assignments"
        subtitle="View, submit, and track your classroom coursework and homework."
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-max border border-slate-200">
        {["pending", "submitted", "graded"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAssignments.map((assignment: any) => (
          <div
            key={assignment.id}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {assignment.subject?.name || "General Subject"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    assignment.isGraded
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : assignment.isSubmitted
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {assignment.isGraded
                    ? "Graded"
                    : assignment.isSubmitted
                    ? "Submitted"
                    : "Due Soon"}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {assignment.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {assignment.description || "Complete the exercises as instructed by faculty."}
              </p>

              <div className="space-y-2 py-3 border-t border-slate-100">
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  <span>
                    Due:{" "}
                    <strong className="text-slate-900">
                      {assignment.dueDate
                        ? new Date(assignment.dueDate).toLocaleDateString()
                        : "Not specified"}
                    </strong>
                  </span>
                </div>
                {assignment.maxMarks && (
                  <div className="flex items-center text-sm text-slate-600">
                    <FileText className="w-4 h-4 mr-2 text-slate-400" />
                    <span>Max Marks: {assignment.maxMarks}</span>
                  </div>
                )}
              </div>
            </div>

            {assignment.marks !== undefined && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Marks Scored:</span>
                <span className="font-bold text-emerald-700 text-base">
                  {assignment.marks} / {assignment.maxMarks}
                </span>
              </div>
            )}
          </div>
        ))}

        {filteredAssignments.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">All Caught Up!</h3>
            <p className="text-sm text-slate-500">
              No {activeTab} assignments found in this section.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
