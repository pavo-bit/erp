"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  isDirty?: boolean;
  onConfirmClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl" | "2xl";
}

export function SlideOverDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  isDirty = false,
  onConfirmClose,
  children,
  footer,
  width = "xl",
}: SlideOverDrawerProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDirty && onConfirmClose) {
          onConfirmClose();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDirty, onClose, onConfirmClose]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const widthClasses = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  const handleBackdropOrClose = () => {
    if (isDirty && onConfirmClose) {
      onConfirmClose();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="drawer-title" role="dialog" aria-modal="true">
          {/* Subtle Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropOrClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`w-screen ${widthClasses[width]} flex flex-col bg-white shadow-2xl border-l border-slate-200`}
            >
              {/* Sticky Header */}
              <div className="px-6 py-5 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-between shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <h2 id="drawer-title" className="text-[20px] font-bold text-slate-900 tracking-tight font-[var(--font-heading)] truncate">
                      {title}
                    </h2>
                    {badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        {badge}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-[13px] text-slate-500 mt-0.5 truncate font-[var(--font-heading)]">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleBackdropOrClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer border-none bg-transparent"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/50">
                {children}
              </div>

              {/* Sticky Footer Actions */}
              {footer && (
                <div className="px-6 py-4 border-t border-slate-200 bg-white sticky bottom-0 z-10 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
