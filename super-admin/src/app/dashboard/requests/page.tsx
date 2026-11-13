"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiCall } from "@/lib/api";
import { motion } from "framer-motion";
import { Inbox, CheckCircle2, XCircle, Clock, Building2, User, Mail, Phone, MapPin, Loader2 } from "lucide-react";

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
    if (
      !confirm(
        "Are you sure you want to approve this school? This will automatically provision an ERP workspace and default admin account."
      )
    )
      return;

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
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Inbox className="w-4 h-4" /> SaaS Onboarding
          </div>
          <h1 className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-slate-400 font-[var(--font-heading)] leading-tight">
            Registration Requests
          </h1>
          <p className="text-[15px] text-slate-400 mt-2 font-medium max-w-xl">
            Review incoming institutional registration applications, evaluate tenant readiness, and trigger automated ERP workspace provisioning.
          </p>
        </div>
      </div>

      {!requests ? (
        <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          <span className="text-sm">Loading registration requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 p-16 text-center text-slate-400">
          <Inbox className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <div className="text-lg font-bold text-white mb-1">No Pending Requests</div>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            All institutional onboarding requests have been reviewed. New applications from the SaaS frontend will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl hover:border-pink-500/30 transition-colors"
            >
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-[var(--font-heading)]">
                      {req.schoolName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="text-pink-400 font-bold uppercase tracking-wider">
                        {req.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{req.principalName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{req.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{req.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{req.address}</span>
                  </div>
                  <div className="text-slate-400">
                    Expected Students: <strong className="text-white">{req.expectedStudents || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {req.status === "PENDING" && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReject(req.id)}
                    disabled={loadingId === req.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(req.id)}
                    disabled={loadingId === req.id}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 shadow-md hover:scale-105 transition-all disabled:opacity-50 cursor-pointer border-none"
                  >
                    {loadingId === req.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Approve & Provision</span>
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
