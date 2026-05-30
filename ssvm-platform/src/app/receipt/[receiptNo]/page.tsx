"use client";

import { use, useEffect, useState } from "react";
import { apiCall } from "@/lib/api-hooks";
import { motion } from "framer-motion";

export default function ReceiptPage({ params }: { params: Promise<{ receiptNo: string }> }) {
  const resolvedParams = use(params);
  const [feeData, setFeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would have a specific endpoint to fetch a fee by receiptNo
    // For this implementation, we assume we fetch all fees for the user and find the one with this receiptNo
    const fetchFee = async () => {
      try {
        const data = await apiCall("/api/fees");
        const fees = Array.isArray(data) ? data : data?.data || [];
        const fee = fees.find((f: any) => f.receiptNo === resolvedParams.receiptNo);
        if (fee) {
          setFeeData(fee);
        }
      } catch (error) {
        console.error("Failed to load receipt:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFee();
  }, [resolvedParams.receiptNo]);

  if (loading) return <div className="p-10 text-center">Loading receipt...</div>;
  
  if (!feeData) return <div className="p-10 text-center text-red-500">Receipt not found or unauthorized.</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 flex justify-center font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-2xl shadow-2xl p-8 md:p-12 border-t-8 border-blue-600"
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 uppercase tracking-wide">
              Saraswati Shishu Vidya Mandir
            </h1>
            <p className="text-gray-500 text-sm">College Square, Cuttack, Odisha - 753003</p>
            <p className="text-gray-500 text-sm">Email: ssvmcollegesquare1987@gmail.com</p>
            <p className="text-gray-500 text-sm">Phone: (0671) 2548577, 3582999</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-blue-600 uppercase tracking-widest mb-2">FEE RECEIPT</h2>
            <p className="text-sm font-bold text-gray-800">Receipt No: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{feeData.receiptNo}</span></p>
            <p className="text-sm text-gray-500 mt-1">
              Date: {feeData.paidDate ? new Date(feeData.paidDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Student Details */}
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Student Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-semibold text-gray-900">{feeData.student?.user?.name || "Student Name"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Class & Section</p>
              <p className="font-semibold text-gray-900">{feeData.student?.class} - {feeData.student?.section}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Roll No</p>
              <p className="font-semibold text-gray-900">{feeData.student?.rollNo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Session</p>
              <p className="font-semibold text-gray-900">{feeData.session}</p>
            </div>
          </div>
        </div>

        {/* Fee Details */}
        <div className="mb-12">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Details</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 text-sm font-semibold text-gray-600">Description</th>
                <th className="py-3 text-sm font-semibold text-gray-600 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 text-gray-800 font-medium">{feeData.type} Fee</td>
                <td className="py-4 text-right text-gray-800">₹{feeData.amount.toFixed(2)}</td>
              </tr>
              {feeData.fineAmount > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-4 text-gray-800 font-medium">Late Fine</td>
                  <td className="py-4 text-right text-gray-800">₹{feeData.fineAmount.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-4 text-lg font-bold text-gray-900 text-right">Total Paid</td>
                <td className="py-4 text-lg font-bold text-blue-600 text-right">
                  ₹{(feeData.amount + (feeData.fineAmount || 0)).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-12 flex justify-between items-end">
          <p className="text-xs text-gray-400 max-w-[250px]">
            This is a computer generated receipt and does not require a physical signature.
          </p>
          <div className="text-center">
            <div className="w-32 h-px bg-gray-300 mb-2"></div>
            <p className="text-sm font-bold text-gray-600">Authorized Signatory</p>
          </div>
        </div>

        {/* Print Button - hidden when printing */}
        <div className="mt-12 flex justify-center print:hidden">
          <button 
            onClick={() => window.print()} 
            className="px-8 py-3 bg-gray-900 text-white font-bold rounded hover:bg-black transition-colors flex items-center gap-2 shadow-lg"
          >
            🖨️ Print Receipt
          </button>
        </div>
      </motion.div>
    </div>
  );
}
