"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { useMessages, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function NotificationsPage() {
  const [box, setBox] = useState<"inbox" | "sent">("inbox");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const { data: raw, isLoading } = useMessages(box);
  const messages = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiCall("/api/messages", "POST", { receiverId, subject, content });
      invalidateAll("/api/messages"); setShowModal(false);
      setReceiverId(""); setSubject(""); setContent("");
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const markRead = async (id: string) => {
    try { await apiCall(`/api/messages/${id}`, "PUT"); invalidateAll("/api/messages"); }
    catch { /* ignore */ }
  };

  return (
    <>
      <PageHeader title="Notifications & Messages" subtitle="Send messages to students, parents and staff"
        action={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">+ New Message</button>} />
      <div className="flex gap-2 mb-6">
        {(["inbox", "sent"] as const).map((b) => (
          <button key={b} onClick={() => setBox(b)} className={`px-4 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer capitalize font-[var(--font-heading)] transition-all ${box === b ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:border-primary"}`}>{b}</button>
        ))}
      </div>
      {isLoading ? <div className="bg-white rounded-2xl border border-border p-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
        <div className="flex flex-col gap-2">
          {messages.length === 0 ? <div className="bg-white rounded-2xl border border-border p-12 text-center text-[13px] text-text-secondary">No messages</div> : null}
          {messages.map((m: Record<string, unknown>, i: number) => {
            const sender = m.sender as Record<string, string>;
            const receiver = m.receiver as Record<string, string>;
            return (
              <motion.div key={m.id as string} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => !m.isRead && box === "inbox" && markRead(m.id as string)}
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow ${m.isRead || box === "sent" ? "border-border" : "border-primary/30 bg-primary/5"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{box === "inbox" ? "📨" : "📤"}</span>
                    <span className="text-[13px] font-semibold font-[var(--font-heading)] text-text-primary">
                      {box === "inbox" ? `From: ${sender?.name}` : `To: ${receiver?.name}`}
                    </span>
                    {!m.isRead && box === "inbox" ? <StatusBadge status="New" color="#FF6B00" /> : null}
                  </div>
                  <span className="text-[11px] text-text-secondary">{new Date(m.createdAt as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <p className="text-[13px] font-medium text-text-primary">{m.subject as string}</p>
                <p className="text-[12px] text-text-secondary mt-1 line-clamp-1">{m.content as string}</p>
              </motion.div>
            );
          })}
        </div>
      )}
      <AnimatePresence>
        {showModal && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[520px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold font-[var(--font-heading)]">New Message</h3>
              <button onClick={() => setShowModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSend}>
              <input type="text" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} placeholder="Receiver User ID" required className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary" />
              <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message content..." required className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary resize-none" />
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">{saving ? "Sending..." : "Send Message"}</button>
            </form>
          </motion.div>
        </>)}
      </AnimatePresence>
    </>
  );
}
