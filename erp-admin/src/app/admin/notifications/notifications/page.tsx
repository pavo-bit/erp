"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { useNotifications, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function NotificationsPage() {
  const { data: raw, isLoading } = useNotifications();
  const notifications = Array.isArray(raw) ? raw : raw?.data || [];

  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({ type: "SMS" as string, recipientName: "", recipientPhone: "", recipientEmail: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const smsCount = notifications.filter((n: Record<string, string>) => n.type === "SMS").length;
  const emailCount = notifications.filter((n: Record<string, string>) => n.type === "EMAIL").length;
  const whatsappCount = notifications.filter((n: Record<string, string>) => n.type === "WHATSAPP").length;

  const handleSend = async () => {
    setSending(true);
    try {
      await apiCall("/api/v1/notifications/send", "POST", form);
      invalidateAll("/api/v1/notifications");
      setShowSend(false);
      setForm({ type: "SMS", recipientName: "", recipientPhone: "", recipientEmail: "", subject: "", message: "" });
    } catch (e) { alert((e as Error).message); }
    setSending(false);
  };

  const handleFeeReminder = async () => {
    try {
      const result = await apiCall("/api/v1/notifications/fee-reminder", "POST");
      alert(result?.message || "Fee reminders sent!");
      invalidateAll("/api/v1/notifications");
    } catch (e) { alert((e as Error).message); }
  };

  const typeColors: Record<string, string> = { SMS: "#3B82F6", EMAIL: "#10B981", WHATSAPP: "#25D366" };

  return (
    <>
      <PageHeader title="Notifications" subtitle="Send SMS, Email, and WhatsApp notifications to parents and staff"
        action={
          <div className="flex gap-2">
            <button onClick={handleFeeReminder}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-[12px] font-semibold border-none cursor-pointer hover:bg-amber-600 transition-all font-[var(--font-heading)]">
              📤 Fee Reminders
            </button>
            <button onClick={() => setShowSend(!showSend)}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-[12px] font-semibold border-none cursor-pointer hover:bg-primary/90 transition-all font-[var(--font-heading)]">
              + Send Notification
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📱" label="SMS Sent" value={String(smsCount)} color="#3B82F6" />
        <StatCard icon="📧" label="Emails Sent" value={String(emailCount)} color="#10B981" />
        <StatCard icon="💬" label="WhatsApp Sent" value={String(whatsappCount)} color="#25D366" />
        <StatCard icon="📊" label="Total Sent" value={String(notifications.length)} color="#8B5CF6" />
      </div>

      {showSend && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-white rounded-2xl border border-border p-6 mb-6">
          <h3 className="text-[15px] font-semibold mb-4 font-[var(--font-heading)]">Send Notification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[12px] font-semibold text-text-secondary mb-1 block">Type</label>
              <div className="flex gap-2">
                {["SMS", "EMAIL", "WHATSAPP"].map(t => (
                  <button key={t} onClick={() => setForm({ ...form, type: t })}
                    className={`px-4 py-2 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-all
                      ${form.type === t ? "text-white shadow-md" : "bg-surface text-text-secondary"}`}
                    style={form.type === t ? { background: typeColors[t] } : {}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <input placeholder="Recipient Name" value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            {form.type !== "EMAIL" && (
              <input placeholder="Phone Number" value={form.recipientPhone} onChange={e => setForm({ ...form, recipientPhone: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            )}
            {form.type === "EMAIL" && (
              <input placeholder="Email Address" value={form.recipientEmail} onChange={e => setForm({ ...form, recipientEmail: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
            )}
            <input placeholder="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary" />
          </div>
          <textarea placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border text-[13px] outline-none focus:border-primary resize-none mb-4" />
          <button onClick={handleSend} disabled={sending}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold border-none cursor-pointer hover:bg-primary/90 transition-all disabled:opacity-50">
            {sending ? "Sending..." : "Send"}
          </button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[14px] font-semibold font-[var(--font-heading)]">Notification Log</h3>
        </div>
        {isLoading ? (
          <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div>
        ) : notifications.length === 0 ? (
          <p className="text-[13px] text-text-secondary text-center py-12">No notifications sent yet</p>
        ) : (
          <div className="divide-y divide-border">
            {notifications.slice(0, 20).map((n: Record<string, unknown>) => (
              <div key={n.id as string} className="px-5 py-4 flex items-start gap-4 hover:bg-surface/50 transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[14px] font-bold shrink-0"
                  style={{ background: typeColors[n.type as string] || "#666" }}>
                  {n.type === "SMS" ? "📱" : n.type === "EMAIL" ? "📧" : "💬"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-primary font-[var(--font-heading)]">{n.subject as string}</div>
                  <div className="text-[12px] text-text-secondary mt-0.5 truncate">{n.message as string}</div>
                  <div className="text-[11px] text-text-secondary mt-1">
                    To: {n.recipientName as string || "—"} | {n.recipientPhone as string || n.recipientEmail as string || "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={n.status as string} color={n.status === "SENT" ? "#10B981" : n.status === "FAILED" ? "#EF4444" : "#F59E0B"} />
                  <div className="text-[10px] text-text-secondary mt-1">
                    {n.sentAt ? new Date(n.sentAt as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}
