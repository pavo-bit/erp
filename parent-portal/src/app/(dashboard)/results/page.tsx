"use client";

import { useState } from "react";
import { GraduationCap, Download, Trophy, FileText, ChevronDown } from "lucide-react";
import { useResults } from "@/lib/api-hooks";

export default function ResultsPage() {
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const { data: resultsData, isLoading } = useResults();

  const exams = Array.isArray(resultsData) ? resultsData : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Results & Marks</h1>
          <p className="text-slate-500 dark:text-slate-400">View performance reports and download digital report cards.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500">Loading student results...</div>
      ) : exams.length === 0 ? (
        <div className="p-12 text-center glass-card border border-slate-200 dark:border-slate-800 rounded-2xl">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Published Examination Results</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            Exam results and report cards will appear here once published by the academic department.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam: any) => (
            <div key={exam.id} className="glass-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedExam(expandedExam === exam.id ? null : exam.id)}
              >
                <div>
                  <h3 className="text-lg font-bold">{exam.examName || exam.name || "Term Exam"}</h3>
                  <p className="text-sm text-slate-500">{exam.date || new Date().toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-blue-600">{exam.percentage || exam.grade || "Completed"}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedExam === exam.id ? "rotate-180" : ""}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
