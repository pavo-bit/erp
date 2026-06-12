"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/DashboardLayout";
import { apiCall } from "@/lib/api-hooks";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "SMS",
    content: "",
    isActive: true,
  });

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await apiCall("/api/notifications/templates");
    if (res.success) {
      setTemplates(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      await apiCall(`/api/notifications/templates/${editingTemplate.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } else {
      await apiCall("/api/notifications/templates", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    }
    setIsModalOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      await apiCall(`/api/notifications/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    }
  };

  const openEdit = (t: any) => {
    setEditingTemplate(t);
    setFormData({ name: t.name, type: t.type, content: t.content, isActive: t.isActive });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setFormData({ name: "", type: "SMS", content: "", isActive: true });
    setIsModalOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Notification Templates"
        subtitle="Manage dynamic templates with {{variables}} for SMS, Email, and WhatsApp."
        action={
          <button onClick={openNew} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            + New Template
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider border-b border-border">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Channel</th>
              <th className="p-4 font-semibold">Content</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-text-primary divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-text-secondary">Loading templates...</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-text-secondary">No templates found. Create one.</td></tr>
            ) : templates.map((t, i) => (
              <motion.tr 
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-surface/50 transition-colors"
              >
                <td className="p-4 font-medium">{t.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    t.type === 'SMS' ? 'bg-blue-100 text-blue-700' :
                    t.type === 'EMAIL' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {t.type}
                  </span>
                </td>
                <td className="p-4 max-w-[400px] truncate text-text-secondary font-mono text-xs">{t.content}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => openEdit(t)} className="text-primary hover:underline text-xs font-semibold mr-3">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline text-xs font-semibold">Delete</button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">{editingTemplate ? "Edit Template" : "New Template"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary">&times;</button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Template Name</label>
                  <select 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Select Type...</option>
                    <option value="FEE_REMINDER">Fee Reminder</option>
                    <option value="ADMISSION_APPROVED">Admission Approved</option>
                    <option value="RESULT_PUBLISHED">Result Published</option>
                    <option value="ATTENDANCE_ALERT">Attendance Alert</option>
                    <option value="BIRTHDAY_WISH">Birthday Wish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Channel</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content (Use {"{{variable}}"})</label>
                  <textarea 
                    required 
                    rows={4}
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                    placeholder="Dear {{studentName}}, your fee..."
                  />
                  <p className="text-xs text-text-secondary mt-1">Variables allowed: {`{{studentName}}, {{parentName}}, {{invoiceNumber}}, {{feeAmount}}, {{schoolName}}, {{dueDate}}`}</p>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">Active Template</label>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-surface rounded-lg">Cancel</button>
                  <button type="submit" className="bg-primary text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-primary/90">Save Template</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
