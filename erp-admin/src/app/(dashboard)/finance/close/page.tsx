"use client";

import { useState } from "react";
import { useFinancialClosePeriods, apiCall } from "@/lib/api-hooks";
import { Lock, FileWarning, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function FinancialCloseDashboard() {
  const { data: periods, isLoading, mutate } = useFinancialClosePeriods();
  const [closingId, setClosingId] = useState<string | null>(null);

  const handleClose = async (periodId: string) => {
    setClosingId(periodId);
    try {
      await apiCall(`/api/v1/finance/governance/periods/${periodId}/close`, "POST");
      mutate();
    } catch (err: any) {
      alert(err.message || "Failed to close period. Ensure no pending transactions exist.");
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10">
          <Lock className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h1 className="text-4xl font-black flex items-center gap-4">
            <Lock className="w-10 h-10 text-emerald-400" />
            Financial Month-End Close
          </h1>
          <p className="text-emerald-100/80 text-lg">
            Zero-Trust Ledger Locking. Executing a month-end close permanently freezes all General Ledger entries for that period. This action is immutable and cannot be undone.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-emerald-500" />
            Accounting Periods
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : !periods || periods.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No accounting periods available. Check ledger initialization.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {periods.map((period: any) => {
              const isClosed = period.status === 'CLOSED';
              const canClose = !isClosed;
              
              return (
                <div key={period.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isClosed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                      {isClosed ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        {new Date(period.startDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        {isClosed && <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 font-bold uppercase tracking-wider">Locked</span>}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        {new Date(period.startDate).toLocaleDateString()} — {new Date(period.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {canClose && (
                    <button
                      onClick={() => handleClose(period.id)}
                      disabled={closingId === period.id}
                      className="px-6 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {closingId === period.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Execute Close
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
