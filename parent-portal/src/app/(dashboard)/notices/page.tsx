"use client";

import { useState } from "react";
import { Bell, Calendar as CalendarIcon, Filter, AlertCircle, Volume2, Info } from "lucide-react";

export default function NoticesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "important">("all");

  const notices = [
    { id: 1, title: "Diwali Holidays Announcement", date: "Oct 10, 2026", type: "important", content: "The school will remain closed from Oct 22 to Oct 26 for Diwali holidays. Classes will resume on Oct 27.", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
    { id: 2, title: "Term 1 Results Published", date: "Oct 08, 2026", type: "academic", content: "Term 1 final exam results have been published for all classes. Parents can view the report cards in the Results section.", icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { id: 3, title: "Annual Sports Meet Setup", date: "Oct 05, 2026", type: "event", content: "The Annual Sports Meet is scheduled for Nov 12. Students interested in participating must register with their house captains by Oct 20.", icon: Volume2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { id: 4, title: "Fee Payment Reminder", date: "Oct 01, 2026", type: "important", content: "Reminder: The last date to pay the Q3 tuition fee without late penalty is Oct 15.", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">School Notices</h1>
          <p className="text-slate-500 dark:text-slate-400">Stay updated with official announcements and events.</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex space-x-2">
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "all" 
                  ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md" 
                  : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              All Notices
            </button>
            <button 
              onClick={() => setActiveTab("important")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "important" 
                  ? "bg-red-500 text-white shadow-md shadow-red-500/20" 
                  : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              Important
            </button>
          </div>
          
          <button className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Filter size={16} className="mr-2" /> Filter
          </button>
        </div>

        {/* Notices List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {notices.filter(n => activeTab === "all" || n.type === activeTab).map(notice => (
            <div key={notice.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
              <div className="flex items-start">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mr-5 mt-1 border border-white/20 ${notice.bg}`}>
                  <notice.icon size={24} className={notice.color} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {notice.title}
                    </h3>
                    <span className="flex items-center text-sm font-medium text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full w-max">
                      <CalendarIcon size={14} className="mr-1.5" /> {notice.date}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {notice.content}
                  </p>
                  
                  {notice.type === 'important' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        Acknowledge Receipt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
