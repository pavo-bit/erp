"use client";

import { useState, useEffect } from "react";
import { Wallet, Download, CheckCircle2, Clock, AlertCircle, CreditCard, Receipt, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiCall } from "@/lib/api-hooks";

export default function FeesPage() {
  const { user, selectedStudentId, setSelectedStudentId } = useAuth();
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Derive children from the AuthContext
  const children = user?.guardian?.students || [];

  useEffect(() => {
    if (selectedStudentId) {
      fetchInvoices(selectedStudentId);
    } else {
      setLoading(false);
    }
  }, [selectedStudentId]);

  const fetchInvoices = async (studentId: string) => {
    try {
      setLoading(true);
      // Fetch from the robust Phase E backend Ledger
      const res = await apiCall(`/api/v1/invoices?studentId=${studentId}`);
      if (res.data) {
        setInvoices(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch invoices", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (amount: number, invId: string) => {
    setPayingId(invId);
    
    // Simulate Razorpay SDK UI delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Simulate the Webhook firing or directly hit the /pay endpoint to record Ledger Entry
      const res = await apiCall(`/api/v1/invoices/${invId}/pay`, "PUT", {
        amountPaid: amount,
        gateway: "RAZORPAY",
        transactionId: `pay_${Math.random().toString(36).substring(2, 10)}`
      });

      if (res.success) {
        // Optimistic update
        setInvoices(prev => prev.map(inv => 
          inv.id === invId 
            ? { ...inv, status: "PAID", amountPaid: amount, remainingAmount: 0, paidDate: new Date().toISOString() } 
            : inv
        ));
      }
    } catch (e) {
      alert("Payment failed: " + (e as Error).message);
    } finally {
      setPayingId(null);
    }
  };

  const outstandingBalance = invoices
    .filter(i => i.status !== "PAID")
    .reduce((sum, i) => sum + (i.remainingAmount || i.amount), 0);
    
  const totalPaid = invoices
    .filter(i => i.status === "PAID")
    .reduce((sum, i) => sum + (i.amountPaid || i.amount), 0);

  if (!selectedStudentId) {
    return <div className="p-10 text-center text-slate-500">No student profile linked.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Absolute Aesthetic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-slate-900 to-indigo-800 dark:from-white dark:to-indigo-300 bg-clip-text text-transparent">
            Immutable Ledger & Invoices
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Securely view double-entry ledger transactions and dynamic fee structures.</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl w-max shadow-sm border border-slate-200 dark:border-slate-700">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedStudentId(child.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStudentId === child.id 
                  ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Main Invoice List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            Ledger History
          </h2>
          
          <div className="space-y-4">
            {loading ? (
              <div className="h-48 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-semibold text-lg">No Invoices Found</h3>
                <p className="text-slate-500 text-sm mt-1">The billing engine has not generated invoices for this student yet.</p>
              </div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 p-0 overflow-hidden flex flex-col sm:flex-row transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                  
                  {/* Left Status Bar */}
                  <div className={`w-full sm:w-2 transition-colors ${inv.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  
                  <div className="p-6 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-bold text-lg">{inv.description || inv.type} Fee</h3>
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                            <CheckCircle2 size={12} className="mr-1.5" /> Ledger Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                            <Clock size={12} className="mr-1.5" /> Action Required
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center space-x-2 mt-2">
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">{inv.id}</span>
                        <span>•</span>
                        <span>{inv.status === 'PAID' ? `Paid on ${new Date(inv.paidDate).toLocaleDateString()}` : `Due by ${new Date(inv.dueDate).toLocaleDateString()}`}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end">
                      <div className="text-2xl font-black mb-3 text-slate-900 dark:text-white">₹{(inv.amount).toLocaleString()}</div>
                      {inv.status === 'PAID' ? (
                        <button className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors">
                          <Receipt size={16} className="mr-1.5" /> View Receipt
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePayment(inv.amount, inv.id)} 
                          disabled={payingId === inv.id}
                          className="px-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-blue-600 hover:from-slate-800 hover:to-slate-700 dark:hover:from-indigo-500 dark:hover:to-blue-500 text-white rounded-xl text-sm font-bold flex items-center shadow-lg shadow-slate-900/20 dark:shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-70"
                        >
                          {payingId === inv.id ? (
                            <><Loader2 size={16} className="mr-2 animate-spin" /> Processing securely...</>
                          ) : (
                            <><CreditCard size={16} className="mr-2 group-hover:scale-110 transition-transform" /> Pay & Sync Ledger</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Outstanding Balance */}
          <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-slate-700 text-white shadow-2xl group hover:shadow-indigo-500/20 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-24 h-24" />
            </div>
            
            <h2 className="font-medium text-indigo-300 mb-2 flex items-center">
              <AlertCircle size={18} className="mr-2 text-amber-400" /> Outstanding Balance
            </h2>
            <div className="text-5xl font-black mb-1 tracking-tight">₹{outstandingBalance.toLocaleString()}</div>
            <p className="text-sm text-slate-400 mb-8">Unpaid receivables across active invoices</p>
            
            {outstandingBalance > 0 ? (
              <button className="w-full py-3.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-sm font-bold flex justify-center items-center transition-transform active:scale-95 shadow-xl">
                Clear Total Balance
              </button>
            ) : (
              <div className="w-full py-3.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold flex justify-center items-center border border-emerald-500/30">
                <CheckCircle2 size={18} className="mr-2" /> All clear
              </div>
            )}
          </div>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="font-bold mb-4 flex items-center text-slate-800 dark:text-slate-100">
              <Receipt size={18} className="mr-2 text-indigo-500" /> Financial Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Paid (This Session)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">₹{totalPaid.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: totalPaid + outstandingBalance === 0 ? '0%' : `${(totalPaid / (totalPaid + outstandingBalance)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Ledger Synchronized
                </span>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
                  Real-time
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
