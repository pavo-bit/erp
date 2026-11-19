"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 className="text-[26px] font-bold text-slate-900 font-[var(--font-heading)]">
          {title}
        </h1>
        {subtitle && <p className="text-[14px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status, color }: { status: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full font-[var(--font-heading)]"
      style={{ background: `${color}15`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}

export interface PaginationProps {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
}

export function Pagination({
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  return (
    <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-600 bg-slate-50/50">
      <div>
        Showing{" "}
        <span className="font-semibold text-slate-900">
          {total === 0 ? 0 : (page - 1) * limit + 1}
        </span>{" "}
        to <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> of{" "}
        <span className="font-semibold text-slate-900">{total}</span> records
      </div>

      <div className="flex items-center gap-3">
        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[12px] outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium">
            Page {page} of {totalPages || 1}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-[0.05em] font-[var(--font-heading)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors h-[56px]">
                {row.map((cell, j) => (
                  <td key={j} className="px-5 py-3 text-[13px] text-slate-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
