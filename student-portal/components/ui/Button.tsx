"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      children,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    // 42-46px desktop height for medium buttons as strictly mandated by Phase 1 spec
    const sizeClasses = {
      sm: "h-[36px] px-3 text-[13px]",
      md: "h-[44px] px-5 text-[14px]",
      lg: "h-[48px] px-6 text-[15px]",
    };

    const variantClasses = {
      primary:
        "bg-blue-700 text-white hover:bg-blue-800 shadow-xs focus:ring-2 focus:ring-blue-600 focus:ring-offset-2",
      secondary:
        "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 focus:ring-2 focus:ring-slate-400",
      destructive:
        "bg-rose-600 text-white hover:bg-rose-700 shadow-xs focus:ring-2 focus:ring-rose-500 focus:ring-offset-2",
      outline:
        "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-slate-400",
      ghost:
        "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed font-[var(--font-heading)] ${
          sizeClasses[size]
        } ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
