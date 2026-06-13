"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiCall } from "@/lib/api";
import { motion } from "framer-motion";

interface Request {
  id: string;
  schoolName: string;
  principalName: string;
  email: string;
  phone: string;
  address: string;
  expectedStudents: number;
  status: string;
  createdAt: string;
}

export default function RegistrationRequestsPage() {
  const { data: requests, mutate } = useSWR<Request[]>("/api/v1/saas/requests");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this school? This will automatically provision an ERP workspace and default admin account.")) return;
    
    setLoadingId(id);
    try {
      await apiCall(`/api/v1/saas/approve/${id}`, "POST");
      alert("School successfully provisioned!");
      mutate();
    } catch (e: any) {
      alert(e.message || "Approval failed");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    
    setLoadingId(id);
    try {
      await apiCall(`/api/v1/saas/reject/${id}`, "POST");
      mutate();
    } catch (e: any) {
      alert(e.message || "Rejection failed");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-[24px] font-bold text-text-primary">SaaS Registration Requests</h1>
        <p className="text-[14px] text-text-secondary mt-1">Review and provision ERP access for new schools.</p>
      </div>

      {!requests ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center text-text-secondary">
          No pending registration requests found.
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-[18px] font-bold text-text-primary m-0">{req.schoolName}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    req.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                    req.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {req.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-[13px] text-text-secondary">
                  <div className="flex items-center gap-2"><strong>Principal:</strong> {req.principalName}</div>
                  <div className="flex items-center gap-2"><strong>Students:</strong> ~{req.expectedStudents}</div>
                  <div className="flex items-center gap-2"><strong>Email:</strong> {req.email}</div>
                  <div className="flex items-center gap-2"><strong>Phone:</strong> {req.phone}</div>
                  <div className="flex items-center gap-2 md:col-span-2"><strong>Address:</strong> {req.address}</div>
                </div>
                <div className="text-[11px] text-text-secondary mt-4">Requested on: {new Date(req.createdAt).toLocaleString()}</div>
              </div>

              {req.status === "PENDING" && (
                <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={loadingId === req.id}
                    className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl text-[13px] hover:bg-red-100 transition-colors disabled:opacity-50 border-none cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={loadingId === req.id}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-[13px] hover:shadow-lg transition-all disabled:opacity-50 border-none cursor-pointer"
                  >
                    {loadingId === req.id ? "Provisioning..." : "Approve & Provision"}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
