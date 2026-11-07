"use client";

import { useState, useEffect } from "react";
import { apiCall } from "@/lib/api-hooks";
import {
  Banknote,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  RotateCcw,
  User,
  Calendar,
  CreditCard,
  Building,
  Loader2,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";

interface StudentSearchResult {
  id: string;
  admissionNo: string;
  name: string;
  rollNo: string;
  branch: string | null;
  className: string | null;
  sectionName: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  outstandingInvoiceCount: number;
  totalOutstanding: string;
  totalAdvanceCredit: string;
}

interface InvoiceItem {
  id: string;
  type: string;
  description: string;
  amount: string;
  fineAmount: string;
  amountPaid: string;
  remainingAmount: string;
  status: string;
  dueDate: string;
  isOverdue: boolean;
}

interface AllocationItem {
  invoiceId: string;
  invoiceDescription: string;
  dueDate: string;
  previousBalance: string;
  allocatedAmount: string;
  principalPaid: string;
  finePaid: string;
  remainingBalance: string;
  newStatus: string;
}

interface AllocationPreview {
  totalReceived: string;
  totalAllocated: string;
  advanceCreditAmount: string;
  allocations: AllocationItem[];
  amountInWords: string;
}

interface DailyRegisterData {
  date: string;
  totalCollected: string;
  receiptCount: number;
  byPaymentMethod: Record<string, string>;
  byCashier: { cashierId: string; cashierName: string; totalCollected: string; receiptCount: number }[];
  receipts: {
    id: string;
    receiptNo: string;
    studentName: string;
    admissionNo: string;
    totalAmount: string;
    paymentMethod: string;
    cashierName: string;
    paidAt: string;
    reprintCount: number;
    isCancelled: boolean;
  }[];
}

export default function CashFeeCollectionPage() {
  const [activeTab, setActiveTab] = useState<"COLLECTION" | "REGISTER">("COLLECTION");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);

  // Selected Student & Invoices
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [studentInvoices, setStudentInvoices] = useState<InvoiceItem[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CHEQUE" | "DD" | "COUNTER_UPI" | "BANK_TRANSFER">("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [instrumentNo, setInstrumentNo] = useState("");
  const [instrumentDate, setInstrumentDate] = useState("");
  const [issuingBank, setIssuingBank] = useState("");
  const [pendingClearance, setPendingClearance] = useState(false);
  const [remarks, setRemarks] = useState("");

  // Preview & Processing
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Receipt Modal
  const [completedReceiptId, setCompletedReceiptId] = useState<string | null>(null);
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null);
  const [isLoadingReceiptHtml, setIsLoadingReceiptHtml] = useState(false);

  // Daily Register State
  const [registerDate, setRegisterDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dailyRegister, setDailyRegister] = useState<DailyRegisterData | null>(null);
  const [isLoadingRegister, setIsLoadingRegister] = useState(false);

  // Search Debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiCall(`/api/v1/finance/cash/students?q=${encodeURIComponent(searchQuery)}`, "GET");
        setSearchResults(res || []);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Student Invoices
  const handleSelectStudent = async (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setIsLoadingInvoices(true);
    setErrorMessage(null);
    setPreview(null);
    setCompletedReceiptId(null);
    try {
      const res = await apiCall(`/api/v1/finance/cash/students/${student.id}/invoices`, "GET");
      setStudentInvoices(res.invoices || []);
      const allIds = (res.invoices || []).map((inv: InvoiceItem) => inv.id);
      setSelectedInvoiceIds(allIds);
      // Auto-set amount received to total outstanding
      const totalDue = (res.invoices || []).reduce(
        (sum: number, inv: InvoiceItem) => sum + parseFloat(inv.remainingAmount),
        0
      );
      setAmountReceived(totalDue.toFixed(2));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load student invoices");
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Toggle Single Invoice
  const handleToggleInvoice = (invId: string) => {
    setSelectedInvoiceIds((prev) => {
      const updated = prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId];
      // Recalculate default sum
      const targetSum = studentInvoices
        .filter((inv) => updated.includes(inv.id))
        .reduce((sum, inv) => sum + parseFloat(inv.remainingAmount), 0);
      setAmountReceived(targetSum > 0 ? targetSum.toFixed(2) : "");
      return updated;
    });
  };

  // Select / Deselect All Invoices
  const handleToggleAllInvoices = () => {
    if (selectedInvoiceIds.length === studentInvoices.length) {
      setSelectedInvoiceIds([]);
      setAmountReceived("");
    } else {
      const allIds = studentInvoices.map((i) => i.id);
      setSelectedInvoiceIds(allIds);
      const totalDue = studentInvoices.reduce((sum, inv) => sum + parseFloat(inv.remainingAmount), 0);
      setAmountReceived(totalDue.toFixed(2));
    }
  };

  // Preview Allocation
  useEffect(() => {
    if (!selectedStudent || !amountReceived || parseFloat(amountReceived) <= 0) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculatingPreview(true);
      try {
        const res = await apiCall("/api/v1/finance/cash/preview-allocation", "POST", {
          studentId: selectedStudent.id,
          amountReceived: parseFloat(amountReceived),
          selectedInvoiceIds: selectedInvoiceIds.length > 0 ? selectedInvoiceIds : undefined,
          allocationStrategy: "OLDEST_FIRST",
        });
        setPreview(res);
        setErrorMessage(null);
      } catch (err: any) {
        setPreview(null);
        setErrorMessage(err.message || "Invalid allocation preview");
      } finally {
        setIsCalculatingPreview(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedStudent, amountReceived, selectedInvoiceIds]);

  // Submit Payment
  const handleSubmitPayment = async () => {
    if (!selectedStudent || !amountReceived || parseFloat(amountReceived) <= 0) {
      setErrorMessage("Please select a student and enter a valid amount.");
      return;
    }

    if ((paymentMethod === "CHEQUE" || paymentMethod === "DD") && !instrumentNo) {
      setErrorMessage("Please enter cheque / instrument number.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiCall("/api/v1/finance/cash/record-payment", "POST", {
        studentId: selectedStudent.id,
        amountReceived: parseFloat(amountReceived),
        paymentMethod,
        selectedInvoiceIds: selectedInvoiceIds.length > 0 ? selectedInvoiceIds : undefined,
        allocationStrategy: "OLDEST_FIRST",
        instrumentNo: instrumentNo || undefined,
        instrumentDate: instrumentDate || undefined,
        issuingBank: issuingBank || undefined,
        pendingClearance,
        remarks: remarks || undefined,
      });

      const receiptId = res.receipt.id;
      setCompletedReceiptId(receiptId);

      // Fetch HTML for print preview
      setIsLoadingReceiptHtml(true);
      const htmlRes = await fetch(`/api/v1/finance/cash/receipts/${receiptId}/html`, {
        credentials: "include",
      });
      const htmlText = await htmlRes.text();
      setReceiptHtml(htmlText);
      setIsLoadingReceiptHtml(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Form for next collection
  const handleResetForm = () => {
    setSelectedStudent(null);
    setStudentInvoices([]);
    setSelectedInvoiceIds([]);
    setAmountReceived("");
    setInstrumentNo("");
    setInstrumentDate("");
    setIssuingBank("");
    setRemarks("");
    setPreview(null);
    setCompletedReceiptId(null);
    setReceiptHtml(null);
    setSearchQuery("");
  };

  // Print Receipt in iframe or new window
  const handlePrintReceipt = () => {
    if (!receiptHtml) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  // Load Daily Register
  const loadDailyRegister = async (dateStr: string) => {
    setIsLoadingRegister(true);
    try {
      const res = await apiCall(`/api/v1/finance/cash/daily-register?date=${dateStr}`, "GET");
      setDailyRegister(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingRegister(false);
    }
  };

  useEffect(() => {
    if (activeTab === "REGISTER") {
      loadDailyRegister(registerDate);
    }
  }, [activeTab, registerDate]);

  // Reprint from Register
  const handleReprintFromRegister = async (receiptId: string) => {
    try {
      await apiCall(`/api/v1/finance/cash/receipts/${receiptId}/reprint`, "POST");
      const htmlRes = await fetch(`/api/v1/finance/cash/receipts/${receiptId}/html`, {
        credentials: "include",
      });
      const htmlText = await htmlRes.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlText);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      }
      loadDailyRegister(registerDate);
    } catch (err: any) {
      alert(err.message || "Failed to reprint receipt");
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10">
          <Banknote className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider border border-blue-400/30">
                Finance Admin &bull; Cash Desk
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Banknote className="w-10 h-10 text-emerald-400" />
              Fee Collection & Offline Payments
            </h1>
            <p className="text-slate-300 text-base">
              Authorized walk-in cash and offline fee collection. Instant double-entry ledger posting, multi-invoice deterministic allocation, and official stamped PDF receipts.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("COLLECTION")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "COLLECTION"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Receipt className="w-4 h-4" />
              Record Payment
            </button>
            <button
              onClick={() => setActiveTab("REGISTER")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "REGISTER"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              Daily Cash Register
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "COLLECTION" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Student Search & Invoices (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Student Search Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Search className="w-5 h-5 text-blue-600" />
                  Search Student
                </h2>
                {selectedStudent && (
                  <button
                    onClick={handleResetForm}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Search
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Admission No, Student Name, Roll No or Parent Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-4 top-4" />
                )}
              </div>

              {/* Search Results Dropdown/List */}
              {searchResults.length > 0 && !selectedStudent && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto bg-slate-50/50 dark:bg-slate-900">
                  {searchResults.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className="p-3.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{s.name}</span>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-mono">
                            {s.admissionNo}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span>Class: {s.className || "N/A"}{s.sectionName ? ` - ${s.sectionName}` : ""}</span>
                          {s.guardianName && <span>Parent: {s.guardianName}</span>}
                          {s.guardianPhone && <span>Phone: {s.guardianPhone}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          Due: &#8377;{s.totalOutstanding}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s.outstandingInvoiceCount} Invoices
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Student Card */}
              {selectedStudent && (
                <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 dark:text-slate-100">
                        {selectedStudent.name}
                      </span>
                      <span className="text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-mono font-bold">
                        {selectedStudent.admissionNo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>Class:</strong> {selectedStudent.className || "N/A"} {selectedStudent.sectionName ? `(${selectedStudent.sectionName})` : ""}</span>
                      <span><strong>Roll:</strong> {selectedStudent.rollNo || "N/A"}</span>
                      {selectedStudent.guardianName && <span><strong>Guardian:</strong> {selectedStudent.guardianName}</span>}
                    </div>
                  </div>
                  <div className="text-left md:text-right border-t md:border-t-0 pt-2 md:pt-0 border-blue-200 dark:border-blue-900">
                    <div className="text-xs text-slate-500">Total Outstanding</div>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                      &#8377;{selectedStudent.totalOutstanding}
                    </div>
                    {parseFloat(selectedStudent.totalAdvanceCredit) > 0 && (
                      <div className="text-xs text-emerald-600 font-semibold">
                        Advance Credit: &#8377;{selectedStudent.totalAdvanceCredit}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Invoices List */}
            {selectedStudent && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Outstanding Invoices ({studentInvoices.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select invoices to allocate payment against (ordered oldest due date first).
                    </p>
                  </div>
                  <button
                    onClick={handleToggleAllInvoices}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {selectedInvoiceIds.length === studentInvoices.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {isLoadingInvoices ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : studentInvoices.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No outstanding invoices found for this student.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {studentInvoices.map((inv) => {
                      const isSelected = selectedInvoiceIds.includes(inv.id);
                      return (
                        <div
                          key={inv.id}
                          onClick={() => handleToggleInvoice(inv.id)}
                          className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50/50 dark:bg-blue-950/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // controlled by parent div onClick
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {inv.description}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span>Due: {new Date(inv.dueDate).toISOString().split("T")[0]}</span>
                                {inv.isOverdue && (
                                  <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold px-1.5 py-0.2 rounded">
                                    OVERDUE
                                  </span>
                                )}
                                <span>Status: {inv.status}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              &#8377;{inv.remainingAmount}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Total: &#8377;{inv.amount} {parseFloat(inv.fineAmount) > 0 ? `+ Fine &#8377;${inv.fineAmount}` : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Payment Form & Realtime Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Collection Details
              </h2>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "CHEQUE", "COUNTER_UPI", "DD", "BANK_TRANSFER"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMethod(mode)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                        paymentMethod === mode
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-blue-600 dark:border-blue-600 shadow-md"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {mode.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Amount Received (&#8377;) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-lg font-bold text-slate-400">&#8377;</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Mode-Specific Fields */}
              {(paymentMethod === "CHEQUE" || paymentMethod === "DD") && (
                <div className="space-y-3 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    {paymentMethod === "CHEQUE" ? "Cheque Information" : "Demand Draft Information"}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Cheque / DD No *"
                      value={instrumentNo}
                      onChange={(e) => setInstrumentNo(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                    <input
                      type="date"
                      value={instrumentDate}
                      onChange={(e) => setInstrumentDate(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Issuing Bank Name (e.g. State Bank of India)"
                    value={issuingBank}
                    onChange={(e) => setIssuingBank(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={pendingClearance}
                      onChange={(e) => setPendingClearance(e.target.checked)}
                      className="w-3.5 h-3.5 text-amber-600 rounded"
                    />
                    Mark as Pending Clearance (Until Cheque Clears)
                  </label>
                </div>
              )}

              {(paymentMethod === "COUNTER_UPI" || paymentMethod === "BANK_TRANSFER") && (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Transaction Ref / UTR / UPI Ref ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-9876543210 or NEFT/RTGS UTR"
                    value={instrumentNo}
                    onChange={(e) => setInstrumentNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Remarks / Cashier Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash by father at admin counter"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              {/* Real-time Allocation Summary Box */}
              {isCalculatingPreview ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  Calculating allocation breakdown...
                </div>
              ) : preview ? (
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Allocation Breakdown</span>
                    <span className="text-emerald-600 font-bold">{preview.allocations.length} Invoices</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Total Amount Received:</span>
                      <strong className="text-slate-900 dark:text-slate-100">&#8377;{preview.totalReceived}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Fee Invoices Settled:</span>
                      <strong className="text-slate-900 dark:text-slate-100">&#8377;{preview.totalAllocated}</strong>
                    </div>
                    {parseFloat(preview.advanceCreditAmount) > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg">
                        <span>Advance Fee Credit Created:</span>
                        <span>&#8377;{preview.advanceCreditAmount}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-200/50 dark:border-blue-900/50">
                    <strong>Words:</strong> {preview.amountInWords}
                  </div>
                </div>
              ) : null}

              {/* Submit Payment Button */}
              <button
                type="button"
                onClick={handleSubmitPayment}
                disabled={isSubmitting || !selectedStudent || !amountReceived || parseFloat(amountReceived) <= 0}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Recording Transaction & Ledger...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Confirm & Print Official Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Daily Cash Register Tab */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Daily Cash Register & Shift Reconciliation
              </h2>
              <p className="text-xs text-slate-500">
                Audited list of cash and offline collections for cashier shift handover.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Select Date:</label>
              <input
                type="date"
                value={registerDate}
                onChange={(e) => setRegisterDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          {isLoadingRegister ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : !dailyRegister ? (
            <div className="text-center py-12 text-slate-400">No register data loaded.</div>
          ) : (
            <div className="space-y-6">
              {/* Register KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 font-medium">Total Collections</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    &#8377;{dailyRegister.totalCollected}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{dailyRegister.receiptCount} Receipts Issued</div>
                </div>

                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Cash in Hand</div>
                  <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
                    &#8377;{dailyRegister.byPaymentMethod?.CASH || "0.00"}
                  </div>
                  <div className="text-[11px] text-emerald-600/70 mt-1">Physical Currency</div>
                </div>

                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Cheques / DD</div>
                  <div className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-1">
                    &#8377;{(
                      parseFloat(dailyRegister.byPaymentMethod?.CHEQUE || "0") +
                      parseFloat(dailyRegister.byPaymentMethod?.DD || "0")
                    ).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-amber-600/70 mt-1">Awaiting / Under Clearing</div>
                </div>

                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/50">
                  <div className="text-xs text-blue-700 dark:text-blue-400 font-medium">Counter UPI & NEFT</div>
                  <div className="text-2xl font-black text-blue-800 dark:text-blue-200 mt-1">
                    &#8377;{(
                      parseFloat(dailyRegister.byPaymentMethod?.COUNTER_UPI || "0") +
                      parseFloat(dailyRegister.byPaymentMethod?.BANK_TRANSFER || "0")
                    ).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-blue-600/70 mt-1">Bank Credited</div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Cashier</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dailyRegister.receipts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          No receipts recorded on this date.
                        </td>
                      </tr>
                    ) : (
                      dailyRegister.receipts.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {r.receiptNo}
                            {r.reprintCount > 0 && (
                              <span className="ml-1.5 text-[10px] text-rose-500 font-bold bg-rose-50 px-1 py-0.5 rounded">
                                (R: {r.reprintCount})
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{r.studentName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{r.admissionNo}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-semibold text-[11px]">
                              {r.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{r.cashierName}</td>
                          <td className="p-3 text-slate-500">{new Date(r.paidAt).toLocaleTimeString()}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-slate-100">
                            &#8377;{r.totalAmount}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleReprintFromRegister(r.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Printer className="w-3 h-3" />
                              Reprint
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Receipt Confirmation Modal */}
      {completedReceiptId && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Payment Successfully Recorded</h3>
                  <p className="text-xs text-slate-400">Official receipt generated with QR verification.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  Print Official Receipt
                </button>
                <button
                  onClick={handleResetForm}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Close & New Payment
                </button>
              </div>
            </div>

            {/* Receipt Preview Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950">
              {isLoadingReceiptHtml ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : receiptHtml ? (
                <div
                  className="bg-white text-slate-900 p-8 shadow-md rounded-xl max-w-3xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: receiptHtml }}
                />
              ) : (
                <div className="text-center py-8 text-slate-400">Failed to render receipt preview.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
