"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Eye, Clock, UserCheck } from "lucide-react";
import { useSchoolSupportSession } from "@/lib/api-hooks";

export function SupportSessionBanner() {
  const { data } = useSchoolSupportSession();

  const session = data?.active ? data.session : null;

  if (!session) {
    return null;
  }

  const expiresTime = new Date(session.expiresAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 overflow-hidden"
      >
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 text-amber-900 shadow-sm backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md font-mono">
                    READ-ONLY PLATFORM ACCESS
                  </span>
                  <span className="text-xs font-bold text-amber-900 font-[var(--font-heading)]">
                    Active Support Session Open
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5 font-[var(--font-heading)]">
                  Super Administrator{" "}
                  <strong className="font-semibold text-amber-950 font-mono">
                    {session.superAdminEmail}
                  </strong>{" "}
                  is inspecting tenant diagnostics. Reason:{" "}
                  <span className="italic font-medium">"{session.reason}"</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Until {expiresTime}</span>
              </div>
              <div className="hidden md:flex items-center gap-1 text-[11px] font-bold text-amber-800/80 uppercase">
                <Eye className="w-3.5 h-3.5" /> Audited
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
