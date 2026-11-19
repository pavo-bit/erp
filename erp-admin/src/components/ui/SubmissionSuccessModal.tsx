"use client";

import React from "react";
import { CheckCircle2, UserPlus, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  recordIdentifier?: string;
  entityName?: string;
  onAddAnother: () => void;
  onDone: () => void;
}

export function SubmissionSuccessModal({
  isOpen,
  title,
  message,
  recordIdentifier,
  entityName = "Record",
  onAddAnother,
  onDone,
}: SubmissionSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
        {/* Dim Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200"
          >
            <div className="bg-white p-6 sm:p-8">
              <div className="flex flex-col items-center text-center">
                {/* Institutional Success Badge */}
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 ring-8 ring-emerald-50">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <h3 id="success-modal-title" className="text-[20px] font-bold text-slate-900 font-[var(--font-heading)]">
                  {title}
                </h3>

                {recordIdentifier && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                    ID / Admission: <span className="ml-1 text-blue-700 font-mono font-bold">{recordIdentifier}</span>
                  </div>
                )}

                <p className="text-[14px] text-slate-600 mt-3 leading-relaxed">
                  {message || `The ${entityName.toLowerCase()} has been verified and permanently committed to the school register.`}
                </p>
              </div>

              {/* Two Clear Institutional Actions */}
              <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={onDone}
                  className="w-full sm:w-1/2 inline-flex justify-center items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-[14px] font-semibold text-white shadow-xs hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all cursor-pointer border-none"
                >
                  <span>Done</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onAddAnother}
                  className="w-full sm:w-1/2 inline-flex justify-center items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-[14px] font-semibold text-slate-800 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all cursor-pointer border-none"
                >
                  <UserPlus className="w-4 h-4 text-slate-600" />
                  <span>Add Another</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
