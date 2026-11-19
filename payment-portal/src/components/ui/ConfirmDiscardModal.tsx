"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDiscardModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function ConfirmDiscardModal({
  isOpen,
  title = "Discard Unsaved Changes?",
  message = "You have unsaved changes in this form. If you close now, any information you entered will be lost.",
  onKeepEditing,
  onDiscard,
}: ConfirmDiscardModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] overflow-y-auto" role="dialog" aria-modal="true">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200"
          >
            <div className="flex items-start gap-4">
              <div className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-bold text-slate-900 font-[var(--font-heading)]">
                  {title}
                </h3>
                <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row-reverse gap-2.5">
              <button
                type="button"
                onClick={onDiscard}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-rose-600 text-[13px] font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer border-none"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={onKeepEditing}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer border-none"
              >
                Keep Editing
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
