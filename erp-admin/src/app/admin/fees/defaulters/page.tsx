"use client";

import { useState, useEffect } from "react";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { apiCall } from "@/lib/api-hooks";

export default function DefaultersPage() {
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDefaulters();
  }, []);

  const fetchDefaulters = async () => {
    try {
      setLoading(true);
      const res = await apiCall("/api/finance/defaulters", "GET");
      setDefaulters(res.data || []);
    } catch (e) {
      console.error("Failed to fetch defaulters");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType: string, studentName: string) => {
    // Mock action since notification integration requires specific SMS/Email gateways
    alert(`${actionType} sent to ${studentName}'s Guardian!`);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Defaulters Dashboard" 
        subtitle="Track and notify students with overdue invoices"
        action={<button onClick={() => alert("Bulk reminders generated!")} className="px-4 py-2 bg-danger text-white rounded-md text-sm font-semibold border-none cursor-pointer">Generate Reminders</button>}
      />

      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="p-4 text-sm font-semibold text-text-secondary">Student</th>
                <th className="p-4 text-sm font-semibold text-text-secondary">Class</th>
                <th className="p-4 text-sm font-semibold text-text-secondary">Amount Due</th>
                <th className="p-4 text-sm font-semibold text-text-secondary">Fine</th>
                <th className="p-4 text-sm font-semibold text-text-secondary">Days Overdue</th>
                <th className="p-4 text-sm font-semibold text-text-secondary">Contact</th>
                <th className="p-4 text-sm font-semibold text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center">Loading defaulters...</td></tr>
              ) : defaulters.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-text-secondary">No defaulters found! 🎉</td></tr>
              ) : (
                defaulters.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                    <td className="p-4 font-medium text-text-primary">{inv.student?.name}</td>
                    <td className="p-4 text-text-secondary">{inv.student?.class}-{inv.student?.section}</td>
                    <td className="p-4 font-semibold text-error">₹{inv.remainingAmount}</td>
                    <td className="p-4 text-error">₹{inv.fineAmount}</td>
                    <td className="p-4">
                      <StatusBadge status={`${inv.daysOverdue} Days`} color="#EF4444" />
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {inv.student?.guardian?.primaryPhone || "N/A"}
                    </td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => handleAction("SMS", inv.student?.name)} className="px-3 py-1 bg-surface text-[12px] font-semibold text-text-primary border border-border rounded-md hover:bg-border cursor-pointer transition-colors">SMS</button>
                      <button onClick={() => handleAction("Email", inv.student?.name)} className="px-3 py-1 bg-surface text-[12px] font-semibold text-text-primary border border-border rounded-md hover:bg-border cursor-pointer transition-colors">Email</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
