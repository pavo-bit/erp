"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

// Dummy timetable data
const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const periods = ["08:00 - 09:00", "09:00 - 10:00", "10:30 - 11:30", "11:30 - 12:30", "13:30 - 14:30"];

const schedule = [
  { day: 0, period: 0, subject: "Physics", class: "10-A", room: "Lab 3" },
  { day: 0, period: 1, subject: "Physics", class: "10-B", room: "Lab 3" },
  { day: 0, period: 3, subject: "Maths", class: "9-A", room: "Room 12" },
  { day: 1, period: 0, subject: "Maths", class: "9-A", room: "Room 12" },
  { day: 2, period: 2, subject: "Physics", class: "11-Sci", room: "Lab 1" },
  { day: 4, period: 4, subject: "Extra Classes", class: "10-A", room: "Room 14" },
];

export default function TimetablePage() {
  const { user } = useAuth();

  const getSlot = (dIndex: number, pIndex: number) => schedule.find(s => s.day === dIndex && s.period === pIndex);

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" /> Master Roster
          </motion.div>
          <h1 className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight">
            Weekly Timetable
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl">
            Your allocated lecture slots across all sections and grades.
          </p>
        </div>
        
        <button className="px-6 py-3 rounded-xl text-[14px] font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] hover:text-white hover:border-purple-500/50 transition-all">
          Download PDF 📥
        </button>
      </div>

      {/* Timetable Grid */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-[1.5rem] overflow-x-auto p-6">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider p-4">Time</div>
            {days.map(d => (
              <div key={d} className="text-[13px] font-black text-white uppercase tracking-widest text-center bg-[var(--color-bg-dark)] p-4 rounded-xl border border-[var(--color-border-dark)]">
                {d}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {periods.map((time, pIndex) => (
              <div key={time} className="grid grid-cols-6 gap-4">
                <div className="flex items-center justify-center p-4 rounded-xl bg-[var(--color-bg-sidebar)]/50 border border-[var(--color-border-dark)] text-[12px] font-bold text-[var(--color-text-secondary)] font-mono">
                  {time}
                </div>
                
                {days.map((_, dIndex) => {
                  const slot = getSlot(dIndex, pIndex);
                  return (
                    <motion.div key={dIndex} whileHover={{ scale: slot ? 1.05 : 1 }} className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-center items-center text-center transition-shadow
                      ${slot ? 'bg-gradient-to-br from-purple-500/10 to-[var(--color-bg-dark)] border-purple-500/30 cursor-pointer hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-[var(--color-bg-dark)]/50 border-[var(--color-border-dark)] border-dashed opacity-50'}`}>
                      {slot ? (
                        <>
                          <div className="text-[15px] font-black text-white mb-1 tracking-tight">{slot.subject}</div>
                          <div className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded uppercase tracking-wider mb-2">{slot.class}</div>
                          <div className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1">📍 {slot.room}</div>
                        </>
                      ) : (
                        <div className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">Free Period</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
