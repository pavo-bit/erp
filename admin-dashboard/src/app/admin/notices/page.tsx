"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, DataTable, StatusBadge } from "@/components/DashboardLayout";
import { useNotices, apiCall, invalidateAll } from "@/lib/api-hooks";

const categoryColors: Record<string, string> = {
  Admission: "#FF6B00",
  General: "#3B82F6",
  Results: "#10B981",
  Finance: "#F59E0B",
  Events: "#8B5CF6",
};

export default function NoticesPage() {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formExpiry, setFormExpiry] = useState("");
  const [formAttachment, setFormAttachment] = useState<File | null>(null);

  const params = new URLSearchParams({ limit: "50" });
  if (filter !== "all") params.set("status", filter.toUpperCase());
  if (search) params.set("search", search);

  const { data: raw, isLoading } = useNotices(params.toString());
  const notices = Array.isArray(raw) ? raw : raw?.data || raw || [];

  const openCreate = () => {
    setEditingNotice(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("General");
    setFormExpiry("");
    setFormAttachment(null);
    setShowModal(true);
  };

  const openEdit = (notice: Record<string, unknown>) => {
    setEditingNotice(notice);
    setFormTitle(notice.title as string);
    setFormContent(notice.content as string);
    setFormCategory(notice.category as string);
    setFormExpiry(notice.expiryDate ? (notice.expiryDate as string).substring(0, 10) : "");
    setFormAttachment(null);
    setShowModal(true);
  };

  const handleSubmit = async (status: string) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", formTitle);
      formData.append("content", formContent);
      formData.append("category", formCategory);
      formData.append("status", status);
      if (formExpiry) formData.append("expiryDate", formExpiry);
      if (formAttachment) formData.append("attachment", formAttachment);

      if (editingNotice) {
        await apiCall(`/api/notices/${editingNotice.id}`, "PUT", formData);
      } else {
        await apiCall("/api/notices", "POST", formData);
      }

      invalidateAll("/api/notices");
      setShowModal(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      await apiCall(`/api/notices/${id}`, "DELETE");
      invalidateAll("/api/notices");
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Notice Management"
        subtitle="Create, manage, and publish school notices"
        action={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]"
          >
            + New Notice
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notices..."
          className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-white text-[13px] outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          {["all", "published", "draft"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer capitalize font-[var(--font-heading)] transition-all
                ${filter === f ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:border-primary"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-text-secondary">Loading notices...</p>
        </div>
      ) : (
        <DataTable
          headers={["Title", "Category", "Status", "Views", "Actions"]}
          rows={notices.map((n: Record<string, unknown>) => [
            <span key="t" className="font-medium font-[var(--font-heading)]">{n.title as string}</span>,
            <StatusBadge key="c" status={n.category as string} color={categoryColors[n.category as string] || "#6B7280"} />,
            <StatusBadge
              key="s"
              status={n.status as string}
              color={(n.status as string) === "PUBLISHED" ? "#10B981" : "#F59E0B"}
            />,
            (n.views as number) > 0 ? (n.views as number).toLocaleString() : "—",
            <div key="a" className="flex gap-2">
              <button onClick={() => openEdit(n)} className="text-[12px] text-primary font-semibold bg-transparent border-none cursor-pointer font-[var(--font-heading)]">
                Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id as string); }} className="text-[12px] text-danger font-semibold bg-transparent border-none cursor-pointer font-[var(--font-heading)]">
                Delete
              </button>
            </div>,
          ])}
        />
      )}

      {/* Create/Edit Notice Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[560px] bg-white rounded-2xl p-8 z-[101] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[20px] font-bold font-[var(--font-heading)]">
                  {editingNotice ? "Edit Notice" : "Create New Notice"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleSubmit("PUBLISHED"); }}>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Notice title"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary bg-white"
                  >
                    <option>General</option>
                    <option>Admission</option>
                    <option>Results</option>
                    <option>Finance</option>
                    <option>Events</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Content</label>
                  <textarea
                    rows={4}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Write notice content..."
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Expiry Date</label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Attachment (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setFormAttachment(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Publish Notice"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSubmit("DRAFT")}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-text-secondary border border-border bg-white cursor-pointer font-[var(--font-heading)]"
                  >
                    Save Draft
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
