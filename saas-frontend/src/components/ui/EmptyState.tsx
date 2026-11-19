"use client";

import React from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 my-4">
      {icon ? (
        <div className="mb-4 text-slate-400">{icon}</div>
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mb-4">
          📋
        </div>
      )}
      <h3 className="text-[17px] font-bold text-slate-800 font-[var(--font-heading)]">
        {title}
      </h3>
      <p className="text-[14px] text-slate-500 max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 text-[13px] font-semibold text-white hover:bg-blue-800 shadow-xs transition-colors no-underline"
              >
                {primaryAction.icon || <Plus className="w-4 h-4" />}
                <span>{primaryAction.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 text-[13px] font-semibold text-white hover:bg-blue-800 shadow-xs transition-colors cursor-pointer border-none"
              >
                {primaryAction.icon || <Plus className="w-4 h-4" />}
                <span>{primaryAction.label}</span>
              </button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors no-underline"
              >
                {secondaryAction.icon || <Upload className="w-4 h-4" />}
                <span>{secondaryAction.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border-none"
              >
                {secondaryAction.icon || <Upload className="w-4 h-4" />}
                <span>{secondaryAction.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
