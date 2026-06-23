"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiCall } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { LogOut, ShieldCheck, CreditCard, CheckCircle } from "lucide-react";

export default function Checkout() {
  const { student, loading: authLoading, logout } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!student) {
      window.location.href = "/login";
      return;
    }

    async function loadFees() {
      // For this isolated portal, we fetch all invoices linked to this authenticated student token
      setLoading(true);
      try {
        const res = await apiCall(`/api/invoices`);
        if (res.success) {
           // Filter just in case the endpoint returns everything if not protected by studentId specifically
           // Assuming backend respects the student token
           setInvoices(res.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFees();
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (feeId: string, amount: number) => {
    setProcessingId(feeId);
    try {
      const resLoaded = await loadRazorpay();
      if (!resLoaded) throw new Error("Razorpay SDK failed to load. Are you online?");

      const { order, transactionId } = await apiCall("/api/v1/payments/create-order", "POST", { feeId });
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount,
        currency: "INR",
        name: "SSVM College Square",
        description: "School Fee Payment",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await apiCall("/api/v1/payments/verify", "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              transactionId
            });
            if (verifyRes.success) {
              alert("Payment Successful! Receipt: " + verifyRes.receiptNo);
              setInvoices(invoices.map(inv => inv.id === feeId ? { ...inv, status: "PAID", remainingAmount: 0 } : inv));
            }
          } catch (e: any) {
            alert("Verification Failed: " + e.message);
          }
        },
        prefill: {
          name: student?.name || "Student",
          email: student?.admissionNo + "@student.ssvm",
          contact: "9999999999"
        },
        theme: { color: "#0d9488" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        alert("Payment Failed. Reason: " + response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      alert("Error initiating payment: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (!student) return null;

  const pendingInvoices = invoices.filter(inv => inv.status === "PENDING" || inv.status === "OVERDUE");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
              SS
            </div>
            <span className="font-bold text-slate-900 dark:text-white hidden sm:block">SSVM Payment Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{student.name}</p>
              <p className="text-xs font-medium text-slate-500">Adm No: {student.admissionNo}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-bold border border-slate-200 dark:border-slate-700">
              {student.name.charAt(0)}
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 mt-4">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-8 h-8 text-teal-600 dark:text-teal-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Checkout</h1>
        </div>

        {loading ? (
           <div className="animate-pulse space-y-4">
             <div className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>
             <div className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>
           </div>
        ) : pendingInvoices.length > 0 ? (
          <div className="space-y-4">
            {pendingInvoices.map((inv, i) => {
              const totalAmount = inv.amount + (inv.fineAmount || 0);
              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 border-l-4 border-l-teal-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">{inv.status}</span>
                    </div>
                    <h3 className="font-bold text-xl text-slate-900 dark:text-white">{inv.type} Fee</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Due Date: {new Date(inv.dueDate).toLocaleDateString()}</p>
                    {inv.fineAmount > 0 && <p className="text-sm font-bold text-red-500 mt-1">Includes Late Fine: ₹{inv.fineAmount}</p>}
                  </div>
                  
                  <div className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center min-w-[200px]">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Amount Payable</p>
                    <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">₹{totalAmount.toLocaleString()}</p>
                    <button
                      onClick={() => handlePayment(inv.id, totalAmount)}
                      disabled={processingId === inv.id}
                      className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-teal-500/30 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
                    >
                      {processingId === inv.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                           <CreditCard className="w-5 h-5" />
                           Pay Now
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel p-12 text-center rounded-3xl border-dashed flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-6">
               <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Pending Dues</h2>
            <p className="text-slate-500 max-w-sm">You have successfully cleared all outstanding fee payments for this academic session.</p>
          </div>
        )}
      </main>
      
      <footer className="py-6 text-center text-sm font-medium text-slate-400">
        &copy; {new Date().getFullYear()} SSVM College Square. All rights reserved.
      </footer>
    </div>
  );
}
