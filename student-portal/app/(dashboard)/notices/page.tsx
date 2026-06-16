"use client";

import { useSchoolNotices } from "@/lib/student-api-hooks";
import { Bell, Calendar, Megaphone, ChevronDown, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function NoticesPage() {
  const { data: noticesData, isLoading } = useSchoolNotices();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  if (isLoading) return <div className="p-8 text-white">Loading notices...</div>;

  const notices = noticesData?.data || [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Notice Board</h1>
        <p className="text-white/60">Official school announcements and circulars.</p>
      </div>

      <div className="space-y-4">
        {notices.map((notice: any) => (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md"
          >
            <div 
              className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors flex items-start gap-4"
              onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
            >
              <div className={`p-3 rounded-xl shrink-0 ${
                notice.category === "HOLIDAY" ? "bg-amber-500/20 text-amber-400" :
                notice.category === "EXAM" ? "bg-red-500/20 text-red-400" :
                "bg-blue-500/20 text-blue-400"
              }`}>
                {notice.category === "HOLIDAY" ? <Calendar className="w-6 h-6" /> :
                 notice.category === "EXAM" ? <FileText className="w-6 h-6" /> :
                 <Megaphone className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white truncate pr-4">{notice.title}</h3>
                  <span className="shrink-0 text-xs text-white/50 bg-white/5 px-3 py-1 rounded-full">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-white/60 line-clamp-1">
                  {expandedId === notice.id ? "" : notice.content}
                </p>
              </div>

              <ChevronDown className={`w-5 h-5 text-white/40 shrink-0 transition-transform ${
                expandedId === notice.id ? "rotate-180" : ""
              }`} />
            </div>

            <AnimatePresence>
              {expandedId === notice.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 pt-2 border-t border-white/10"
                >
                  <div className="text-white/80 whitespace-pre-wrap text-sm leading-relaxed pl-[3.25rem]">
                    {notice.content}
                  </div>
                  {notice.attachment && (
                    <div className="pl-[3.25rem] mt-4">
                      <a 
                        href={notice.attachment} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-blue-400 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        View Attachment
                      </a>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {notices.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10 border-dashed">
            <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No Announcements</h3>
            <p className="text-white/60">The notice board is currently empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
