"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("superadmin@ssvm-erp.com");
  const [password, setPassword] = useState("superadmin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.data.user.role !== "SUPER_ADMIN") throw new Error("Access denied — Super Admin only");
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0B1120 0%, #1E1B4B 50%, #0B1120 100%)" }}>
      
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-20 -top-20 -left-20 animate-pulse"
          style={{ background: "radial-gradient(circle, #3B82F6, transparent)" }} />
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-15 -bottom-10 -right-10 animate-pulse"
          style={{ background: "radial-gradient(circle, #8B5CF6, transparent)", animationDelay: "1s" }} />
        <div className="absolute w-[200px] h-[200px] rounded-full opacity-10 top-1/3 right-1/4 animate-pulse"
          style={{ background: "radial-gradient(circle, #06B6D4, transparent)", animationDelay: "2s" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative w-full max-w-[420px]">
        
        {/* Glass card */}
        <div className="rounded-3xl p-8 backdrop-blur-xl"
          style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(59, 130, 246, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
          
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-[28px]"
              style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", boxShadow: "0 8px 24px rgba(59,130,246,0.3)" }}>
              ⚡
            </motion.div>
            <h1 className="text-[22px] font-bold text-white font-[var(--font-heading)]">Super Admin</h1>
            <p className="text-[13px] text-text-secondary mt-1">SSVM ERP Control Center</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-[13px] text-white outline-none transition-all"
                style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(59,130,246,0.2)" }}
                onFocus={e => e.target.style.borderColor = "#3B82F6"} onBlur={e => e.target.style.borderColor = "rgba(59,130,246,0.2)"} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-[13px] text-white outline-none transition-all"
                style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(59,130,246,0.2)" }}
                onFocus={e => e.target.style.borderColor = "#3B82F6"} onBlur={e => e.target.style.borderColor = "rgba(59,130,246,0.2)"} />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[12px] text-red-400 bg-red-500/10 rounded-xl px-4 py-2.5 border border-red-500/20">
                {error}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white border-none cursor-pointer transition-all mt-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>
              {loading ? "Authenticating..." : "Access Control Panel"}
            </motion.button>
          </form>

          <div className="text-center mt-6 text-[11px] text-text-muted">
            🔒 Encrypted & Secure Access
          </div>
        </div>
      </motion.div>
    </div>
  );
}
