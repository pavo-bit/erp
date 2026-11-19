"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Activity,
  Layers,
  Shield,
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  KeyRound,
  XCircle,
  ExternalLink,
} from "lucide-react";
import {
  useSchoolHealthUsage,
  useSchoolModules,
  useActiveSupportSession,
  apiCall,
  invalidate,
} from "@/lib/api";

interface ModuleEntry {
  module: {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    defaultEnabled: boolean;
    isCore: boolean;
  };
  isEnabled: boolean;
  source: "CORE" | "OVERRIDE" | "DEFAULT";
}

export default function SchoolDetailPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;

  // SWR hooks
  const {
    data: healthData,
    isLoading: isHealthLoading,
    error: healthError,
    mutate: mutateHealth,
  } = useSchoolHealthUsage(schoolId);

  const {
    data: modulesData,
    isLoading: isModulesLoading,
    error: modulesError,
    mutate: mutateModules,
  } = useSchoolModules(schoolId);

  const {
    data: sessionData,
    isLoading: isSessionLoading,
    mutate: mutateSession,
  } = useActiveSupportSession(schoolId);

  // Support Session State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [mfaToken, setMfaToken] = useState("");
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Module Toggle State
  const [togglingModuleCode, setTogglingModuleCode] = useState<string | null>(null);
  const [moduleActionFeedback, setModuleActionFeedback] = useState<string | null>(null);

  const health = healthData || {};
  const modules: ModuleEntry[] = modulesData?.modules || [];
  const activeSession = sessionData || null;

  // Handle Module Toggle
  const handleToggleModule = async (mod: ModuleEntry) => {
    if (mod.module.isCore) return;
    setTogglingModuleCode(mod.module.code);
    setModuleActionFeedback(null);

    const targetState = !mod.isEnabled;
    try {
      await apiCall(`/api/v1/schools/${schoolId}/modules/${mod.module.code}`, "PATCH", {
        enabled: targetState,
      });
      invalidate(`/api/v1/schools/${schoolId}/modules`);
      invalidate(`/api/v1/platform/schools/${schoolId}/health-usage`);
      setModuleActionFeedback(`Module ${mod.module.name} successfully ${targetState ? "enabled" : "disabled"}.`);
    } catch (err: any) {
      setModuleActionFeedback(err.message || "Failed to update module state.");
    } finally {
      setTogglingModuleCode(null);
    }
  };

  // Handle Start Support Session
  const handleStartSupportSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 10) {
      setSessionError("Please provide a valid reason (minimum 10 characters).");
      return;
    }
    if (!mfaToken || !/^\d{6}$/.test(mfaToken.trim())) {
      setSessionError("Please enter a valid 6-digit MFA security verification code.");
      return;
    }

    setIsSubmittingSession(true);
    setSessionError(null);

    try {
      await apiCall("/api/v1/platform/support-sessions/request", "POST", {
        schoolId,
        reason: reason.trim(),
        durationMinutes: Number(durationMinutes),
        mfaToken: mfaToken.trim(),
      });

      setIsModalOpen(false);
      setReason("");
      setMfaToken("");
      mutateSession();
    } catch (err: any) {
      setSessionError(err.message || "Failed to initiate platform support session.");
    } finally {
      setIsSubmittingSession(false);
    }
  };

  // Handle Revoke Support Session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await apiCall(`/api/v1/platform/support-sessions/${sessionId}/revoke`, "POST");
      mutateSession();
    } catch (err: any) {
      toast(err.message || "Failed to revoke support session");
    }
  };

  if (isHealthLoading) {
    return (
      <div className="max-w-[1600px] mx-auto py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-sm">Loading tenant health and operational status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-8 pt-2">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/schools"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to School Network
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/schools/${schoolId}/shifts`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <Clock className="w-3.5 h-3.5" /> Shift Configuration
          </Link>
          <button
            onClick={() => {
              mutateHealth();
              mutateModules();
              mutateSession();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Institutional Banner & Health Header */}
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              🏫
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white font-[var(--font-heading)]">
                  {health.schoolName || "School Details"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300">
                  {health.schoolCode || "CODE"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {health.status || "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium font-[var(--font-heading)]">
                Tenant ID: <span className="font-mono text-slate-300">{schoolId}</span> • Subscription Tier:{" "}
                <span className="text-purple-400 font-bold">{health.plan || "STANDARD"}</span>
              </p>
            </div>
          </div>

          {/* Support Session CTA / Active Session Pill */}
          <div>
            {activeSession ? (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> SUPPORT SESSION ACTIVE
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Expires: {new Date(activeSession.expiresAt).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSession(activeSession.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-sm ml-2 cursor-pointer"
                >
                  Revoke Access
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setSessionError(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" /> Start Support Session
              </button>
            )}
          </div>
        </div>

        {/* Health & Usage Stat Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Institutional Users
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {health.activeUsers ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Aggregated user accounts</div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Last Administrative Login
            </div>
            <div className="text-sm font-bold text-slate-200 mt-2 font-mono">
              {health.lastLogin ? new Date(health.lastLogin).toLocaleString() : "Never / Inactive"}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Audit timestamp</div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Enabled Modules
            </div>
            <div className="text-2xl font-black text-indigo-400 mt-1">
              {health.modules?.length ?? modules.filter((m) => m.isEnabled).length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active capabilities</div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Database Isolation (RLS)
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Fail-Closed Tenant RLS
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">schema app.current_school_id</div>
          </div>
        </div>
      </div>

      {/* Module Entitlement Management with Plan State */}
      <div className="bg-slate-900/60 rounded-3xl border border-slate-800 shadow-2xl p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-white font-[var(--font-heading)] flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Module Entitlements & Plan State
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Core modules are permanently locked; optional modules can be toggled per subscription agreement.
            </p>
          </div>

          {moduleActionFeedback && (
            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              {moduleActionFeedback}
            </div>
          )}
        </div>

        {isModulesLoading ? (
          <div className="py-12 text-center text-slate-500">Loading module configuration...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => {
              const isToggling = togglingModuleCode === mod.module.code;
              return (
                <div
                  key={mod.module.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    mod.isEnabled
                      ? "bg-slate-900 border-slate-700 shadow-md"
                      : "bg-slate-950/60 border-slate-800/80 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white font-[var(--font-heading)]">
                        {mod.module.name}
                      </h4>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {mod.module.code}
                      </span>
                    </div>

                    {/* Module Toggle Switch */}
                    {mod.module.isCore ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        CORE LOCKED
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleModule(mod)}
                        disabled={isToggling}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                          mod.isEnabled ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            mod.isEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {mod.module.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-medium pt-3 border-t border-slate-800">
                    <span className="text-slate-500 uppercase">{mod.module.category}</span>
                    <span
                      className={`font-semibold ${
                        mod.isEnabled ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {mod.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start Support Session Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-[var(--font-heading)]">
                      Start Audited Support Session
                    </h3>
                    <p className="text-xs text-slate-400">
                      Step-Up MFA required • Immutable audit log will be created
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {sessionError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {sessionError}
                </div>
              )}

              <form onSubmit={handleStartSupportSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Justification / Reason (Audited)
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide specific administrative reason for emergency tenant access (min 10 characters)..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Session Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={15}>15 Minutes (Recommended)</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes (1 Hour)</option>
                    <option value={120}>120 Minutes (2 Hours - Maximum)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Step-Up MFA Security Code (6 Digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    placeholder="000000"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-center tracking-[0.5em] font-mono text-base text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the 6-digit TOTP code from your authenticator app
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSession}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingSession ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Authorize & Mint Support Token"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
