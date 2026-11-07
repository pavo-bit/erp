"use client";

import { Wallet, Download, Receipt } from "lucide-react";
import { useSalaries } from "@/lib/api-hooks";

export default function SalaryPage() {
  const { data: salaryData, isLoading } = useSalaries();
  const salaryRecords = Array.isArray(salaryData) ? salaryData : [];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
            <Wallet className="text-emerald-600" /> Payroll & Compensation
          </h1>
          <p className="text-slate-500 mt-1">View your cryptographic ledger-backed payslips and disbursement records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-lg text-slate-800">Recent Payslips</h2>
            </div>
            
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Loading payroll records...</div>
            ) : salaryRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Receipt className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-slate-700">No Disbursed Payslips</p>
                <p className="text-sm text-slate-500 mt-1">Disbursed salary records will appear here upon payroll processing.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {salaryRecords.map((slip: any, i: number) => (
                  <div key={slip.id || i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{slip.month || "Current Month"}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Status: {slip.status || "DISBURSED"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black text-slate-900">₹{Number(slip.netSalary || slip.amount || 0).toLocaleString()}</span>
                      <button
                        onClick={() => window.open(`/api/v1/hr/salaries/${slip.id}/payslip`, "_blank")}
                        className="text-sm text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-700 mt-1"
                      >
                        <Download className="w-3.5 h-3.5" /> View Payslip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
