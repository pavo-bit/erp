"use client";

import { useState } from "react";
import { useMyAssignments } from "@/lib/student-api-hooks";
import { motion } from "framer-motion";
import { BookOpen, Calendar, Clock, CheckCircle, FileText } from "lucide-react";
import Link from "next/link";

export default function AssignmentsPage() {
  const { data: assignmentsData, isLoading } = useMyAssignments("current-section");
  const [activeTab, setActiveTab] = useState("pending");

  if (isLoading) return <div className="p-8 text-white">Loading assignments...</div>;

  const assignments = assignmentsData?.data || [];
  
  const filteredAssignments = assignments.filter((a: any) => {
    if (activeTab === "pending") return !a.isSubmitted;
    if (activeTab === "submitted") return a.isSubmitted && !a.isGraded;
    if (activeTab === "graded") return a.isGraded;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Assignments</h1>
        <p className="text-white/60">View, submit, and track your coursework.</p>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-md rounded-xl w-max border border-white/10">
        {["pending", "submitted", "graded"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white/20 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAssignments.map((assignment: any) => (
          <motion.div
            key={assignment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
                  <p className="text-sm text-white/60">{assignment.subject?.name || "General Subject"}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                assignment.isGraded ? "bg-green-500/20 text-green-400" :
                assignment.isSubmitted ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {assignment.isGraded ? "Graded" : assignment.isSubmitted ? "Submitted" : "Pending"}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-white/70">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-sm text-white/70">
                <FileText className="w-4 h-4 mr-2" />
                <span className="line-clamp-1">{assignment.description}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="text-sm text-white/60">
                Max Marks: {assignment.maxMarks || 100}
              </div>
              <Link 
                href={`/assignments/${assignment.id}`}
                className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium transition-colors flex items-center gap-2"
              >
                {activeTab === "pending" ? "Submit Work" : "View Details"}
              </Link>
            </div>
          </motion.div>
        ))}

        {filteredAssignments.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white/5 border border-white/10 border-dashed">
            <CheckCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">All Caught Up!</h3>
            <p className="text-white/60">No {activeTab} assignments at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
