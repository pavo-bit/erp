"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "STUDENT" | "PARENT" | "ALUMNI" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRoleSelect = (role: "ADMIN" | "STUDENT" | "PARENT" | "ALUMNI") => {
    setSelectedRole(role);
    setError("");
    // Pre-fill demo credentials based on role
    if (role === "ADMIN") { setEmail("admin@ssvm-cuttack.org"); setPassword("admin123"); }
    else if (role === "STUDENT") { setEmail("student@ssvm-cuttack.org"); setPassword("student123"); }
    else if (role === "PARENT") { setEmail("parent@ssvm-cuttack.org"); setPassword("parent123"); }
    else if (role === "ALUMNI") { setEmail("alumni@ssvm-cuttack.org"); setPassword("alumni123"); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "Login failed");
      setIsLoading(false);
    } else {
      setSuccess(true);
      // Wait a moment so the success animation can show before the router redirects
      setTimeout(() => {
        if (result.role) {
          window.location.href = `/${result.role.toLowerCase()}`;
        }
      }, 1500);
    }
  };

  const getRoleIcon = () => {
    switch (selectedRole) {
      case "ADMIN": return "🛡️";
      case "STUDENT": return "🎒";
      case "PARENT": return "👨‍👩‍👧";
      case "ALUMNI": return "🎓";
      default: return "";
    }
  };

  const getRoleLabel = () => {
    if (!selectedRole) return "";
    return selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-[900px] bg-white rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] flex flex-col md:flex-row max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
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
                  <span className="text-[10px] font-medium text-white/40 tracking-[0.05em] uppercase font-[var(--font-heading)]">Digital Ecosystem</span>
                </div>
              </div>

              <div className="relative z-10 my-auto">
                <h2 className="text-[clamp(26px,3vw,40px)] font-extrabold text-white leading-[1.15] mb-4 font-[var(--font-heading)]">
                  Welcome to the<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-orange-400">School Portal</span>
                </h2>
                <p className="text-[15px] text-white/50 leading-[1.7] max-w-[280px]">
                  Access your personalized dashboard — manage academics, track progress, and stay connected with the SSVM community.
                </p>
              </div>

              <div className="relative z-10 flex gap-7">
                {[
                  { num: "3,200+", label: "Students" },
                  { num: "120+", label: "Faculty" },
                  { num: "98%", label: "Pass Rate" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <span className="font-[var(--font-heading)] text-[22px] font-bold text-white block">{s.num}</span>
                    <span className="font-[var(--font-heading)] text-[10px] text-white/40 uppercase tracking-[0.08em]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Panel */}
            <div className="w-full md:w-1/2 p-8 md:p-12 relative flex flex-col justify-center bg-[#F8F9FA] min-h-[400px]">
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-9 h-9 rounded-full border-[1.5px] border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-500 hover:rotate-90 transition-all duration-200 z-10"
              >
                ✕
              </button>

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
              ) : !selectedRole ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="font-[var(--font-heading)] text-[24px] font-bold text-gray-900 mb-1.5">Select Dashboard</h3>
                  <p className="text-[14px] text-gray-500 mb-7 leading-relaxed">Choose your role to proceed to the login panel.</p>

                  <div className="grid grid-cols-2 gap-3.5">
                    {[
                      { id: "ADMIN", label: "Admin", icon: "🛡️", desc: "Manage institution" },
                      { id: "STUDENT", label: "Student", icon: "🎒", desc: "Access academics" },
                      { id: "PARENT", label: "Parent", icon: "👨‍👩‍👧", desc: "Track progress" },
                      { id: "ALUMNI", label: "Alumni", icon: "🎓", desc: "Stay connected" },
                    ].map((role) => (
                      <div
                        key={role.id}
                        onClick={() => handleRoleSelect(role.id as any)}
                        className="p-[22px_18px] rounded-2xl border-[1.5px] border-gray-200 bg-white cursor-pointer text-center relative overflow-hidden group hover:border-orange-500 hover:shadow-[0_8px_24px_rgba(255,107,0,0.1)] hover:-translate-y-0.5 transition-all duration-250"
                      >
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 to-orange-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                        <span className="text-[32px] block mb-2.5 group-hover:scale-110 transition-transform duration-250">{role.icon}</span>
                        <span className="font-[var(--font-heading)] text-[15px] font-semibold text-gray-900 block">{role.label}</span>
                        <span className="text-[12px] text-gray-500 mt-1 block">{role.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <button
                    onClick={() => {
                      setSelectedRole(null);
                      setError("");
                    }}
                    className="flex items-center gap-1.5 font-[var(--font-heading)] text-[13px] text-gray-500 hover:text-orange-500 transition-colors mb-5 bg-transparent border-none p-0 cursor-pointer"
                  >
                    ← Select a different role
                  </button>

                  <div className="inline-flex items-center gap-2 bg-[#FFF3E8] border border-[#FDDBB8] text-[#CC5500] font-[var(--font-heading)] text-[12px] font-semibold px-3.5 py-1.5 rounded-full mb-5 tracking-[0.04em]">
                    {getRoleIcon()} {getRoleLabel()} Dashboard
                  </div>

                  <h3 className="font-[var(--font-heading)] text-[24px] font-bold text-gray-900 mb-1.5">{getRoleLabel()} Login</h3>
                  <p className="text-[14px] text-gray-500 mb-7 leading-relaxed">Enter your credentials to access the dashboard.</p>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 text-red-600 text-[13px] font-medium p-3 rounded-xl mb-5 flex items-center gap-2"
                    >
                      <span>⚠️</span> {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleLogin} className="flex flex-col">
                    <div className="mb-4.5">
                      <label className="block font-[var(--font-heading)] text-[12px] font-semibold text-gray-900 mb-1.5 tracking-[0.03em]">Email Address / User ID</label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email or ID"
                        required
                        className="w-full p-[12px_16px] border-[1.5px] border-gray-200 rounded-xl text-[14px] text-gray-900 bg-white outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/10 transition-all font-[var(--font-body)]"
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
                        "Sign In →"
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
