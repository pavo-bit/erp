"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiCall } from "@/lib/api-hooks";
import { GraduationCap, Lock, ShieldCheck } from "lucide-react";

export default function StudentLogin() {
  const [admissionNo, setAdmissionNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiCall("/api/auth/student/login", "POST", { admissionNo, password });
      if (res.success && res.data.user.role === "STUDENT") {
        login(res.data.token, res.data.user);
      } else {
        throw new Error("Unauthorized access.");
      }
    } catch (err: any) {
      setError(err.message || "Invalid Admission Number or Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Decorative Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 blur-[100px] pointer-events-none" />

      {/* Left branding panel */}
      <div className="hidden md:flex md:w-1/2 p-12 flex-col justify-between relative z-10">
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 mb-8 shadow-lg text-white font-bold text-xl">
            SS
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            Secure Fee <br/> Payment Portal
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
            Quick, reliable, and secure online fee payments for SSVM College Square.
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl w-fit backdrop-blur-md">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <span>256-bit Secure Encryption</span>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="glass-panel p-8 sm:p-10 rounded-3xl relative overflow-hidden">
            <div className="text-center mb-8 md:hidden">
               <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 mb-4 shadow-lg text-white font-bold">
                SS
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Payment</h2>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Student Verification</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Please provide your <strong className="text-slate-700 dark:text-slate-300">Admission Number</strong> (issued by the school) and Password to securely access your dues.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium">
                  {error}
                </motion.div>
              )}
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Admission Number</label>
                  <div className="relative flex items-center">
                    <GraduationCap className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={admissionNo}
                      onChange={(e) => setAdmissionNo(e.target.value)}
                      className="w-full pl-12 pr-5 py-3.5 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="e.g. ADM2023001"
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-5 py-3.5 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Enter school-issued password"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-teal-500/30 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Verify & Continue"
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
