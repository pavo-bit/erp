"use client";

import { useState } from "react";
import { useSchoolNotices } from "@/lib/student-api-hooks";
import { Bell, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/ui/DataTable";

export default function NoticesPage() {
  const { data: noticesData, isLoading } = useSchoolNotices();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading notice board...
      </div>
    );
  }

  const notices = noticesData?.data || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Notice Board"
        subtitle="Official school circulars, announcements, and administrative notices."
      />

      <div className="space-y-4">
        {notices.map((notice: any) => {
          const isExpanded = expandedId === notice.id;

          return (
            <div
              key={notice.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                className="w-full p-5 text-left flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0 mt-0.5">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      {notice.title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-1">
                      {notice.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/30">
                  <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed pl-[3.25rem]">
                    {notice.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {notices.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Notices Published</h3>
            <p className="text-sm text-slate-500">
              The school notice board currently has no active circulars.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
