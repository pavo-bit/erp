"use client";

import { useMyTimetable } from "@/lib/student-api-hooks";
import { Clock, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

export default function TimetablePage() {
  const { data: timetableData, isLoading } = useMyTimetable("current-section");
  
  if (isLoading) return <div className="p-8 text-white">Loading timetable...</div>;

  const timetable = timetableData?.data || [];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto overflow-x-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Timetable</h1>
        <p className="text-white/60">Your weekly class schedule.</p>
      </div>

      <div className="min-w-[800px] bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
          <div className="p-4 text-white/40 font-medium flex items-center justify-center border-r border-white/10">
            <Clock className="w-5 h-5" />
          </div>
          {days.map(day => (
            <div key={day} className="p-4 text-center font-medium text-white border-r border-white/10 last:border-0">
              {day}
            </div>
          ))}
        </div>

        {periods.map(period => (
          <div key={period} className="grid grid-cols-7 border-b border-white/10 last:border-0">
            <div className="p-4 flex flex-col items-center justify-center border-r border-white/10 bg-white/[0.02]">
              <span className="text-white font-semibold">P{period}</span>
            </div>
            
            {days.map(day => {
              // Find slot for this day and period
              const daySchedule = timetable.find((t: any) => t.day === day);
              const slot = daySchedule?.slots?.find((s: any) => s.period === period);

              return (
                <div key={`${day}-${period}`} className="p-4 border-r border-white/10 last:border-0 hover:bg-white/5 transition-colors group min-h-[100px]">
                  {slot ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center space-y-1"
                    >
                      <span className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                        {slot.teacherSubjectAssignment?.subject?.name || "Subject"}
                      </span>
                      <span className="text-xs text-white/50">
                        {slot.teacherSubjectAssignment?.teacher?.user?.name || "Teacher"}
                      </span>
                      <span className="text-[10px] text-white/30 pt-1">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-white/20 text-sm">
                      Free Period
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
