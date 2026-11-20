"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, Sliders, AlertCircle, Info, Lock } from "lucide-react";

export default function GlobalSettingsPage() {
  const [activeTab, setActiveTab] = useState("branding");

  const brandingForm = {
    themeMode: "DARK_PREMIUM",
    primaryColor: "#a855f7",
    logoUrl: "https://greyscales.io/logo.png",
  };

  const featuresForm = {
    enableAIInsights: true,
    enableCryptoPayments: false,
    enforceMFA: true,
    betaTransportV2: false,
  };

  return (
    <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Core Active
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight"
          >
            System Core Configuration
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[15px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl"
          >
            Global cluster configuration, fallback white-labeling, and core feature entitlements across all tenant schools.
          </motion.p>
        </div>
      </div>

      {/* Contract Pending Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-200">Cluster Settings — Backend Contract Ingest In-Progress (Part 2)</p>
          <p className="text-xs text-amber-400/80 mt-1">
            Dynamic cluster configuration persistence (`PATCH /api/v1/platform/settings`) is scheduled for backend ingestion. Values shown below reflect the active platform cluster defaults and are currently in read-only mode to prevent uncommitted configuration drift.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-dark)] overflow-x-auto pb-px">
        {["branding", "features", "security"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`relative px-6 py-3 text-[14px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap border-none bg-transparent cursor-pointer
              ${activeTab === tab ? "text-emerald-400" : "text-[var(--color-text-secondary)] hover:text-white"}`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399]"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content: Branding */}
      {activeTab === "branding" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <div
            className="rounded-[1.5rem] p-8 relative overflow-hidden"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border-dark)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-[20px] font-black text-white font-[var(--font-heading)] mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" /> Platform White-Labeling (Read-Only)
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                    Default Platform Theme
                  </label>
                  <input
                    disabled
                    value={brandingForm.themeMode}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] text-slate-400 text-sm font-semibold opacity-75 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg border border-white/20" style={{ background: brandingForm.primaryColor }} />
                    <input
                      disabled
                      value={brandingForm.primaryColor}
                      className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] text-slate-400 text-sm font-mono opacity-75 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                    Platform Logo URL
                  </label>
                  <input
                    disabled
                    value={brandingForm.logoUrl}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] text-slate-400 text-sm font-mono opacity-75 cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Modifications restricted until backend platform settings router is deployed.</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-[1.5rem] p-8 flex flex-col justify-between relative overflow-hidden"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border-dark)",
            }}
          >
            <div>
              <h4 className="text-[14px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                Live Preview
              </h4>
              <p className="text-[12px] text-[var(--color-text-secondary)]">
                Active tenant login portal visual representation.
              </p>
            </div>

            <div
              className="mt-6 rounded-2xl p-6 border border-white/10 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]"
              style={{
                background: "radial-gradient(ellipse at top, #1e1b4b, #09090b)",
              }}
            >
              <div className="w-14 h-14 rounded-2xl mb-3 shadow-lg flex items-center justify-center text-xl bg-[var(--color-bg-card)] border border-white/10">
                🏫
              </div>
              <div className="text-base font-black tracking-widest uppercase font-[var(--font-heading)] text-white">
                SSVM ERP Platform
              </div>
              <div
                className="mt-6 px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg"
                style={{ background: brandingForm.primaryColor }}
              >
                Sign In
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab Content: Feature Flags */}
      {activeTab === "features" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <div
            className="rounded-[1.5rem] p-8 relative overflow-hidden"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border-dark)",
            }}
          >
            <h3 className="text-[20px] font-black text-white font-[var(--font-heading)] mb-6 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-400" /> Global Feature Flags (Cluster Invariants)
            </h3>
            <div className="space-y-4">
              {Object.entries(featuresForm).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]"
                >
                  <div>
                    <div className="text-[14px] font-bold text-white">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                      Platform-wide feature activation state.
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      value
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    {value ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-6 pt-4 border-t border-[var(--color-border-dark)]">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Feature flag mutations require environment restart and backend cluster controller integration.</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab Content: Security */}
      {activeTab === "security" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <div
            className="rounded-[1.5rem] p-8 relative overflow-hidden"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border-dark)",
            }}
          >
            <h3 className="text-[20px] font-black text-white font-[var(--font-heading)] mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> Platform Security & RLS Invariants
            </h3>
            <div className="space-y-4 text-sm text-slate-300">
              <div className="p-4 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                <p className="font-bold text-white">PostgreSQL Multi-Tenancy RLS</p>
                <p className="text-xs text-slate-400 mt-1">Enforced at kernel database level (`app.current_school_id`). Non-bypassable by application runtime role `ssvm_app`.</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                <p className="font-bold text-white">Audience Segregated Cookies</p>
                <p className="text-xs text-slate-400 mt-1">Platform tokens (`platform_access_token`) and School tokens (`school_access_token`) are mutually exclusive. Cross-portal elevation returns 403 WRONG_PORTAL.</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                <p className="font-bold text-white">Support Session Timed Delegation</p>
                <p className="text-xs text-slate-400 mt-1">Super Admin support sessions require TOTP MFA verification and automatically expire after the granted window.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
