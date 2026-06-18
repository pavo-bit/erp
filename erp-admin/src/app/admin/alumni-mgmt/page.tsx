"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { useAlumni, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function AlumniMgmtPage() {
  const [activeTab, setActiveTab] = useState<"APPROVED" | "PENDING">("APPROVED");
  const [search, setSearch] = useState("");
  
  const { data: rawApproved, isLoading: loadingApproved } = useAlumni(`status=APPROVED${search ? `&search=${search}` : ""}`);
  const { data: rawPending, isLoading: loadingPending } = useAlumni("status=PENDING");
  
  const alumni = Array.isArray(rawApproved) ? rawApproved : rawApproved?.data || rawApproved || [];
  const pendingAlumni = Array.isArray(rawPending) ? rawPending : rawPending?.data || rawPending || [];

  const toggleFeatured = async (id: string, current: boolean) => {
    try { await apiCall("/api/v1/alumni", "PUT", { id, isFeatured: !current }); invalidateAll("/api/v1/alumni"); }
    catch (err) { alert((err as Error).message); }
  };

  const handleApproval = async (id: string, status: "APPROVED" | "DECLINED") => {
    if (status === "DECLINED" && !confirm("Are you sure you want to decline and delete this registration?")) return;
    try { 
      await apiCall("/api/v1/alumni/status", "PUT", { id, status }); 
      invalidateAll("/api/v1/alumni"); 
    } catch (err) { alert((err as Error).message); }
  };

  return (
    <>
      <PageHeader 
        title="Alumni Management" 
        subtitle="Manage alumni profiles and featured alumni" 
        action={
          <a 
            href="http://localhost:3003" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer font-[var(--font-heading)] hover:shadow-lg transition-all"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
          >
            🌐 Open Alumni Portal ↗
          </a>
        }
      />
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("APPROVED")}
          className={`py-3 px-4 font-semibold text-[14px] font-[var(--font-heading)] transition-all ${
            activeTab === "APPROVED" ? "border-b-2 border-primary text-primary" : "text-text-secondary"
          }`}
        >
          Registered Alumni ({alumni.length})
        </button>
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`py-3 px-4 font-semibold text-[14px] font-[var(--font-heading)] transition-all ${
            activeTab === "PENDING" ? "border-b-2 border-danger text-danger" : "text-text-secondary"
          }`}
        >
          Pending Approvals {pendingAlumni.length > 0 && <span className="ml-2 bg-danger text-white text-[10px] px-2 py-0.5 rounded-full">{pendingAlumni.length}</span>}
        </button>
      </div>

      {activeTab === "APPROVED" && (
        <>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alumni by name..."
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-[13px] outline-none focus:border-primary mb-6" />
          
          {loadingApproved ? <div className="bg-white rounded-2xl border border-border p-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alumni.map((a: Record<string, unknown>, i: number) => {
                const user = a.user as Record<string, string>;
                return (
                  <motion.div key={a.id as string} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover shadow-sm border border-border" />
                      ) : (
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] bg-gradient-to-br from-primary/10 to-primary/5">🎓</div>
                      )}
                      {a.isFeatured ? <StatusBadge status="Featured" color="#FF6B00" /> : null}
                    </div>
                    <h4 className="text-[15px] font-semibold text-text-primary font-[var(--font-heading)]">{user?.name}</h4>
                    <p className="text-[12px] text-primary font-semibold mb-1">Batch of {a.batch as string} | Class: {a.classPassed as string}</p>
                    <div className="flex flex-col gap-1 text-[12px] text-text-secondary mb-3">
                      {a.location ? <span>📍 {a.location as string}</span> : null}
                      {a.currentRole ? <span>💼 {a.currentRole as string}</span> : null}
                      {a.company ? <span>🏢 {a.company as string}</span> : null}
                      {a.achievement ? <span>🏆 {a.achievement as string}</span> : null}
                      {a.linkedin ? <a href={a.linkedin as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">🔗 LinkedIn Profile</a> : null}
                    </div>
                    <button onClick={() => toggleFeatured(a.id as string, a.isFeatured as boolean)}
                      className={`text-[12px] font-semibold bg-transparent border-none cursor-pointer font-[var(--font-heading)] ${a.isFeatured ? "text-danger" : "text-primary"}`}>
                      {a.isFeatured ? "Remove Featured" : "⭐ Make Featured"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "PENDING" && (
        <>
          {loadingPending ? <div className="bg-white rounded-2xl border border-border p-12 text-center"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></div> : (
            pendingAlumni.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-12 text-center text-text-secondary text-[14px]">
                No pending registrations to approve.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingAlumni.map((a: Record<string, unknown>, i: number) => {
                  const user = a.user as Record<string, string>;
                  return (
                    <motion.div key={a.id as string} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-border p-5 border-l-4 border-l-danger">
                      <div className="flex justify-between items-center mb-3">
                        <StatusBadge status="Pending Approval" color="#EF4444" />
                        <span className="text-[10px] text-text-secondary">{new Date(a.createdAt as string).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover shadow-sm border border-border" />
                        ) : (
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-[20px] bg-gradient-to-br from-primary/10 to-primary/5">🎓</div>
                        )}
                        <div>
                          <h4 className="text-[15px] font-semibold text-text-primary font-[var(--font-heading)]">{user?.name}</h4>
                          <p className="text-[12px] text-text-secondary">Email: {user?.email}</p>
                          <p className="text-[12px] text-text-secondary">Phone: {user?.phone || "N/A"}</p>
                        </div>
                      </div>
                      <div className="bg-surface p-3 rounded-xl border border-border/50 text-[12px] text-text-secondary space-y-1">
                        <p><strong className="text-text-primary">Batch:</strong> {a.batch as string} | <strong className="text-text-primary">Class:</strong> {a.classPassed as string}</p>
                        {a.location ? <p><strong className="text-text-primary">Location:</strong> {a.location as string}</p> : null}
                        {a.currentRole ? <p><strong className="text-text-primary">Role:</strong> {a.currentRole as string} {a.company ? `at ${a.company}` : ""}</p> : null}
                        {a.linkedin ? <p><a href={a.linkedin as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">LinkedIn Profile ↗</a></p> : null}
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => handleApproval(a.id as string, "APPROVED")}
                          className="flex-1 py-2 bg-success text-white text-[12px] font-bold rounded-lg hover:bg-opacity-90 transition-all"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleApproval(a.id as string, "DECLINED")}
                          className="flex-1 py-2 bg-danger/10 text-danger text-[12px] font-bold rounded-lg hover:bg-danger/20 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </>
  );
}
