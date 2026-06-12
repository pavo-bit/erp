"use client";

import { useState } from "react";
import { Wallet, Download, CheckCircle2, Clock, AlertCircle, CreditCard, Receipt } from "lucide-react";

export default function FeesPage() {
  const [selectedChild, setSelectedChild] = useState(1);

  const children = [
    { id: 1, name: "Aarav Sharma", class: "Class X-A" },
    { id: 2, name: "Diya Sharma", class: "Class VIII-B" }
  ];

  const invoices = [
    { id: "INV-26-1045", month: "October 2026", amount: 4500, dueDate: "Oct 15, 2026", status: "pending", breakdown: [ { name: "Tuition Fee", amount: 3000 }, { name: "Transport Fee", amount: 1000 }, { name: "Lab Fee", amount: 500 } ] },
    { id: "INV-26-0922", month: "September 2026", amount: 4500, dueDate: "Sep 15, 2026", status: "paid", paidOn: "Sep 12, 2026", receiptNo: "REC-26-0811", breakdown: [ { name: "Tuition Fee", amount: 3000 }, { name: "Transport Fee", amount: 1000 }, { name: "Lab Fee", amount: 500 } ] },
    { id: "INV-26-0810", month: "August 2026", amount: 5500, dueDate: "Aug 15, 2026", status: "paid", paidOn: "Aug 10, 2026", receiptNo: "REC-26-0702", breakdown: [ { name: "Tuition Fee", amount: 3000 }, { name: "Transport Fee", amount: 1000 }, { name: "Lab Fee", amount: 500 }, { name: "Annual Exam Fee", amount: 1000 } ] }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Fees & Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage payments, view invoices, and download receipts.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedChild === child.id 
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Invoice List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold mb-4">Payment History</h2>
          
          <div className="space-y-4">
            {invoices.map((inv) => (
              <div key={inv.id} className="glass-card p-0 overflow-hidden flex flex-col sm:flex-row">
                {/* Left Status Bar */}
                <div className={`w-full sm:w-2 ${inv.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                
                <div className="p-6 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold text-lg">{inv.month}</h3>
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 size={12} className="mr-1" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock size={12} className="mr-1" /> Pending
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center space-x-2">
                      <span>{inv.id}</span>
                      <span>•</span>
                      <span>{inv.status === 'paid' ? `Paid on ${inv.paidOn}` : `Due by ${inv.dueDate}`}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end">
                    <div className="text-2xl font-bold mb-3">₹{inv.amount.toLocaleString()}</div>
                    {inv.status === 'paid' ? (
                      <button className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        <Download size={16} className="mr-1.5" /> Download Receipt
                      </button>
                    ) : (
                      <button className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium flex items-center shadow-md shadow-blue-500/20 transition-transform active:scale-95">
                        <CreditCard size={16} className="mr-2" /> Pay Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Outstanding Balance */}
          <div className="glass-card p-6 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border-none text-white shadow-xl">
            <h2 className="font-semibold text-slate-300 mb-2 flex items-center">
              <AlertCircle size={18} className="mr-2 text-amber-400" /> Action Required
            </h2>
            <div className="text-4xl font-black mb-1">₹4,500</div>
            <p className="text-sm text-slate-400 mb-6">Total outstanding balance</p>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-300">October Tuition</span>
                <span className="font-semibold text-white">₹3,000</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-700 pb-2">
                <span className="text-slate-300">Transport</span>
                <span className="font-semibold text-white">₹1,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Lab Fee</span>
                <span className="font-semibold text-white">₹500</span>
              </div>
            </div>
            
            <button className="w-full mt-6 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-sm font-bold flex justify-center items-center transition-colors">
              Pay Entire Balance
            </button>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center">
              <Receipt size={18} className="mr-2 text-blue-500" /> Financial Summary
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Paid (This Year)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₹32,500</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full w-[85%]"></div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">Next Installment</span>
                <span className="text-sm font-medium">Nov 15, 2026</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
