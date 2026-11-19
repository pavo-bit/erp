"use client";

import React from "react";
import { Search } from "lucide-react";

export interface FormFieldProps {
  label: string;
  name?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  name,
  required,
  error,
  hint,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={name}
          className="block text-[13px] font-semibold text-slate-700 font-[var(--font-heading)]"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-[12px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          hasError
            ? "border-rose-400 bg-rose-50/20 text-rose-900"
            : "border-slate-300 hover:border-slate-400"
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
          hasError
            ? "border-rose-400 bg-rose-50/20 text-rose-900"
            : "border-slate-300 hover:border-slate-400"
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-[14px] bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
          hasError
            ? "border-rose-400 bg-rose-50/20 text-rose-900"
            : "border-slate-300 hover:border-slate-400"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface SearchFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className = "", placeholder = "Search...", ...props }, ref) => {
    return (
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-[14px] text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          {...props}
        />
      </div>
    );
  }
);
SearchField.displayName = "SearchField";
