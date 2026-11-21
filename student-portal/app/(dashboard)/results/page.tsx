"use client";

import { useMyExams } from "@/lib/student-api-hooks";
import { Award, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/DataTable";

export default function ResultsPage() {
  const { data: examsData, isLoading } = useMyExams("current-class");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading examination results...
      </div>
    );
  }

  const exams = Array.isArray(examsData) ? examsData : (examsData?.data || []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Examination Results"
        subtitle="View your academic performance, score summaries, and official report cards."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam: any) => (
          <div
            key={exam.id}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <Award className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Published
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{exam.name}</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={`/results/${exam.id}`}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-sm font-semibold transition-colors no-underline"
            >
              <FileText className="w-4 h-4" />
              <span>View Report Card</span>
            </Link>
          </div>
        ))}

        {exams.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Results Published</h3>
            <p className="text-sm text-slate-500">
              No examination results have been published for your class session yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
