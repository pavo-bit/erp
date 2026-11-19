"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export function LoadingState({
  message = "Loading records from database...",
}: {
  message?: string;
}) {
  return (
    <div className="py-16 text-center">
      <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-[14px] text-slate-500 font-medium">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = "Error Loading Data",
  error,
  onRetry,
}: {
  title?: string;
  error?: Error | string | null;
  onRetry?: () => void;
}) {
  const message = error instanceof Error ? error.message : error || "Failed to load information.";

  return (
    <div className="p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200 my-4 max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-[16px] font-bold text-rose-900 font-[var(--font-heading)]">
        {title}
      </h3>
      <p className="text-[13px] text-rose-700 mt-1 max-w-md mx-auto">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-rose-800 bg-white border border-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
