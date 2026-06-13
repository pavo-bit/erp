"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/auth-context";

export default function TeacherLoginPage() {
  const { login, verify2FA } = useAuth();
  const [email, setEmail] = useState("teacher@ssvm-cuttack.org");
  const [password, setPassword] = useState("teacher123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    if (requires2FA) {
      const result = await verify2FA(tempToken, otp);
      if (!result.success) {
        setError(result.error || "Invalid OTP");
        setLoading(false);
      }
      return;
    }

    const result = await login(email, password);
    if (result?.requires2FA) {
      setRequires2FA(true);
      setTempToken(result.tempToken || "");
    } else if (result && !result.success) {
      setError(result.error || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 50%, #F0FDF4 100%)" }}>
      
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="w-full max-w-[420px]">
        
        <div className="bg-white rounded-3xl p-8 shadow-xl" style={{ border: "1px solid #E5E7EB" }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-[28px]"
              style={{ background: "linear-gradient(135deg, #0D9488, #06B6D4)", boxShadow: "0 8px 24px rgba(13,148,136,0.25)" }}>
              👨‍🏫
            </motion.div>
            <h1 className="text-[22px] font-bold text-text-primary font-[var(--font-heading)]">Teacher Portal</h1>
            <p className="text-[13px] text-text-secondary mt-1">Saraswati Shishu Vidya Mandir</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {!requires2FA ? (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-3 rounded-xl border border-border text-[13px] text-text-primary outline-none focus:border-primary transition-colors bg-surface" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-4 py-3 rounded-xl border border-border text-[13px] text-text-primary outline-none focus:border-primary transition-colors bg-surface" />
                </div>
              </>
            ) : (
              <div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-4 text-center">
                  <p className="text-blue-800 text-[12px] font-medium">Two-Factor Authentication</p>
                  <p className="text-blue-600 text-[11px] mt-1">Enter the 6-digit code to continue.</p>
                </div>
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block text-center">Authentication Code</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-border text-[24px] tracking-[0.5em] font-bold text-center text-text-primary outline-none focus:border-primary transition-colors bg-surface" />
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[12px] text-danger bg-red-50 rounded-xl px-4 py-2.5 border border-red-200">
                {error}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white border-none cursor-pointer transition-all mt-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0D9488, #06B6D4)", boxShadow: "0 4px 16px rgba(13,148,136,0.25)" }}>
              {loading ? "Signing in..." : (requires2FA ? "Verify OTP" : "Sign In to Portal")}
            </motion.button>
          </form>

          <div className="text-center mt-6 text-[11px] text-text-secondary">
            🔒 Teacher credentials provided by school administration
          </div>
        </div>
      </motion.div>
    </div>
  );
}
