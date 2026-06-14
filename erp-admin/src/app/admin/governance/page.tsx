"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export default function GovernancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("financial-close");
  const [isClosing, setIsClosing] = useState(false);

  // Dummy state
  const periods = [
    { id: "1", name: "FY 2024-25", startDate: "2024-04-01", endDate: "2025-03-31", status: "OPEN" },
    { id: "2", name: "FY 2023-24", startDate: "2023-04-01", endDate: "2024-03-31", status: "CLOSED", closedAt: "2024-04-05" },
  ];

  const handleClosePeriod = () => {
    setIsClosing(true);
    setTimeout(() => {
      alert("Ledger locked. Financial period successfully closed. Transactions are now immutable.");
      setIsClosing(false);
    }, 2000);
  };

  const handleArchive = () => {
    alert("Archival Job Queued to AWS Glacier Vault.");
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Compliance Active
          </motion.div>
          <h1 className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight">
            Governance & Compliance
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl">
            Enterprise data classification, financial ledger closure, and AWS Glacier archival controls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-dark)] overflow-x-auto pb-px mt-4">
        {["financial-close", "archival", "data-protection"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`relative px-6 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap
              ${activeTab === tab ? "text-indigo-400" : "text-[var(--color-text-secondary)] hover:text-white"}`}>
            {tab.replace("-", " ")}
            {activeTab === tab && <motion.div layoutId="govTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-400 shadow-[0_0_10px_#818cf8]" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
          
          {/* Financial Close */}
          {activeTab === "financial-close" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-[1.5rem] p-8">
                <h3 className="text-[20px] font-black text-white font-[var(--font-heading)] mb-2">Ledger Governance</h3>
                <p className="text-[13px] text-[var(--color-text-secondary)] mb-8">Lock financial periods to prevent post-closure modifications.</p>
                
                <div className="space-y-4">
                  {periods.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)]/50 hover:bg-[var(--color-bg-dark)] transition-colors">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] font-bold text-white">{p.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">{p.startDate} to {p.endDate}</div>
                      </div>
                      {p.status === 'OPEN' ? (
                        <button onClick={handleClosePeriod} disabled={isClosing} className="px-4 py-2 rounded-lg text-[12px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-50">
                          {isClosing ? "Locking..." : "Close Period"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1">
                          🔒 Locked {p.closedAt}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-[1.5rem] p-8 flex flex-col justify-center items-center text-center">
                <div className="text-[64px] mb-4">⚖️</div>
                <h3 className="text-[18px] font-bold text-white mb-2">Immutable Audit Logs</h3>
                <p className="text-[13px] text-[var(--color-text-secondary)] max-w-sm mb-6">
                  Once a financial period is closed, the idempotency layer rejects all retroactive ledger modifications to guarantee compliance.
                </p>
                <button className="text-indigo-400 font-bold hover:underline">Download Audit Trail</button>
              </div>
            </div>
          )}

          {/* Archival */}
          {activeTab === "archival" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border-dark)] rounded-[1.5rem] p-8">
                 <h3 className="text-[20px] font-black text-white font-[var(--font-heading)] mb-6 flex items-center gap-2">
                   <span className="text-blue-400">🧊</span> Glacier Archival Service
                 </h3>
                 <p className="text-[14px] text-[var(--color-text-secondary)] mb-8">
                   Trigger deep-freeze data pipelines. All graduating student records and closed financial documents will be hashed and pushed to AWS Glacier for cold storage.
                 </p>
                 <button onClick={handleArchive} className="px-6 py-3.5 rounded-xl text-[14px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] transition-transform">
                   Queue End-of-Year Dump
                 </button>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
