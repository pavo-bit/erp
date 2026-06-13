"use client";

import { useState } from "react";
import { useLibraryBooks, useLibraryTransactions, apiCall, invalidate } from "@/lib/api-hooks";
import { PageHeader, DataTable, StatusBadge } from "@/components/DashboardLayout";

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"BOOKS" | "TRANSACTIONS">("BOOKS");
  const { data: books, isLoading: loadingB } = useLibraryBooks();
  const { data: transactions, isLoading: loadingT } = useLibraryTransactions();
  
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [formData, setFormData] = useState({ bookId: "", studentId: "" });

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall("/api/v1/library/transactions/issue", "POST", formData);
      invalidate("/api/v1/library/transactions");
      invalidate("/api/v1/library/books");
      setShowIssueModal(false);
      setFormData({ bookId: "", studentId: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to issue book");
    }
  };

  const handleReturnBook = async (transactionId: string) => {
    if (!confirm("Are you sure you want to mark this book as returned?")) return;
    try {
      await apiCall(`/api/v1/library/transactions/${transactionId}/return`, "PUT", { condition: "GOOD" });
      invalidate("/api/v1/library/transactions");
      invalidate("/api/v1/library/books");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to return book");
    }
  };

  const bRows = books?.map((b: any) => [
    <strong key="title">{b.title}</strong>,
    b.author,
    b.isbn || "-",
    b.category,
    b.totalCopies,
    b.availableCopies,
    <StatusBadge key="status" status={b.availableCopies > 0 ? "AVAILABLE" : "OUT_OF_STOCK"} color={b.availableCopies > 0 ? "#10B981" : "#EF4444"} />
  ]) || [];

  const tRows = transactions?.map((t: any) => [
    <strong key="book">{t.book?.title}</strong>,
    t.student?.name || "Unknown",
    new Date(t.issuedAt).toLocaleDateString(),
    new Date(t.dueDate).toLocaleDateString(),
    t.returnedAt ? new Date(t.returnedAt).toLocaleDateString() : "-",
    t.status === "ISSUED" ? (
      <button onClick={() => handleReturnBook(t.id)} className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold hover:bg-primary/20">
        Mark Returned
      </button>
    ) : (
      <StatusBadge key="status" status={t.status} color={t.status === "RETURNED" ? "#10B981" : "#F59E0B"} />
    )
  ]) || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Library Management" 
        subtitle="Manage library inventory, book issuance, and returns." 
        action={
          <button onClick={() => setShowIssueModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition">
            + Issue Book
          </button>
        }
      />

      <div className="flex gap-4 border-b border-border">
        <button 
          onClick={() => setActiveTab("BOOKS")}
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "BOOKS" ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-text-primary"}`}
        >
          Book Inventory
        </button>
        <button 
          onClick={() => setActiveTab("TRANSACTIONS")}
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "TRANSACTIONS" ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-text-primary"}`}
        >
          Issue/Return Logs
        </button>
      </div>

      {activeTab === "BOOKS" && (
        loadingB ? <div className="text-text-secondary text-sm">Loading...</div> :
        <DataTable headers={["Title", "Author", "ISBN", "Category", "Total Copies", "Available", "Status"]} rows={bRows} />
      )}

      {activeTab === "TRANSACTIONS" && (
        loadingT ? <div className="text-text-secondary text-sm">Loading...</div> :
        <DataTable headers={["Book Title", "Student", "Issued On", "Due Date", "Returned On", "Action/Status"]} rows={tRows} />
      )}

      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Issue Book</h2>
            <form onSubmit={handleIssueBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Select Book</label>
                <select required value={formData.bookId} onChange={e => setFormData({...formData, bookId: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                  <option value="">Select a book...</option>
                  {books?.filter((b: any) => b.availableCopies > 0).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.title} (Avail: {b.availableCopies})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Student ID / Name</label>
                <input required type="text" placeholder="Enter student ID..." value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                <p className="text-[10px] text-text-secondary mt-1">For demo purposes, enter the exact MongoDB object ID of the student.</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">Issue Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
