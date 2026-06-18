"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { apiCall } from "@/lib/api-hooks";
import { motion, AnimatePresence } from "framer-motion";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", role: "TEACHER",
    branchId: "", employeeId: "", department: ""
  });

  const fetchUsers = async () => {
    setLoading(true);
    const res = await apiCall("/api/v1/users");
    if (res.success) setUsers(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await apiCall(`/api/v1/users/${editingUser.id}`, "PUT", formData);
      } else {
        const res = await apiCall("/api/v1/users", "POST", formData);
        if (res.data?.tempPassword) {
          setTempPasswordModal(res.data.tempPassword);
        }
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'enable'} this user?`)) return;
    await apiCall(`/api/v1/users/${id}/status`, "PUT", { isActive: !currentStatus });
    fetchUsers();
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm("Are you sure you want to reset this user's password?")) return;
    const res = await apiCall(`/api/v1/users/${id}/reset-password`, "PUT");
    if (res.data?.tempPassword) {
      setTempPasswordModal(res.data.tempPassword);
    }
  };

  const openNew = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", phone: "", role: "TEACHER", branchId: "", employeeId: "", department: "" });
    setIsModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, phone: u.phone || "", role: u.role, branchId: u.branchId || "", employeeId: u.employeeId || "", department: u.department || "" });
    setIsModalOpen(true);
  };

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Manage Staff, Admins, and Role-Based Access Control."
        action={<button onClick={openNew} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">+ Add User</button>}
      />

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface text-text-secondary text-xs uppercase tracking-wider border-b border-border">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Department</th>
              <th className="p-4 font-semibold">Last Login</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-text-primary divide-y divide-border">
            {loading ? <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr> : users.map(u => (
              <tr key={u.id} className="hover:bg-surface/50">
                <td className="p-4">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-text-secondary">{u.email}</div>
                  {u.employeeId && <div className="text-xs text-text-secondary mt-1">ID: {u.employeeId}</div>}
                </td>
                <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">{u.role}</span></td>
                <td className="p-4">{u.department || '—'}</td>
                <td className="p-4 text-text-secondary">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td className="p-4"><StatusBadge status={u.isActive ? "Active" : "Disabled"} color={u.isActive ? "#10B981" : "#EF4444"} /></td>
                <td className="p-4 text-right">
                  <button onClick={() => openEdit(u)} className="text-primary hover:underline text-xs font-semibold mr-3 cursor-pointer bg-transparent border-none">Edit</button>
                  <button onClick={() => handleStatusToggle(u.id, u.isActive)} className="text-amber-600 hover:underline text-xs font-semibold mr-3 cursor-pointer bg-transparent border-none">{u.isActive ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => handleResetPassword(u.id)} className="text-danger hover:underline text-xs font-semibold cursor-pointer bg-transparent border-none">Reset Pass</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-bold mb-4">{editingUser ? "Edit User" : "Add User"}</h3>
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="px-4 py-2 border rounded-lg text-sm" />
                  <input type="email" placeholder="Email" required={!editingUser} disabled={!!editingUser} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="px-4 py-2 border rounded-lg text-sm" />
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="px-4 py-2 border rounded-lg text-sm">
                    <option value="TEACHER">Teacher</option>
                    <option value="ERP_ADMIN">ERP Admin</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="HR">HR</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="LIBRARIAN">Librarian</option>
                    <option value="ASSET_MANAGER">Asset Manager</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Employee ID" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="px-4 py-2 border rounded-lg text-sm" />
                  <input placeholder="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="px-4 py-2 border rounded-lg text-sm" />
                </div>
                {!editingUser && <p className="text-xs text-text-secondary">A temporary password will be automatically generated and displayed.</p>}
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-surface rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {tempPasswordModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center border border-border">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl font-bold mx-auto mb-4">✓</div>
              <h3 className="text-lg font-bold mb-2">Temporary Password</h3>
              <p className="text-sm text-text-secondary mb-4">Please share this securely. It will not be shown again.</p>
              <div className="bg-surface p-4 rounded-lg font-mono text-xl font-bold text-text-primary tracking-widest border border-border select-all">
                {tempPasswordModal}
              </div>
              <button onClick={() => setTempPasswordModal(null)} className="mt-6 w-full py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors cursor-pointer border-none">
                Close
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
