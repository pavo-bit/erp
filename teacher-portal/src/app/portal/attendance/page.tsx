"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

// Dummy student roster for UI showcase
const classRoster = [
  { id: "1", roll: "101", name: "Aarav Sharma", status: "PRESENT" },
  { id: "2", roll: "102", name: "Diya Patel", status: "PRESENT" },
  { id: "3", roll: "103", name: "Rohan Gupta", status: "ABSENT" },
  { id: "4", roll: "104", name: "Sneha Reddy", status: "LATE" },
  { id: "5", roll: "105", name: "Arjun Singh", status: "PRESENT" },
];

export default function AttendanceMatrixPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState(classRoster);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const markAll = (status: string) => {
    setStudents(students.map(s => ({ ...s, status })));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      alert("Attendance successfully pushed to the MDM engine and synced with the Parent Portal!");
      setIsSubmitting(false);
    }, 1500);
  };

  const stats = {
    present: students.filter(s => s.status === 'PRESENT').length,
    absent: students.filter(s => s.status === 'ABSENT').length,
    late: students.filter(s => s.status === 'LATE').length,
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Session
          </motion.div>
          <h1 className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight">
            Attendance Matrix
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl">
            Real-time roll call. Changes made here will immediately trigger push notifications to the respective Parent Portals.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-[var(--color-bg-card)] p-2 rounded-2xl border border-[var(--color-border-dark)]">
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="bg-transparent border-none text-white px-4 py-2 outline-none font-bold"
          />
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total Present", value: stats.present, icon: "✅", gradient: "from-emerald-600 to-teal-500" },
          { label: "Total Absent", value: stats.absent, icon: "❌", gradient: "from-rose-600 to-red-500" },
          { label: "Marked Late", value: stats.late, icon: "⏰", gradient: "from-amber-600 to-orange-500" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-6 rounded-[1.5rem] relative overflow-hidden group border border-[var(--color-border-dark)] bg-[var(--color-bg-card)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">{stat.icon}</div>
            <div className="relative z-10">
              <div className="text-[32px] font-black text-white tracking-tight mb-1">{stat.value}</div>
              <div className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{stat.label}</div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-50`} />
          </motion.div>
        ))}
      </div>

      {/* Roster Table */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-[1.5rem] overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-[var(--color-border-dark)] flex items-center justify-between bg-[var(--color-bg-sidebar)]">
          <div className="flex gap-2">
            <button onClick={() => markAll('PRESENT')} className="px-4 py-2 rounded-lg text-[11px] font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors uppercase tracking-wider">Mark All Present</button>
            <button onClick={() => markAll('ABSENT')} className="px-4 py-2 rounded-lg text-[11px] font-bold text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 transition-colors uppercase tracking-wider">Mark All Absent</button>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleSubmit} disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50">
            {isSubmitting ? "Syncing..." : "Publish to Ledger"}
          </motion.button>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[var(--color-bg-dark)] border-b border-[var(--color-border-dark)] sticky top-0 z-10">
                <th className="p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider w-20">Roll</th>
                <th className="p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Student Name</th>
                <th className="p-4 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-right">Attendance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-dark)]">
              <AnimatePresence>
                {students.map((student) => (
                  <motion.tr key={student.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-[var(--color-bg-dark)]/50 transition-colors">
                    <td className="p-4 font-black text-[var(--color-text-secondary)]">{student.roll}</td>
                    <td className="p-4">
                      <div className="text-[14px] font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs shadow-inner">
                          {student.name.charAt(0)}
                        </div>
                        {student.name}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] p-1 overflow-hidden">
                        {[
                          { val: 'PRESENT', label: 'P', color: 'emerald' },
                          { val: 'ABSENT', label: 'A', color: 'rose' },
                          { val: 'LATE', label: 'L', color: 'amber' }
                        ].map(st => (
                          <button
                            key={st.val}
                            onClick={() => handleStatusChange(student.id, st.val)}
                            className={`w-10 h-8 rounded-lg text-[13px] font-black transition-all duration-300
                              ${student.status === st.val 
                                ? `bg-${st.color}-500 text-white shadow-[0_0_10px_rgba(var(--color-${st.color}-500),0.5)]` 
                                : `text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-card-hover)]`}`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
