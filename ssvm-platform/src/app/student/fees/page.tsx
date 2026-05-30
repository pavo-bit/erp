"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { useFees, apiCall, invalidate } from "@/lib/api-hooks";

// Extend window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StudentFees() {
  const { data: feesRaw, isLoading } = useFees();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Normalize data depending on pagination structure
  const fees = Array.isArray(feesRaw) ? feesRaw : feesRaw?.data || [];

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (feeId: string, amount: number) => {
    setIsProcessing(feeId);
    try {
      // 1. Load Script
      const res = await loadRazorpayScript();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsProcessing(null);
        return;
      }

      // 2. Create Order on Backend
      const orderData = await apiCall("/api/payments/create-order", "POST", { feeId });
      if (!orderData || !orderData.order) {
        alert("Failed to create order");
        setIsProcessing(null);
        return;
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.order.amount,
        currency: "INR",
        name: "SSVM College Square",
        description: "Fee Payment",
        image: "/favicon.ico",
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // 4. Verify Payment on Backend
            const verifyData = await apiCall("/api/payments/verify", "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              transactionId: orderData.transactionId,
            });

            if (verifyData && verifyData.success) {
              alert(`Payment Successful! Receipt No: ${verifyData.receiptNo}`);
              invalidate("/api/fees"); // Refresh fees list
            } else {
              alert("Payment verification failed.");
            }
          } catch (err: any) {
            alert(err.message || "Payment verification error");
          }
        },
        prefill: {
          name: "Student Name",
          email: "student@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#3B82F6"
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        alert(response.error.description);
      });
      paymentObject.open();

    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading fees...</div>;
  }

  return (
    <>
      <PageHeader 
        title="Fees & Payments" 
        subtitle="Manage your academic fee payments, readmissions, and late fines"
      />

      <div className="grid gap-6">
        {fees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500">
            No fees recorded yet.
          </div>
        ) : (
          fees.map((fee: any) => {
            const isPending = fee.status === "PENDING" || fee.status === "OVERDUE";
            const statusColor = fee.status === "PAID" ? "#10B981" : fee.status === "OVERDUE" ? "#EF4444" : "#F59E0B";
            
            return (
              <motion.div 
                key={fee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{fee.type} Fee</h3>
                    <StatusBadge status={fee.status} color={statusColor} />
                  </div>
                  <div className="text-sm text-gray-500 mb-1">
                    Session: {fee.session}
                  </div>
                  <div className="text-sm text-gray-500">
                    Due Date: {new Date(fee.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  {fee.remarks && (
                    <div className="text-sm text-gray-400 mt-2 italic">"{fee.remarks}"</div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[200px]">
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900">
                      ₹{fee.amount + (fee.fineAmount || 0)}
                    </div>
                    {fee.fineAmount > 0 && (
                      <div className="text-xs text-red-500 font-semibold">
                        Includes ₹{fee.fineAmount} Late Fine
                      </div>
                    )}
                  </div>

                  {isPending ? (
                    <button
                      onClick={() => handlePayment(fee.id, fee.amount + (fee.fineAmount || 0))}
                      disabled={isProcessing === fee.id}
                      className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isProcessing === fee.id ? "Processing..." : "Pay Now"}
                    </button>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-semibold text-green-600 mb-1">
                        Paid on {fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : 'N/A'}
                      </div>
                      {fee.receiptNo && (
                        <Link href={`/receipt/${fee.receiptNo}`} target="_blank" className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md font-mono transition-colors border border-blue-200">
                          Receipt: {fee.receiptNo} ↗
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </>
  );
}
