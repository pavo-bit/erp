"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiCall } from "@/lib/api-hooks";
import {
  Search,
  Users,
  GraduationCap,
  HeartHandshake,
  Receipt,
  FileText,
  Calendar,
  Bell,
  BookOpen,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";

interface SearchResultItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  badge?: string;
  targetUrl: string;
  icon: React.ReactNode;
}

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Ctrl+K / Cmd+K / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Query universal backend search endpoint
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiCall(`/api/v1/search?q=${encodeURIComponent(query.trim())}`);
        const data = res?.data || res || {};

        const mapped: SearchResultItem[] = [];

        // 1. Students
        if (Array.isArray(data.students)) {
          for (const s of data.students) {
            mapped.push({
              id: `student-${s.id}`,
              category: "Students",
              title: s.name,
              subtitle: `Roll: ${s.rollNo || "N/A"} · Section: ${s.sectionRef?.class?.name || ""} ${s.sectionRef?.name || ""}`,
              badge: "Student",
              targetUrl: `/admin/students/${s.id}`,
              icon: <GraduationCap className="w-4 h-4 text-blue-600" />,
            });
          }
        }

        // 2. Teachers / Faculty
        if (Array.isArray(data.teachers)) {
          for (const t of data.teachers) {
            mapped.push({
              id: `teacher-${t.id}`,
              category: "Teachers",
              title: t.user?.name || "Faculty Member",
              subtitle: `Dept: ${t.department?.name || t.department || "General"} · ${t.user?.email || ""}`,
              badge: "Teacher",
              targetUrl: `/admin/teachers`,
              icon: <Users className="w-4 h-4 text-emerald-600" />,
            });
          }
        }

        // 3. Guardians
        if (Array.isArray(data.guardians)) {
          for (const g of data.guardians) {
            mapped.push({
              id: `guardian-${g.id}`,
              category: "Guardians",
              title: g.primaryName || g.secondaryName || "Parent/Guardian",
              subtitle: `Phone: ${g.primaryPhone || "N/A"} · Students: ${g.students?.map((st: any) => st.name).join(", ") || "None"}`,
              badge: "Guardian",
              targetUrl: `/admin/students/guardians`,
              icon: <HeartHandshake className="w-4 h-4 text-purple-600" />,
            });
          }
        }

        // 4. Invoices
        if (Array.isArray(data.invoices)) {
          for (const inv of data.invoices) {
            mapped.push({
              id: `invoice-${inv.id}`,
              category: "Invoices",
              title: `Receipt #${inv.receiptNo || inv.id}`,
              subtitle: `Student: ${inv.student?.name || "Student"}`,
              badge: "Invoice",
              targetUrl: `/admin/fees/ledger`,
              icon: <Receipt className="w-4 h-4 text-amber-600" />,
            });
          }
        }

        // 5. Admissions
        if (Array.isArray(data.admissions)) {
          for (const a of data.admissions) {
            mapped.push({
              id: `admission-${a.id}`,
              category: "Admissions",
              title: a.applicantName || "Applicant",
              subtitle: `Parent: ${a.parentName || "N/A"} · Status: ${a.status || "PENDING"}`,
              badge: "Admission",
              targetUrl: `/admin/admissions`,
              icon: <FileText className="w-4 h-4 text-cyan-600" />,
            });
          }
        }

        // 6. Notices
        if (Array.isArray(data.notices)) {
          for (const n of data.notices) {
            mapped.push({
              id: `notice-${n.id}`,
              category: "Notices",
              title: n.title,
              subtitle: `Category: ${n.category || "General"}`,
              badge: "Notice",
              targetUrl: `/admin/notices`,
              icon: <Bell className="w-4 h-4 text-rose-600" />,
            });
          }
        }

        // 7. Events
        if (Array.isArray(data.events)) {
          for (const ev of data.events) {
            mapped.push({
              id: `event-${ev.id}`,
              category: "Events",
              title: ev.title,
              subtitle: `Date: ${ev.date ? new Date(ev.date).toLocaleDateString() : "Upcoming"}`,
              badge: "Event",
              targetUrl: `/admin/events`,
              icon: <Calendar className="w-4 h-4 text-teal-600" />,
            });
          }
        }

        // 8. Documents
        if (Array.isArray(data.documents)) {
          for (const doc of data.documents) {
            mapped.push({
              id: `doc-${doc.id}`,
              category: "Documents",
              title: doc.name,
              subtitle: `Category: ${doc.category || "General"}`,
              badge: "Document",
              targetUrl: `/admin/documents`,
              icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
            });
          }
        }

        setResults(mapped);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter results by active category tab
  const filteredResults =
    activeCategory === "ALL"
      ? results
      : results.filter((r) => r.category.toUpperCase() === activeCategory.toUpperCase());

  // Navigate to target
  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    router.push(item.targetUrl);
  };

  // Keyboard navigation inside list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredResults[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(filteredResults[selectedIndex]);
    }
  };

  const categories = [
    { label: "All", value: "ALL" },
    { label: "Students", value: "STUDENTS" },
    { label: "Teachers", value: "TEACHERS" },
    { label: "Guardians", value: "GUARDIANS" },
    { label: "Invoices", value: "INVOICES" },
    { label: "Admissions", value: "ADMISSIONS" },
    { label: "Notices", value: "NOTICES" },
  ];

  return (
    <>
      {/* Floating Shortcut Pill in bottom-right */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-white text-text-primary px-3.5 py-2 rounded-full shadow-lg border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-200 flex items-center gap-2 cursor-pointer group"
        title="Quick Search (Ctrl + K)"
        aria-label="Open Global Search (Ctrl + K)"
      >
        <Search className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold">Search ERP</span>
        <kbd className="text-[10px] bg-surface text-text-secondary px-1.5 py-0.5 rounded border border-border font-mono">
          Ctrl K
        </kbd>
      </button>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Universal Global Search"
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-border overflow-hidden relative z-10 flex flex-col max-h-[75vh]"
            >
              {/* Search Header Bar */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-surface/30">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search students, teachers, guardians, invoices, admissions, notices..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary font-medium"
                />
                {loading && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-text-secondary hover:text-text-primary rounded-md bg-transparent border-none cursor-pointer"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="px-4 py-2 bg-surface/50 border-b border-border flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setActiveCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors border-none cursor-pointer ${
                      activeCategory === cat.value
                        ? "bg-primary text-white shadow-xs"
                        : "bg-white text-text-secondary hover:text-text-primary border border-border"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Results Container */}
              <div className="flex-1 overflow-y-auto p-2">
                {query.trim().length < 2 ? (
                  <div className="py-12 text-center text-xs text-text-secondary">
                    Type at least 2 characters to search across school records.
                  </div>
                ) : loading && results.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-text-secondary">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>Searching database...</span>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-secondary">
                    No matching records found for "{query}".
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {filteredResults.map((item, index) => {
                      const isSelected = index === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-primary/5 border-primary/30 text-text-primary shadow-xs"
                              : "bg-white border-transparent hover:bg-surface text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-text-primary truncate font-[var(--font-heading)]">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-text-secondary truncate">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.badge && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface text-text-secondary border border-border">
                                {item.badge}
                              </span>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-text-secondary" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Keyboard Hints */}
              <div className="px-4 py-2 border-t border-border bg-surface/40 flex items-center justify-between text-[10px] text-text-secondary shrink-0">
                <div className="flex items-center gap-3">
                  <span>
                    <kbd className="px-1 py-0.5 bg-white border border-border rounded font-mono">↑</kbd>{" "}
                    <kbd className="px-1 py-0.5 bg-white border border-border rounded font-mono">↓</kbd> to
                    navigate
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 bg-white border border-border rounded font-mono">↵</kbd> to
                    select
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 bg-white border border-border rounded font-mono">Esc</kbd> to
                    close
                  </span>
                </div>
                <span>{filteredResults.length} records</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
