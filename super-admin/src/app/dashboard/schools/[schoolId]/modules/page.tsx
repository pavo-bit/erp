"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Layers,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  Info,
} from "lucide-react";
import { useSchoolModules, apiCall, invalidate } from "@/lib/api";

interface ModuleEntry {
  module: {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    defaultEnabled: boolean;
    isCore: boolean;
    dependencies: string[];
    routePrefixes: string[];
    portalVisibility: string[];
  };
  isEnabled: boolean;
  source: "CORE" | "OVERRIDE" | "DEFAULT";
  operationalState?: string;
  badge?: string;
}

export default function SchoolModulesPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;

  const { data, isLoading, error } = useSchoolModules(schoolId);
  const school = data?.school;
  const modules: ModuleEntry[] = data?.modules || [];

  const [togglingModule, setTogglingModule] = useState<ModuleEntry | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const totalCount = modules.length;
  const enabledCount = modules.filter((m) => m.isEnabled).length;
  const coreCount = modules.filter((m) => m.module.isCore).length;
  const optionalCount = totalCount - coreCount;

  const handleInitiateToggle = (mod: ModuleEntry) => {
    if (mod.module.isCore) return; // Core modules are immutable
    setFeedback(null);
    setTogglingModule(mod);
  };

  const handleConfirmToggle = async () => {
    if (!togglingModule) return;
    setIsUpdating(true);
    setFeedback(null);

    const targetState = !togglingModule.isEnabled;
    try {
      await apiCall(`/api/v1/schools/${schoolId}/modules/${togglingModule.module.code}`, "PATCH", {
        enabled: targetState,
      });

      // Invalidate cache
      invalidate(`/api/v1/schools/${schoolId}/modules`);

      setFeedback({
        type: "success",
        message: `Module ${togglingModule.module.name} successfully ${targetState ? "enabled" : "disabled"}.`,
      });
      setTogglingModule(null);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update module entitlement",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-8 pt-2">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/schools"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to School Network
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Shield className="w-4 h-4" /> Modular SaaS Entitlement Control
          </div>
          <h1 className="text-[36px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-slate-400 font-[var(--font-heading)] leading-tight">
            {school?.name || "Institution"} — Module Entitlements
          </h1>
          <p className="text-[14px] text-slate-400 mt-2 font-medium max-w-2xl">
            Configure school-specific module access, review operational provisioning states, and manage feature licensing across isolated tenant environments.
          </p>
        </div>

        {school && (
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <div className="text-xs font-mono text-slate-300">
              <span className="text-slate-500">CODE:</span> {school.code}
            </div>
            <span className="text-slate-700">|</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {school.status}
            </span>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </motion.div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Total ERP Modules
          </div>
          <div className="text-2xl font-black text-white">{totalCount}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
            Active / Entitled
          </div>
          <div className="text-2xl font-black text-emerald-400">{enabledCount}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
            Core (Locked)
          </div>
          <div className="text-2xl font-black text-purple-400">{coreCount}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            Optional Add-ons
          </div>
          <div className="text-2xl font-black text-amber-400">{optionalCount}</div>
        </div>
      </div>

      {/* Modules Catalog Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg font-[var(--font-heading)]">
            <Layers className="w-5 h-5 text-purple-400" /> Entitlement Registry & State
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {schoolId}
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            <span>Resolving school module entitlements from Central Registry...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
            <p className="font-bold">Failed to load module configuration</p>
            <p className="text-xs text-slate-500 mt-1">{error.message}</p>
          </div>
        ) : modules.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No modules discovered in Central Registry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <th className="p-6">Module Identity</th>
                  <th className="p-6">Category</th>
                  <th className="p-6">Dependencies</th>
                  <th className="p-6">Operational State</th>
                  <th className="p-6">Entitlement Status</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {modules.map((entry) => {
                  const { module: mod, isEnabled, source, operationalState, badge } = entry;
                  const isCore = mod.isCore;

                  return (
                    <tr
                      key={mod.code}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      {/* Identity */}
                      <td className="p-6">
                        <div className="font-bold text-white flex items-center gap-2">
                          {mod.name}
                          {isCore && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              <Lock className="w-2.5 h-2.5" /> Core
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">
                          {mod.code}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 max-w-md line-clamp-1">
                          {mod.description}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-6">
                        <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          {mod.category}
                        </span>
                      </td>

                      {/* Dependencies */}
                      <td className="p-6">
                        {mod.dependencies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {mod.dependencies.map((dep) => (
                              <span
                                key={dep}
                                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
                              >
                                {dep}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">None (Standalone)</span>
                        )}
                      </td>

                      {/* Operational State */}
                      <td className="p-6">
                        {badge ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            {badge}
                          </span>
                        ) : isEnabled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800/80 text-slate-500 border border-slate-700/60">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Entitlement Status */}
                      <td className="p-6">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                            isEnabled
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1 uppercase font-mono">
                          Source: {source}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-6 text-right">
                        {isCore ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-bold cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5" /> Locked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInitiateToggle(entry)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              isEnabled
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {isEnabled ? "Disable Module" : "Enable Module"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {togglingModule && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative"
            >
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                    togglingModule.isEnabled
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-[var(--font-heading)]">
                    {togglingModule.isEnabled ? "Disable" : "Enable"}{" "}
                    {togglingModule.module.name}?
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tenant: <span className="font-mono text-purple-300">{school?.name}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8 text-sm text-slate-300 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    {togglingModule.isEnabled ? (
                      <p>
                        Disabling this module will immediately remove it from the school ERP Admin sidebar and reject operational API requests. Historical data will be preserved.
                      </p>
                    ) : (
                      <p>
                        Enabling this module will grant access in the ERP Admin portal according to defined dependencies.
                      </p>
                    )}
                  </div>
                </div>

                {togglingModule.module.dependencies.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-500 font-bold uppercase">Required Dependencies:</span>
                    <div className="flex gap-2 mt-1">
                      {togglingModule.module.dependencies.map((dep) => (
                        <span key={dep} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTogglingModule(null)}
                  disabled={isUpdating}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggle}
                  disabled={isUpdating}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer transition-all flex items-center gap-2 ${
                    togglingModule.isEnabled
                      ? "bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  }`}
                >
                  {isUpdating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {togglingModule.isEnabled ? "Confirm Disable" : "Confirm Enable"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

