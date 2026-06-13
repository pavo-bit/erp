"use client";

import { useState } from "react";
import { useVisitors, useEnquiries, apiCall, invalidate } from "@/lib/api-hooks";
import { PageHeader, DataTable, StatusBadge } from "@/components/DashboardLayout";

export default function ReceptionPage() {
  const [activeTab, setActiveTab] = useState<"VISITORS" | "ENQUIRIES">("VISITORS");
  const { data: visitors, isLoading: loadingV } = useVisitors();
  const { data: enquiries, isLoading: loadingE } = useEnquiries();
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ visitorName: "", phone: "", purpose: "", personToMeet: "" });

  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall("/api/v1/reception/visitors", "POST", formData);
      invalidate("/api/v1/reception/visitors");
      setShowModal(false);
      setFormData({ visitorName: "", phone: "", purpose: "", personToMeet: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to log visitor");
    }
  };

  const vRows = visitors?.map((v: any) => [
    <strong key="name">{v.visitorName}</strong>,
    v.phone,
    v.purpose,
    v.personToMeet || "N/A",
    new Date(v.checkIn).toLocaleString(),
    <StatusBadge key="status" status="CHECKED_IN" color="#3B82F6" />
  ]) || [];

  const eRows = enquiries?.map((e: any) => [
    <strong key="name">{e.studentName}</strong>,
    e.parentName,
    e.phone,
    e.applyingForClass || "N/A",
    new Date(e.createdAt).toLocaleDateString(),
    <StatusBadge key="status" status="NEW" color="#F59E0B" />
  ]) || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reception Desk" 
        subtitle="Manage visitors and front-desk admission enquiries." 
        action={
          <button onClick={() => setShowModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition">
            + Log Visitor
          </button>
        }
      />

      <div className="flex gap-4 border-b border-border">
        <button 
          onClick={() => setActiveTab("VISITORS")}
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "VISITORS" ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-text-primary"}`}
        >
          Visitor Logs
        </button>
        <button 
          onClick={() => setActiveTab("ENQUIRIES")}
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "ENQUIRIES" ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-text-primary"}`}
        >
          Admission Enquiries
        </button>
      </div>

      {activeTab === "VISITORS" && (
        loadingV ? <div className="text-text-secondary text-sm">Loading...</div> :
        <DataTable headers={["Visitor Name", "Phone", "Purpose", "Meeting With", "Check-In Time", "Status"]} rows={vRows} />
      )}

      {activeTab === "ENQUIRIES" && (
        loadingE ? <div className="text-text-secondary text-sm">Loading...</div> :
        <DataTable headers={["Student Name", "Parent Name", "Phone", "Class", "Date", "Status"]} rows={eRows} />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Log New Visitor</h2>
            <form onSubmit={handleCreateVisitor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Visitor Name</label>
                <input required type="text" value={formData.visitorName} onChange={e => setFormData({...formData, visitorName: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Phone Number</label>
                <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Purpose of Visit</label>
                <input required type="text" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Person to Meet</label>
                <input type="text" value={formData.personToMeet} onChange={e => setFormData({...formData, personToMeet: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">Log Visitor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
