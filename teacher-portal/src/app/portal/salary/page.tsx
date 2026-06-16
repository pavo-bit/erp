"use client";

import { Wallet, Download, Receipt, Sparkles } from "lucide-react";

export default function SalaryPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
            <Wallet className="text-emerald-600" /> Payroll & Compensation
          </h1>
          <p className="text-slate-500 mt-1">View your cryptographic ledger-backed payslips and tax documents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-lg text-slate-800">Recent Payslips</h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              {[
                { month: "September 2025", amount: "₹45,000", status: "Disbursed", date: "Oct 1, 2025" },
                { month: "August 2025", amount: "₹45,000", status: "Disbursed", date: "Sep 1, 2025" },
                { month: "July 2025", amount: "₹45,000", status: "Disbursed", date: "Aug 1, 2025" },
              ].map((slip, i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{slip.month}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Credited on {slip.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-slate-900">{slip.amount}</span>
                    <button className="text-sm text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-700 mt-1">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-900 border border-slate-800 text-white shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24" />
            </div>
            <h3 className="font-bold text-indigo-300 mb-2">YTD Earnings</h3>
            <div className="text-4xl font-black mb-1">₹4,05,000</div>
            <p className="text-sm text-slate-400">Financial Year 2025-2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
