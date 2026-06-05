"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { NewNavbar, NewFooter } from "@/components";

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location?: string;
  time?: string;
}

interface Notice {
  id: number;
  title: string;
  createdAt: string;
  attachment?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"events" | "notices">("events");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.data || []);
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notices`)
      .then((res) => res.json())
      .then((data) => {
        setNotices(data.data || []);
        setNoticesLoading(false);
      })
      .catch(() => setNoticesLoading(false));
  }, []);

  return (
    <>
      <NewNavbar />
      <main className="min-h-screen bg-[#f8f9fc]">
        {/* Hero Header */}
        <section className="relative pt-[110px] bg-[#0A1628] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-3xl" />
          </div>

          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          </div>

          <div className="relative max-w-[1400px] mx-auto px-[5%] py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold mb-6 uppercase tracking-[0.2em]"
              >
                📰 What&apos;s Happening
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[clamp(36px,5vw,64px)] font-black text-white leading-tight mb-4"
              >
                News &{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-500 to-yellow-500">
                  Events
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-lg md:text-xl max-w-[650px] mx-auto mb-8 leading-relaxed"
              >
                Stay updated with the latest happenings, upcoming events, and important announcements from our school.
              </motion.p>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 60V30C240 0 480 0 720 15C960 30 1200 45 1440 30V60H0Z" fill="#f8f9fc" />
            </svg>
          </div>
        </section>

        {/* Toggle Tabs */}
        <section className="py-12 md:py-16">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3 mb-10"
            >
              <button
                onClick={() => setActiveSection("events")}
                className={`px-7 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer ${
                  activeSection === "events"
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                    : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
                }`}
                style={{ border: activeSection === "events" ? "none" : "1px solid #e5e7eb" }}
              >
                🗓️ Upcoming Events
              </button>
              <button
                onClick={() => setActiveSection("notices")}
                className={`px-7 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer ${
                  activeSection === "notices"
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                    : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
                }`}
                style={{ border: activeSection === "notices" ? "none" : "1px solid #e5e7eb" }}
              >
                📌 Notices & Announcements
              </button>
            </motion.div>

            {/* Events Section */}
            {activeSection === "events" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {eventsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-md animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-gray-200" />
                        <div className="flex-1 space-y-3">
                          <div className="h-5 bg-gray-200 rounded w-3/4" />
                          <div className="h-4 bg-gray-200 rounded w-full" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : events.length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Upcoming Events</h3>
                    <p className="text-gray-500">Check back soon for upcoming events and activities.</p>
                  </div>
                ) : (
                  events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all group cursor-pointer border border-gray-100"
                    >
                      <div className="flex gap-5">
                        <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex flex-col items-center justify-center text-white shadow-lg">
                          <div className="text-3xl font-black leading-none">
                            {new Date(event.date).getDate()}
                          </div>
                          <div className="text-xs uppercase font-semibold tracking-wider">
                            {new Date(event.date).toLocaleString("default", { month: "short" })}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[#0A1628] text-xl font-bold mb-2 group-hover:text-orange-600 transition-colors">
                            {event.title}
                          </h3>
                          <p className="text-gray-500 text-sm mb-3 line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1">📍 {event.location || "School Campus"}</span>
                            <span className="flex items-center gap-1">🕐 {event.time || "TBA"}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* Notices Section */}
            {activeSection === "notices" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {noticesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-md animate-pulse">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : notices.length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Notices</h3>
                    <p className="text-gray-500">No announcements at the moment.</p>
                  </div>
                ) : (
                  notices.map((notice, index) => (
                    <motion.div
                      key={notice.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.5) }}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all group cursor-pointer border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 mt-1.5 shadow-sm" />
                        <div>
                          <h4 className="text-[#0A1628] text-base font-bold mb-2 group-hover:text-orange-600 transition-colors leading-snug">
                            {notice.title}
                          </h4>
                          <div className="flex flex-col gap-2">
                            <p className="text-gray-400 text-xs font-medium">
                              {new Date(notice.createdAt).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            {notice.attachment && (
                              <a 
                                href={`http://localhost:5000${notice.attachment}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 transition-colors w-fit border border-orange-100"
                              >
                                <span>📄</span> Download Document
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <NewFooter />
    </>
  );
}
