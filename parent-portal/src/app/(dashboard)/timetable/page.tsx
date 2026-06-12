"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, UserSquare2 } from "lucide-react";

export default function TimetablePage() {
  const [selectedChild, setSelectedChild] = useState(1);
  const [selectedDay, setSelectedDay] = useState("Monday");

  const children = [
    { id: 1, name: "Aarav Sharma", class: "Class X-A" },
    { id: 2, name: "Diya Sharma", class: "Class VIII-B" }
  ];

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const timetable = [
    { period: 1, time: "08:00 AM - 08:45 AM", subject: "Mathematics", teacher: "Mr. R.K. Sharma", room: "Room 102", type: "theory" },
    { period: 2, time: "08:45 AM - 09:30 AM", subject: "Physics", teacher: "Ms. Anita Desai", room: "Lab 3", type: "practical" },
    { period: 3, time: "09:30 AM - 10:15 AM", subject: "English", teacher: "Mr. John Smith", room: "Room 102", type: "theory" },
    { period: "break", time: "10:15 AM - 10:30 AM", subject: "Morning Break", type: "break" },
    { period: 4, time: "10:30 AM - 11:15 AM", subject: "Social Studies", teacher: "Mrs. Meena", room: "Room 102", type: "theory" },
    { period: 5, time: "11:15 AM - 12:00 PM", subject: "Computer Science", teacher: "Mr. Vikram", room: "Computer Lab 1", type: "practical" },
    { period: "break", time: "12:00 PM - 12:45 PM", subject: "Lunch Break", type: "break" },
    { period: 6, time: "12:45 PM - 01:30 PM", subject: "Hindi", teacher: "Ms. Sunita", room: "Room 102", type: "theory" },
    { period: 7, time: "01:30 PM - 02:15 PM", subject: "Physical Education", teacher: "Mr. Raj", room: "Playground", type: "practical" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Class Timetable</h1>
          <p className="text-slate-500 dark:text-slate-400">View daily schedule and teacher assignments.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedChild === child.id 
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Days Header */}
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hide-scrollbar">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[120px] py-4 px-6 text-sm font-semibold transition-colors border-b-2 ${
                selectedDay === day 
                  ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-white/50 dark:bg-slate-800/50" 
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Timetable List */}
        <div className="p-6">
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[39px] top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>

            <div className="space-y-4">
              {timetable.map((slot, idx) => (
                <div key={idx} className="relative flex items-start group">
                  {/* Timeline Dot */}
                  <div className="hidden sm:flex flex-col items-center mr-6 mt-2">
                    <div className={`w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center z-10 ${
                      slot.type === 'break' ? 'bg-amber-400' : 'bg-blue-500'
                    }`}>
                      {slot.period !== 'break' && <span className="text-[10px] font-bold text-white">{slot.period}</span>}
                    </div>
                  </div>

                  <div className={`flex-1 rounded-xl p-5 transition-all duration-300 border ${
                    slot.type === 'break' 
                      ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 flex items-center justify-center py-4' 
                      : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800'
                  }`}>
                    {slot.type === 'break' ? (
                      <div className="font-bold flex items-center">
                        <Clock size={18} className="mr-2" />
                        {slot.subject} ({slot.time})
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Period {slot.period}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-sm font-medium text-slate-500 flex items-center">
                              <Clock size={14} className="mr-1" /> {slot.time}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{slot.subject}</h3>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center">
                              <UserSquare2 size={16} className="mr-1.5 text-slate-400" />
                              {slot.teacher}
                            </div>
                            <div className="flex items-center">
                              <MapPin size={16} className="mr-1.5 text-slate-400" />
                              {slot.room}
                            </div>
                            {slot.type === 'practical' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                Practical
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
