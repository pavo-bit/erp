"use client";

import { useMyTimetable } from "@/lib/student-api-hooks";
import { Calendar, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/DataTable";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function TimetablePage() {
  const { data: timetableData, isLoading } = useMyTimetable("current-section");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading weekly timetable...
      </div>
    );
  }

  const timetable = timetableData?.data || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="My Timetable"
        subtitle="Your assigned weekly schedule of class periods, subjects, and faculty."
      />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 w-28 text-center border-r border-slate-200">Period</th>
                {DAYS.map((day) => (
                  <th key={day} className="p-4 text-center border-r border-slate-200 last:border-r-0">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {PERIODS.map((period) => (
                <tr key={period} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono font-bold text-center text-slate-700 bg-slate-50/50 border-r border-slate-200">
                    Period {period}
                  </td>
                  {DAYS.map((day) => {
                    const entry = timetable.find(
                      (t: any) =>
                        t.dayOfWeek?.toLowerCase() === day.toLowerCase() &&
                        t.periodNumber === period
                    );

                    return (
                      <td
                        key={day}
                        className="p-3 text-center border-r border-slate-100 last:border-r-0 h-20 align-top"
                      >
                        {entry ? (
                          <div className="h-full p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col justify-center">
                            <span className="font-bold text-blue-900 text-[13px] leading-tight">
                              {entry.subject?.name || "Class"}
                            </span>
                            {entry.teacher?.user?.name && (
                              <span className="text-[11px] text-blue-700 mt-1">
                                {entry.teacher.user.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-300 text-xs">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
