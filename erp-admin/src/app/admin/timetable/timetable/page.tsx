"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/DashboardLayout";
import { useTimetable } from "@/lib/api-hooks";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

export default function TimetablePage() {
  const { data: raw, isLoading } = useTimetable();
  const timetables = Array.isArray(raw) ? raw : raw?.data || [];

  // Group by class-section
  const grouped: Record<string, Record<string, unknown>[]> = {};
  for (const tt of timetables) {
    const key = `${(tt as Record<string, string>).class}-${(tt as Record<string, string>).section}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tt as Record<string, unknown>);
  }

  return (
    <>
      <PageHeader title="Timetable Management" subtitle="View and manage class timetables and teacher schedules" />

      {isLoading ? (
        <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-border p-12 text-center">
          <p className="text-[40px] mb-3">📅</p>
          <p className="text-[15px] font-semibold text-text-primary mb-1">No timetables configured</p>
          <p className="text-[13px] text-text-secondary">Timetables will appear here once created via the API.</p>
        </motion.div>
      ) : (
        Object.entries(grouped).map(([classSection, days]) => (
          <motion.div key={classSection} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-border p-6 mb-6">
            <h3 className="text-[16px] font-bold mb-5 font-[var(--font-heading)]">
              Class {classSection}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAYS.map((dayName, dayIdx) => {
                const dayData = days.find((d) => (d as Record<string, string>).day === dayName) as Record<string, unknown> | undefined;
                const slots = (dayData?.slots as Record<string, unknown>[]) || [];

                return (
                  <div key={dayName} className="rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-2.5 text-[12px] font-bold text-white uppercase tracking-wider"
                      style={{ background: DAY_COLORS[dayIdx] }}>
                      {dayName}
                    </div>
                    {slots.length === 0 ? (
                      <div className="p-4 text-[12px] text-text-secondary text-center">No schedule</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {slots.map((slot) => {
                          const s = slot as Record<string, unknown>;
                          const teacher = s.teacher as Record<string, unknown> | null;
                          const user = teacher?.user as Record<string, string> | null;
                          return (
                            <div key={s.id as string} className="px-4 py-2.5 flex items-center justify-between hover:bg-surface/50 transition-colors">
                              <div>
                                <div className="text-[12px] font-semibold text-text-primary">{s.subject as string}</div>
                                <div className="text-[10px] text-text-secondary">{user?.name || "TBA"}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] font-semibold text-text-primary">P{s.period as number}</div>
                                <div className="text-[10px] text-text-secondary">{s.startTime as string}–{s.endTime as string}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </>
  );
}
