"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { useEvents, apiCall, invalidateAll } from "@/lib/api-hooks";

const categoryColors: Record<string, string> = {
  Sports: "#FF6B00", Cultural: "#8B5CF6", Academic: "#3B82F6", National: "#10B981", General: "#6B7280",
};

export default function EventsPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formCategory, setFormCategory] = useState("Sports");
  const [formDesc, setFormDesc] = useState("");

  const { data: raw, isLoading } = useEvents("limit=50");
  const events = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const stats = {
    upcoming: events.filter((e: Record<string, string>) => e.status === "UPCOMING").length,
    totalRsvp: events.reduce((s: number, e: Record<string, number>) => s + (e.rsvpCount || 0), 0),
    completed: events.filter((e: Record<string, string>) => e.status === "COMPLETED").length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCall("/api/events", "POST", {
        title: formTitle, date: formDate, venue: formVenue, category: formCategory,
        description: formDesc, status: "UPCOMING",
      });
      invalidateAll("/api/events");
      setShowModal(false);
      setFormTitle(""); setFormDate(""); setFormVenue(""); setFormDesc("");
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try { await apiCall(`/api/events/${id}`, "DELETE"); invalidateAll("/api/events"); }
    catch (err) { alert((err as Error).message); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await apiCall(`/api/events/${id}`, "PUT", { status }); invalidateAll("/api/events"); }
    catch (err) { alert((err as Error).message); }
  };

  return (
    <>
      <PageHeader
        title="Event Management"
        subtitle="Plan, schedule, and manage school events"
        action={
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">
            + New Event
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Upcoming Events", value: String(stats.upcoming), icon: "📅", color: "#3B82F6" },
          { label: "Total RSVPs", value: stats.totalRsvp.toLocaleString(), icon: "✋", color: "#10B981" },
          { label: "Completed This Year", value: String(stats.completed), icon: "✅", color: "#8B5CF6" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px]" style={{ background: `${s.color}15` }}>{s.icon}</div>
              <span className="text-[12px] text-text-secondary font-[var(--font-heading)]">{s.label}</span>
            </div>
            <div className="text-[24px] font-bold text-text-primary font-[var(--font-heading)]">{s.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event: Record<string, unknown>, i: number) => (
            <motion.div key={event.id as string} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow group cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <StatusBadge status={event.category as string} color={categoryColors[event.category as string] || "#6B7280"} />
                <StatusBadge status={event.status as string}
                  color={(event.status as string) === "UPCOMING" ? "#3B82F6" : (event.status as string) === "PLANNING" ? "#F59E0B" : "#10B981"} />
              </div>
              <h4 className="text-[15px] font-semibold text-text-primary mb-2 font-[var(--font-heading)] group-hover:text-primary transition-colors">
                {event.title as string}
              </h4>
              <div className="flex flex-col gap-1 text-[12px] text-text-secondary">
                <span>📅 {new Date(event.date as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span>📍 {event.venue as string}</span>
                {(event.rsvpCount as number) > 0 ? <span>✋ {(event.rsvpCount as number)} RSVPs</span> : null}
              </div>
              <div className="flex gap-2 mt-4">
                <select
                  value={event.status as string}
                  onChange={(e) => handleStatusChange(event.id as string, e.target.value)}
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-primary bg-primary/10 border-none cursor-pointer font-[var(--font-heading)] text-center"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id as string); }}
                  className="px-3 py-2 rounded-lg text-[11px] font-semibold text-danger bg-danger/10 border-none cursor-pointer font-[var(--font-heading)]">
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[520px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[20px] font-bold font-[var(--font-heading)]">Create New Event</h3>
                <button onClick={() => setShowModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
              </div>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Event title" required
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                    className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                  <input type="text" value={formVenue} onChange={(e) => setFormVenue(e.target.value)} placeholder="Venue" required
                    className="px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
                </div>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary bg-white">
                  <option>Sports</option><option>Cultural</option><option>Academic</option><option>National</option>
                </select>
                <textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Event description..."
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary resize-none" />
                <button type="submit" disabled={saving}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">
                  {saving ? "Creating..." : "Create Event"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
