"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "Invalid credentials or unauthorized.");
      setIsLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${result.role?.toLowerCase() || 'admin'}`);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628] p-4 relative overflow-hidden">
      {/* Background styling */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-3xl" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-orange-400/10 blur-3xl" />

      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-[900px] bg-white rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)] flex flex-col md:flex-row relative z-10"
      >
        {/* Left Branding Panel */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-[#CC5500]">
          <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-orange-500/10" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[200px] h-[200px] rounded-full bg-orange-400/10" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-red-800 flex items-center justify-center text-[22px] shadow-[0_4px_12px_rgba(255,153,51,0.3)]">
              🪷
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[14px] font-bold text-[#FF8C3A] font-[var(--font-heading)]">SSVM College Square</span>
              <span className="text-[10px] font-medium text-white/40 tracking-[0.05em] uppercase font-[var(--font-heading)]">Secure Portal</span>
            </div>
          </div>

          <div className="relative z-10 my-auto">
            <h2 className="text-[clamp(26px,3vw,40px)] font-extrabold text-white leading-[1.15] mb-4 font-[var(--font-heading)]">
              Welcome to the<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-orange-400">Dashboard Login</span>
            </h2>
            <p className="text-[15px] text-white/50 leading-[1.7] max-w-[280px]">
              Access your secure dashboard to manage the institution, view student records, or update alumni profiles.
            </p>
          </div>
        </div>

        {/* Right Interactive Panel */}
        <div className="w-full md:w-1/2 p-8 md:p-12 relative flex flex-col justify-center bg-[#F8F9FA] min-h-[500px]">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-[72px] h-[72px] mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-4xl mb-5 shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
                ✓
              </div>
              <h3 className="font-[var(--font-heading)] text-[22px] font-bold text-gray-900 mb-2">Login Successful!</h3>
              <p className="text-[14px] text-gray-500 mb-6">Redirecting to your dashboard...</p>
              <div className="flex gap-1.5 justify-center">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="inline-flex items-center gap-2 bg-[#FFF3E8] border border-[#FDDBB8] text-[#CC5500] font-[var(--font-heading)] text-[12px] font-semibold px-3.5 py-1.5 rounded-full mb-5 tracking-[0.04em]">
                🛡️ Secure Access
              </div>

              <h3 className="font-[var(--font-heading)] text-[24px] font-bold text-gray-900 mb-1.5">Portal Login</h3>
              <p className="text-[14px] text-gray-500 mb-7 leading-relaxed">Enter your credentials to securely access your dashboard.</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 text-[13px] font-medium p-3 rounded-xl mb-5 flex items-center gap-2"
                >
                  <span>⚠️</span> {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col" autoComplete="off">
                <div className="mb-4.5">
                  <label className="block font-[var(--font-heading)] text-[12px] font-semibold text-gray-900 mb-1.5 tracking-[0.03em]">Email Address</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="new-password"
                    name="email_secure_field"
                    className="w-full p-[12px_16px] border-[1.5px] border-gray-200 rounded-xl text-[14px] text-gray-900 bg-white outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/10 transition-all font-[var(--font-body)] mb-4"
                  />
                </div>
                
                <div className="mb-4.5">
                  <label className="block font-[var(--font-heading)] text-[12px] font-semibold text-gray-900 mb-1.5 tracking-[0.03em]">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="new-password"
                    name="password_secure_field"
                    className="w-full p-[12px_16px] border-[1.5px] border-gray-200 rounded-xl text-[14px] text-gray-900 bg-white outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/10 transition-all font-[var(--font-body)] mb-5"
                  />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <label className="flex items-center gap-2 text-[13px] text-gray-500 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-orange-500" /> Remember me
                  </label>
                  <button type="button" className="font-[var(--font-heading)] text-[13px] text-orange-500 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full p-[14px] border-none rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-[var(--font-heading)] text-[15px] font-semibold cursor-pointer tracking-[0.02em] shadow-[0_6px_20px_rgba(255,107,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(255,107,0,0.4)] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Secure Login →"
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
