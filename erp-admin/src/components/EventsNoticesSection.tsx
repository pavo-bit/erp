"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

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
}

export function EventsNoticesSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);

  useEffect(() => {
    // Fetch events
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?limit=4`)
      .then(res => res.json())
      .then(data => {
        setEvents(data.data || []);
        setEventsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch events:', err);
        setEventsLoading(false);
      });

    // Fetch notices
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notices?limit=4`)
      .then(res => res.json())
      .then(data => {
        setNotices(data.data || []);
        setNoticesLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch notices:', err);
        setNoticesLoading(false);
      });
  }, []);

  return (
    <section id="events" className="py-20 bg-[#0A1628]">
      <div className="max-w-[1400px] mx-auto px-[5%]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Events */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-8"
            >
              <div>
                <div className="inline-block px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-3 uppercase tracking-wider">
                  What&apos;s New
                </div>
                <h2 className="text-white text-3xl font-bold">Events & Notices</h2>
              </div>
            </motion.div>

            <div className="space-y-4">
              {eventsLoading ? (
                <div className="text-white/60">Loading events...</div>
              ) : events.length > 0 ? (
                events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group cursor-pointer"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex flex-col items-center justify-center text-white">
                        <div className="text-2xl font-bold leading-none">
                          {new Date(event.date).getDate()}
                        </div>
                        <div className="text-xs uppercase">
                          {new Date(event.date).toLocaleString('default', { month: 'short' })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white text-lg font-semibold mb-1 group-hover:text-orange-400 transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-white/60 text-sm mb-2 line-clamp-2">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span>📍 {event.location || 'School Campus'}</span>
                          <span>🕐 {event.time || 'TBA'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-white/60 text-center py-8">No upcoming events</div>
              )}
            </div>

            <Link
              href="/admin/events"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all no-underline"
            >
              View Full Calendar →
            </Link>
          </div>

          {/* Latest Notices */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <h3 className="text-orange-400 text-lg font-semibold mb-4">Latest Notices</h3>
            </motion.div>

            <div className="space-y-3">
              {noticesLoading ? (
                <div className="text-white/60">Loading notices...</div>
              ) : notices.length > 0 ? (
                notices.map((notice, index) => (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                  >
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-2" />
                    <div className="flex-1">
                      <h4 className="text-white text-sm font-semibold mb-1 group-hover:text-orange-400 transition-colors">
                        {notice.title}
                      </h4>
                      <p className="text-white/60 text-xs">
                        {new Date(notice.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-white/60 text-center py-8">No notices available</div>
              )}
            </div>

            <Link
              href="/admin/notices"
              className="mt-6 inline-flex items-center gap-2 text-orange-400 text-sm font-semibold hover:gap-3 transition-all no-underline"
            >
              View All →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
