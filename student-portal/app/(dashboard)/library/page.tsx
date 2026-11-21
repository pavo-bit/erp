"use client";

import { useMyLibrary } from "@/lib/student-api-hooks";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/DataTable";

export default function LibraryPage() {
  const { data: libraryData, isLoading } = useMyLibrary();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading library records...
      </div>
    );
  }

  const issues = Array.isArray(libraryData) ? libraryData : (libraryData?.data || []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Library Books"
        subtitle="Track your currently issued books, due dates, and return history."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {issues.map((issue: any) => {
          const isOverdue =
            issue.status === "ISSUED" && new Date(issue.dueDate) < new Date();

          return (
            <div
              key={issue.id}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      issue.status === "RETURNED"
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : isOverdue
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {issue.status === "RETURNED"
                      ? "Returned"
                      : isOverdue
                      ? "Overdue"
                      : "Issued"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">
                  {issue.book?.title || "Library Book"}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {issue.book?.author || "Author Unknown"} • ISBN: {issue.book?.isbn || "—"}
                </p>

                <div className="space-y-2 py-3 border-t border-slate-100 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Issued Date:</span>
                    <strong className="text-slate-900">
                      {new Date(issue.issueDate).toLocaleDateString()}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Due Date:</span>
                    <strong
                      className={isOverdue ? "text-rose-600 font-bold" : "text-slate-900"}
                    >
                      {new Date(issue.dueDate).toLocaleDateString()}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {issues.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Books Currently Issued</h3>
            <p className="text-sm text-slate-500">
              You do not have any active books borrowed from the school library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
