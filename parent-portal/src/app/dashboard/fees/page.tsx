"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiCall } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";

export default function FeesModule() {
  const { selectedStudentId, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFees() {
      if (!selectedStudentId) return;
      setLoading(true);
      try {
        const res = await apiCall(`/api/invoices?studentId=${selectedStudentId}`);
        if (res.success) setInvoices(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFees();
  }, [selectedStudentId]);

  if (!selectedStudentId) return null;

  const pendingInvoices = invoices.filter(inv => inv.status === "PENDING" || inv.status === "OVERDUE");
  const paidInvoices = invoices.filter(inv => inv.status === "PAID");

  const handleGoToPaymentPortal = () => {
    // Redirect securely to the dedicated payment portal
    window.open("http://localhost:3007", "_blank");
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Fees & Payments</h1>
        <p className="text-slate-500 dark:text-slate-400">View your child's fee history and navigate to the secure payment portal to clear dues.</p>
      </header>

      {/* Pending Fees Section */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" /> Action Required
        </h2>
        {loading ? (
           <div className="animate-pulse space-y-4">
             <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
           </div>
        ) : pendingInvoices.length > 0 ? (
          <div className="glass-card p-6 border-l-4 border-l-amber-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">Pending Dues Available</h3>
                  <p className="text-slate-500 mt-2">You have {pendingInvoices.length} pending invoice(s). To maintain maximum security, all transactions are handled via our dedicated Payment Portal.</p>
               </div>
               
               <button
                  onClick={handleGoToPaymentPortal}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-teal-500/30 transform transition-all active:scale-[0.98] w-full md:w-auto shrink-0"
                >
                  Go to Secure Payment Portal
                  <ExternalLink className="w-5 h-5" />
                </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-8 text-center rounded-2xl border-dashed">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
            <p className="text-sm text-slate-500">There are no pending fees for this student.</p>
          </div>
        )}
      </section>

      {/* Payment History */}
      <section className="pt-8">
        <h2 className="text-xl font-bold mb-4">Payment History</h2>
        {loading ? (
          <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>
        ) : paidInvoices.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Type</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Paid</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {paidInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{inv.type} Fee</td>
                    <td className="p-4 text-slate-500">{new Date(inv.paidDate || inv.updatedAt).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">₹{inv.amount.toLocaleString()}</td>
                    <td className="p-4"><button className="text-blue-600 hover:underline font-medium">Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No payment history found.</p>
        )}
      </section>
    </div>
  );
}
