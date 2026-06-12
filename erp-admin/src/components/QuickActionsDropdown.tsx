"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Action {
  icon: string;
  label: string;
  id: string;
  color: string;
}

interface QuickActionsDropdownProps {
  actions: Action[];
  onAction: (id: string) => void;
}

export function QuickActionsDropdown({ actions, onAction }: QuickActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white border-none cursor-pointer
          transition-transform duration-200 hover:scale-105 font-[var(--font-heading)]"
        style={{ background: "#4B5563" }} // Neutral gray for "More"
      >
        <span className="mt-0.5">➕</span> More {isOpen ? "▲" : "▼"}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50 flex flex-col p-1.5"
          >
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  setIsOpen(false);
                  onAction(action.id);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-colors border-none bg-transparent cursor-pointer font-[var(--font-heading)] text-left"
              >
                <div 
                  className="flex items-center justify-center w-6 h-6 rounded-md text-[14px]"
                  style={{ background: `${action.color}15`, color: action.color }}
                >
                  {action.icon}
                </div>
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
