"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiCall } from "@/lib/api-hooks";
import { StatusBadge } from "./DashboardLayout";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"students" | "teachers">("students");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await apiCall(`/api/${filter}?search=${encodeURIComponent(query)}`);
        setResults(res.data || []);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    
    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [query, filter]);

  return (
    <>
      {/* Floating Search Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center text-2xl border-none cursor-pointer hover:scale-105 transition-transform z-40"
        title="Global Search (Ctrl+K)"
      >
        🔍
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[100] flex items-start justify-center pt-[10vh] px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center px-4 py-3 border-b border-border">
                <span className="text-xl mr-3">🔍</span>
                <input 
                  type="text" 
                  autoFocus 
                  placeholder="Search students, teachers... (Ctrl+K)" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 text-[16px] outline-none border-none bg-transparent font-[var(--font-heading)]"
                />
                <button onClick={() => setIsOpen(false)} className="text-sm font-semibold text-text-secondary bg-surface px-2 py-1 rounded border-none cursor-pointer">ESC</button>
              </div>

              <div className="flex gap-4 px-4 py-2 bg-surface border-b border-border">
                <button onClick={() => setFilter("students")} className={`text-[12px] font-semibold border-none cursor-pointer transition-colors ${filter === "students" ? "text-primary bg-primary/10 px-3 py-1 rounded-md" : "text-text-secondary bg-transparent px-3 py-1"}`}>Students</button>
                <button onClick={() => setFilter("teachers")} className={`text-[12px] font-semibold border-none cursor-pointer transition-colors ${filter === "teachers" ? "text-primary bg-primary/10 px-3 py-1 rounded-md" : "text-text-secondary bg-transparent px-3 py-1"}`}>Teachers</button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {loading ? (
                  <div className="py-8 text-center text-[13px] text-text-secondary">Searching...</div>
                ) : results.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {results.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-border">
                        <div>
                          <div className="text-[14px] font-semibold text-text-primary font-[var(--font-heading)]">
                            {filter === "students" ? item.name : (item.user?.name || "Teacher")}
                          </div>
                          <div className="text-[12px] text-text-secondary">
                            {filter === "students" 
                              ? `Class ${item.class}-${item.section} · Roll: ${item.rollNo}`
                              : `Dept: ${item.department || "N/A"} · ${item.designation || ""}`
                            }
                          </div>
                        </div>
                        <StatusBadge status={item.isActive ? "Active" : "Inactive"} color={item.isActive ? "#10B981" : "#EF4444"} />
                      </div>
                    ))}
                  </div>
                ) : query.trim().length >= 2 ? (
                  <div className="py-8 text-center text-[13px] text-text-secondary">No results found for "{query}"</div>
                ) : (
                  <div className="py-8 text-center text-[13px] text-text-secondary">Type at least 2 characters to search</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
