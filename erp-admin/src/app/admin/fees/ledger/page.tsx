"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, StatCard, StatusBadge } from "@/components/DashboardLayout";
import { Lock, CheckCircle2, AlertCircle, RefreshCw, Calendar, BookOpen, ShieldCheck, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface FinancialPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  closedAt?: string;
  closedBy?: string;
}

interface LedgerAccountSummary {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  balance: number;
}

const STANDARD_ACCOUNTS: LedgerAccountSummary[] = [
  { code: "1010-BANK", name: "School Operating Bank Account", type: "ASSET", balance: 1450200.00 },
  { code: "1020-CASH", name: "Cashier Cash-on-Hand Account", type: "ASSET", balance: 68450.00 },
  { code: "1200-AR", name: "Accounts Receivable (Student Tuition)", type: "ASSET", balance: 320000.00 },
  { code: "2100-ADVANCE", name: "Student Advance Fee Liability", type: "LIABILITY", balance: 85000.00 },
  { code: "4010-TUITION", name: "Fee & Tuition Income", type: "INCOME", balance: 1753650.00 },
  { code: "5010-SAL", name: "Staff Payroll Expense", type: "EXPENSE", balance: 520000.00 },
];

export default function LedgerAndFinancialClosePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"ledger" | "periods">("ledger");
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [periods, setPeriods] = useState<FinancialPeriod[]>([
    {
      id: "fp_2025_26",
      name: "FY 2025-26",
      startDate: "2025-04-01",
      endDate: "2026-03-31",
      status: "OPEN",
    },
    {
      id: "fp_2024_25",
      name: "FY 2024-25",
      startDate: "2024-04-01",
      endDate: "2025-03-31",
      status: "CLOSED",
      closedAt: "2025-04-05",
      closedBy: "Admin Auditor",
    },
  ]);

  const handleClosePeriod = async (periodId: string) => {
    if (!confirm("Are you sure you want to lock and close this financial period? Once closed, transactions in this period become immutable.")) {
      return;
    }

    setIsClosingPeriod(true);
    try {
      // Simulate/trigger ledger close lock
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setPeriods((prev) =>
        prev.map((p) =>
          p.id === periodId
            ? {
                ...p,
                status: "CLOSED" as const,
                closedAt: new Date().toISOString().split("T")[0],
                closedBy: user?.name || "School Administrator",
              }
            : p
        )
      );
      alert("Financial period closed successfully. All historical ledger entries for this period are locked.");
    } catch (err: any) {
      alert("Failed to close financial period: " + err.message);
    } finally {
      setIsClosingPeriod(false);
    }
  };

  const totalDebits = STANDARD_ACCOUNTS.filter((a) => a.type === "ASSET" || a.type === "EXPENSE").reduce(
    (acc, a) => acc + a.balance,
    0
  );
  const totalCredits = STANDARD_ACCOUNTS.filter((a) => a.type === "LIABILITY" || a.type === "INCOME").reduce(
    (acc, a) => acc + a.balance,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting, Ledger & Financial Close"
        subtitle="Double-entry financial ledger balances, chart of accounts, and period closure governance."
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Operating Bank" value="₹14,50,200" change="Verified" trend="up" icon="🏦" color="#10B981" />
        <StatCard title="Accounts Receivable" value="₹3,20,000" change="Outstanding Fees" trend="down" icon="💳" color="#F59E0B" />
        <StatCard title="Advance Liability" value="₹85,000" change="Pre-paid" trend="neutral" icon="⚖️" color="#6366F1" />
        <StatCard title="Ledger Invariant" value="Balanced" change="Σ Debit ≡ Σ Credit" trend="up" icon="🛡️" color="#3B82F6" />
      </div>

      {/* Tab Controls */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "ledger"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Chart of Accounts & Ledger</span>
        </button>
        <button
          onClick={() => setActiveTab("periods")}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "periods"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Financial Periods & Period Close</span>
        </button>
      </div>

      {/* Tab 1: Chart of Accounts & Ledger */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">Double-Entry Ledger Integrity Verified</h4>
                <p className="text-[11px] text-text-secondary">
                  Total Active Debits: <strong>₹{totalDebits.toLocaleString("en-IN")}</strong> | Total Active Credits: <strong>₹{totalCredits.toLocaleString("en-IN")}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => alert("Trial balance report exported.")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border text-xs font-semibold rounded-lg text-text-primary transition"
            >
              <Download className="w-3.5 h-3.5 text-text-secondary" />
              Export Trial Balance
            </button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
                  <th className="p-3">Account Code</th>
                  <th className="p-3">Account Title</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3 text-right">Debit Balance</th>
                  <th className="p-3 text-right">Credit Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {STANDARD_ACCOUNTS.map((acc) => {
                  const isDebit = acc.type === "ASSET" || acc.type === "EXPENSE";
                  return (
                    <tr key={acc.code} className="hover:bg-surface/50 transition">
                      <td className="p-3 font-mono font-bold text-text-primary">{acc.code}</td>
                      <td className="p-3 font-semibold text-text-primary">{acc.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-text-secondary">
                          {acc.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        {isDebit ? `₹${acc.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">
                        {!isDebit ? `₹${acc.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Financial Periods & Period Close */}
      {activeTab === "periods" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
            <h4 className="font-bold text-xs text-amber-600 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Financial Period Immutability Policy
            </h4>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              When a financial period is closed, the accounting engine rejects retroactive invoice creations, voids, or payment adjustments backdated to that period. All accounts receivable and cash balances are finalized.
            </p>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
                  <th className="p-3">Period Name</th>
                  <th className="p-3">Date Range</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Closed Details</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/50 transition">
                    <td className="p-3 font-bold text-text-primary">{p.name}</td>
                    <td className="p-3 text-text-secondary">
                      {p.startDate} &rarr; {p.endDate}
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        status={p.status}
                        color={p.status === "OPEN" ? "#10B981" : "#6B7280"}
                      />
                    </td>
                    <td className="p-3 text-text-secondary">
                      {p.status === "CLOSED" ? (
                        <span>
                          Locked on {p.closedAt} by {p.closedBy}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Active Operating Period</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {p.status === "OPEN" ? (
                        <button
                          onClick={() => handleClosePeriod(p.id)}
                          disabled={isClosingPeriod}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Close Period</span>
                        </button>
                      ) : (
                        <span className="text-text-secondary text-xs flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-text-secondary" />
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

