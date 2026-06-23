"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiCall } from "@/lib/api-hooks";
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Activity, 
  Server, 
  Eye, 
  EyeOff, 
  MessageCircle, 
  Mail, 
  Phone, 
  HelpCircle, 
  X,
  ArrowRight,
  User,
  ShieldAlert,
  Globe2,
  Shield,
  Clock,
  Zap,
  CheckCircle2,
  Type
} from "lucide-react";

// Modal Component
const AssistanceModal = ({ isOpen, onClose, isLargeText }: { isOpen: boolean, onClose: () => void, isLargeText: boolean }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/70 backdrop-blur-md"
            aria-hidden="true"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[rgba(10,15,30,0.95)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            style={{ transform: isLargeText ? "scale(1.05)" : "scale(1)" }}
          >
            <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <div>
                <h3 id="modal-title" className="text-[20px] font-bold text-[#F8FAFC]">Support Center</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-3 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-4 bg-white/[0.02] border-b border-[rgba(255,255,255,0.03)] flex flex-wrap gap-4 items-center justify-between text-[14px]">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Clock className="w-5 h-5 text-[#22D3EE]" />
                Average Response Time: <span className="font-semibold text-[#F8FAFC]">&lt; 15 Minutes</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></div>
                Availability: <span className="font-semibold text-[#F8FAFC]">24/7</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {[
                { icon: Mail, title: "Email Support", desc: "Get help via email within 24 hours." },
                { icon: Phone, title: "Call Support", desc: "Talk to a representative over the phone." },
                { icon: HelpCircle, title: "Knowledge Base", desc: "Find answers to common questions." },
                { icon: MessageCircle, title: "Live Chat", desc: "Speak with our support team instantly." },
              ].map((item, idx) => (
                <button key={idx} className="w-full flex items-center justify-between p-4 rounded-[14px] hover:bg-white/[0.03] border border-transparent hover:border-white/10 transition-all group text-left focus:outline-none focus:ring-2 focus:ring-[#22D3EE]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#020617]/50 border border-white/5 rounded-xl text-[#14B8A6] group-hover:text-[#22D3EE] group-hover:scale-110 transition-all shadow-inner">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-[#F8FAFC] font-bold text-[16px]">{item.title}</h4>
                      <p className="text-[#94A3B8] text-[14px] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#14B8A6] transform group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
            <div className="p-5 border-t border-[rgba(255,255,255,0.05)] bg-white/[0.01] text-center">
              <p className="text-[14px] text-[#94A3B8]">Support services are continuously monitored for availability and performance.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function StudentLogin() {
  const [admissionNo, setAdmissionNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAssistanceOpen, setIsAssistanceOpen] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);
  const { login } = useAuth();
  
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");

  // Load preference
  useEffect(() => {
    const pref = localStorage.getItem("ssvm_large_text");
    if (pref === "true") setIsLargeText(true);
  }, []);

  const toggleLargeText = () => {
    const newVal = !isLargeText;
    setIsLargeText(newVal);
    localStorage.setItem("ssvm_large_text", String(newVal));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (requires2FA) {
        const res = await apiCall("/api/v1/auth/verify-2fa", "POST", { tempToken, otp });
        if (res.success && res.data.user.role === "STUDENT") {
          login(res.data.token, res.data.user);
        } else {
          throw new Error("Invalid OTP or unauthorized access.");
        }
        return;
      }

      const res = await apiCall("/api/v1/auth/student/login", "POST", { admissionNo, password });
      
      if (res.requires2FA) {
        setRequires2FA(true);
        setTempToken(res.tempToken || "");
        return;
      }

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
    <div className="min-h-[100dvh] flex flex-col relative bg-gradient-to-br from-[#020617] via-[#03152B] to-[#041C38] font-sans selection:bg-[#14B8A6]/30 overflow-x-hidden">
      
      {/* --- Phase 4: Accessibility Mode Toggle --- */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleLargeText}
          className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-full text-[#F8FAFC] text-[14px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
          aria-pressed={isLargeText}
          aria-label="Toggle larger text size"
        >
          <Type className="w-4 h-4" />
          A+ Larger Text
        </button>
      </div>

      {/* --- Background System --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="absolute top-[-10%] left-[5%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[150px] animate-[spin_60s_linear_infinite]" />
        <div className="absolute bottom-[0%] right-[10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[140px] animate-[spin_50s_linear_infinite_reverse]" />
        <div className="absolute top-[20%] left-[50%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[130px] animate-[pulse_40s_ease-in-out_infinite]" />
        <div className="absolute top-[5%] right-[-10%] md:right-[-5%] opacity-[0.04] blur-[2px] transform scale-150 rotate-[-10deg]">
          <ShieldAlert className="w-[800px] h-[800px] text-white" />
        </div>
        <div className="absolute bottom-[30px] right-[20px] text-[120px] lg:text-[220px] font-[900] text-white opacity-[0.03] blur-[1px] tracking-widest uppercase pointer-events-none select-none leading-none">
          SECURE
        </div>
      </div>

      {/* --- Main Content Area --- */}
      {/* Removed md:overflow-hidden to allow natural scrolling for highly readable/large UI */}
      <div 
        className="flex-1 w-full max-w-[1400px] mx-auto px-6 sm:px-12 md:px-[48px] flex flex-col md:flex-row items-center justify-between relative z-10 gap-10 lg:gap-16 py-16 min-h-[calc(100vh-140px)] transition-transform duration-300 origin-top"
        style={{ transform: isLargeText ? "scale(1.05)" : "scale(1)" }}
      >
        
        {/* --- Left Section (Hero Content) --- */}
        <div className="w-full md:flex-1 flex flex-col justify-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mb-3"
          >
            <span className="text-[#22D3EE] font-[700] text-[11px] tracking-[4px] uppercase opacity-80">
              Enterprise Payment Infrastructure
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[clamp(48px,5vw,64px)] font-[800] text-[#F8FAFC] tracking-tight leading-[1.05] mb-6"
          >
            Secure Payments,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-[#22D3EE]">Trusted Every Time.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[18px] text-[#94A3B8] max-w-[650px] leading-[1.8] font-[400] mb-[24px]"
          >
            Enterprise-grade payment verification designed for secure transactions, compliance, and financial reliability.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-start gap-4 mb-[24px] bg-white/[0.015] border border-white/[0.05] p-5 rounded-xl max-w-[650px]"
          >
            <Shield className="w-6 h-6 text-[#22D3EE] flex-shrink-0 mt-0.5 opacity-80" />
            <p className="text-[16px] font-medium text-[#F8FAFC] leading-relaxed opacity-90">
              Protected by enterprise-grade encryption, compliance controls, fraud detection systems, and continuous infrastructure monitoring.
            </p>
          </motion.div>

          {/* Trust Cards */}
          <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
             className="grid grid-cols-1 sm:grid-cols-2 gap-[20px] mb-[24px] max-w-[650px]"
          >
             {[
               { icon: Lock, title: "TLS 1.3", desc: "Secure transport encryption" },
               { icon: ShieldCheck, title: "AES-256", desc: "Military-grade data protection" },
               { icon: CreditCard, title: "PCI-DSS", desc: "Industry standard compliance" },
               { icon: Server, title: "99.99% Uptime", desc: "High availability infrastructure" }
             ].map((card, i) => (
               <motion.div 
                 key={i} 
                 whileHover={{ translateY: -2, borderColor: "rgba(34,211,238,0.2)" }}
                 transition={{ duration: 0.25 }}
                 className="flex items-start gap-4 p-[20px] rounded-[12px] bg-[rgba(10,15,30,0.4)] border border-[rgba(255,255,255,0.05)] group"
               >
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-[#14B8A6]/50 transition-colors">
                    <card.icon className="w-5 h-5 text-[#22D3EE]" />
                  </div>
                  <div>
                    <h3 className="text-[#F8FAFC] font-[700] text-[16px] mb-1">{card.title}</h3>
                    <p className="text-[#94A3B8] text-[14px] leading-[1.6]">{card.desc}</p>
                  </div>
               </motion.div>
             ))}
          </motion.div>

          {/* System Status Component */}
          <motion.div 
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
             className="flex items-center gap-4 p-4 rounded-[12px] bg-[rgba(10,15,30,0.5)] border border-[rgba(255,255,255,0.08)] backdrop-blur-md w-fit"
          >
            <div className="relative flex h-3 w-3">
              <span className="animate-[pulse_3s_infinite] absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
            </div>
            <div>
               <div className="text-[12px] font-bold tracking-wider text-[#94A3B8] uppercase mb-0.5 flex items-center gap-1.5">
                 System Status
               </div>
               <div className="text-[16px] font-semibold text-[#F8FAFC]">All Services Operational</div>
               <div className="text-[12px] text-[#94A3B8] mt-0.5">Last Updated: Just Now</div>
            </div>
          </motion.div>

        </div>

        {/* --- Right Section (Verification Card) --- */}
        <div className="w-full max-w-[500px] flex-shrink-0 relative">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
            className="w-full relative group"
          >
            <div className="absolute -inset-[1px] bg-gradient-to-tr from-[rgba(34,211,238,0.18)] to-transparent rounded-[26px] blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            {/* Phase 2: Card Adjustments */}
            <motion.div 
              whileHover={{ translateY: -2 }}
              transition={{ duration: 0.4 }}
              className="relative p-[40px] lg:p-[48px] bg-[rgba(10,15,30,0.72)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.08)] rounded-[24px] shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
            >
              
              <div className="mb-8">
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                       <ShieldCheck className="w-6 h-6 text-[#22D3EE]" />
                     </div>
                     <div>
                       <span className="text-[16px] font-bold tracking-wide text-[#F8FAFC]">Enterprise Payments</span>
                     </div>
                   </div>
                   <span className="text-[12px] font-bold tracking-wider text-[#14B8A6] uppercase">Step 1 of 2</span>
                 </div>
                 <h2 className="text-[24px] font-bold text-[#F8FAFC] leading-tight mb-2">Secure Verification</h2>
                 <p className="text-[16px] text-[#94A3B8] leading-[1.6]">
                   Please verify your credentials before accessing payment services.
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="p-4 mb-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[16px] rounded-[12px] font-medium flex items-start gap-3">
                         <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
                         <p>{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {!requires2FA ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="admissionNo" className="block text-[14px] font-[600] text-[rgba(255,255,255,0.85)]">Admission / Customer ID</label>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="w-5 h-5 text-slate-400 group-focus-within/input:text-[#22D3EE] transition-colors" />
                        </div>
                        <input
                          id="admissionNo"
                          type="text"
                          required
                          disabled={loading}
                          value={admissionNo}
                          onChange={(e) => setAdmissionNo(e.target.value)}
                          className="w-full h-[58px] pl-[48px] pr-4 bg-[rgba(2,6,23,0.4)] border border-[rgba(255,255,255,0.12)] rounded-[14px] outline-none focus:border-[#22D3EE] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.15)] hover:border-white/20 transition-all duration-200 text-[16px] text-[#F8FAFC] placeholder:text-[16px] placeholder:text-slate-400/90 font-[500] disabled:opacity-50"
                          placeholder="e.g. ADM2023001"
                          autoComplete="username"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-[14px] font-[600] text-[rgba(255,255,255,0.85)]">Password</label>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="w-5 h-5 text-slate-400 group-focus-within/input:text-[#22D3EE] transition-colors" />
                        </div>
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          disabled={loading}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-[58px] pl-[48px] pr-[52px] bg-[rgba(2,6,23,0.4)] border border-[rgba(255,255,255,0.12)] rounded-[14px] outline-none focus:border-[#22D3EE] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.15)] hover:border-white/20 transition-all duration-200 text-[16px] text-[#F8FAFC] placeholder:text-[16px] placeholder:text-slate-400/90 font-[500] disabled:opacity-50"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#22D3EE] transition-colors focus:outline-none focus:text-[#22D3EE] disabled:opacity-50"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                     <div className="p-5 bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-[14px] text-center">
                       <ShieldCheck className="w-8 h-8 text-[#22D3EE] mx-auto mb-3" />
                       <p className="text-[#22D3EE] font-[700] text-[16px]">Two-Factor Authentication</p>
                       <p className="text-[#94A3B8] text-[14px] mt-2">Please enter the 6-digit verification code.</p>
                     </div>
                     <div className="space-y-2">
                       <label htmlFor="otp" className="block text-[14px] font-[600] text-[rgba(255,255,255,0.85)] text-center">Authentication Code</label>
                       <input
                         id="otp"
                         type="text"
                         required
                         maxLength={6}
                         disabled={loading}
                         value={otp}
                         onChange={(e) => setOtp(e.target.value)}
                         className="w-full h-[58px] px-4 bg-[rgba(2,6,23,0.4)] border border-[rgba(255,255,255,0.12)] rounded-[14px] outline-none focus:border-[#22D3EE] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.15)] hover:border-white/20 transition-all duration-200 text-[#F8FAFC] text-center text-[24px] tracking-[0.4em] font-bold placeholder:text-[16px] placeholder:text-slate-400/90 placeholder:tracking-normal placeholder:font-normal disabled:opacity-50"
                         placeholder="000000"
                         autoComplete="one-time-code"
                       />
                     </div>
                  </motion.div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[58px] bg-gradient-to-r from-[#14B8A6] to-[#22D3EE] hover:from-[#11a393] hover:to-[#1cbcd5] text-[#020617] font-[700] text-[18px] rounded-[14px] shadow-[0_8px_25px_rgba(34,211,238,0.3)] hover:-translate-y-[2px] transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex justify-center items-center gap-3 focus:outline-none focus:ring-4 focus:ring-[#22D3EE]/50"
                  >
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-[#020617]/30 border-t-[#020617] rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      requires2FA ? "Verify Code" : "Verify & Continue"
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAssistanceOpen(true)}
                    className="text-[16px] font-medium text-[#94A3B8] hover:text-[#22D3EE] hover:underline transition-all flex items-center justify-center gap-2 mx-auto group focus:outline-none focus:text-[#22D3EE] focus:underline rounded-md px-3 py-2"
                  >
                    Need Assistance?
                    <span className="text-[#22D3EE] font-[700] flex items-center">
                      Contact Support 
                      <ArrowRight className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </div>
              </form>

              {/* Phase 6: Trust & Security Messaging */}
              <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.08)] space-y-4">
                 <div className="flex items-start gap-3">
                   <Lock className="w-5 h-5 text-[#94A3B8] mt-1 flex-shrink-0" />
                   <p className="text-[13px] text-[#94A3B8] leading-[1.7]">
                     Your information is protected using enterprise-grade encryption and secure authentication protocols.
                   </p>
                 </div>
                 <div className="flex items-start gap-3">
                   <Shield className="w-5 h-5 text-slate-500 mt-1 flex-shrink-0" />
                   <p className="text-[13px] text-slate-500 leading-[1.7]">
                     Sessions automatically expire after inactivity for your protection.
                   </p>
                 </div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* --- Footer Area --- */}
      <div 
        className="mt-auto transition-transform duration-300 origin-bottom"
        style={{ transform: isLargeText ? "scale(1.05)" : "scale(1)" }}
      >
        <div className="w-full relative z-10 bg-[rgba(255,255,255,0.015)] border-t border-[rgba(255,255,255,0.03)] py-4 backdrop-blur-md">
          <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap justify-center items-center gap-[32px]">
            <div className="flex items-center gap-2.5 text-[14px] font-[500] tracking-wide text-[#94A3B8]/90">
              <Lock className="w-4 h-4 text-[#22D3EE]" /> AES-256 Encryption
            </div>
            <div className="flex items-center gap-2.5 text-[14px] font-[500] tracking-wide text-[#94A3B8]/90">
              <ShieldCheck className="w-4 h-4 text-[#22D3EE]" /> Fraud Protection
            </div>
            <div className="flex items-center gap-2.5 text-[14px] font-[500] tracking-wide text-[#94A3B8]/90">
              <CheckCircle2 className="w-4 h-4 text-[#22D3EE]" /> PCI-DSS Aligned
            </div>
            <div className="flex items-center gap-2.5 text-[14px] font-[500] tracking-wide text-[#94A3B8]/90">
              <Zap className="w-4 h-4 text-[#22D3EE]" /> 99.99% Availability
            </div>
          </div>
        </div>

        <footer className="w-full relative z-10 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] pt-[40px] pb-[40px]">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-12 md:px-[48px]">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Left Section */}
              <div className="text-[14px] text-[#94A3B8]/80 flex items-center gap-2 flex-shrink-0 font-[500]">
                <Globe2 className="w-4 h-4 opacity-70" />
                &copy; {new Date().getFullYear()} Enterprise Payments. All rights reserved.
              </div>
              
              {/* Center Section */}
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] text-[#94A3B8] font-[500]">
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-[#22D3EE] hover:underline focus:outline-none focus:text-[#22D3EE] focus:opacity-100 transition-all duration-200">Privacy Policy</a>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-[#22D3EE] hover:underline focus:outline-none focus:text-[#22D3EE] focus:opacity-100 transition-all duration-200">Terms of Service</a>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-[#22D3EE] hover:underline focus:outline-none focus:text-[#22D3EE] focus:opacity-100 transition-all duration-200">Security Center</a>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-[#22D3EE] hover:underline focus:outline-none focus:text-[#22D3EE] focus:opacity-100 transition-all duration-200">Compliance</a>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-[#22D3EE] hover:underline focus:outline-none focus:text-[#22D3EE] focus:opacity-100 transition-all duration-200">System Status</a>
                <a href="#" className="opacity-80 hover:opacity-100 hover:text-[#22D3EE] hover:underline focus:outline-none focus:text-[#22D3EE] focus:opacity-100 transition-all duration-200">Contact Support</a>
              </div>

              {/* Right Section */}
              <div className="text-[12px] text-[#94A3B8] opacity-60 flex-shrink-0 text-center md:text-right mt-2 md:mt-0 font-[500]">
                <div>Platform Version 3.0</div>
                <div>Build 2026.01</div>
              </div>

            </div>
          </div>
        </footer>
      </div>

      <AssistanceModal isOpen={isAssistanceOpen} onClose={() => setIsAssistanceOpen(false)} isLargeText={isLargeText} />
    </div>
  );
}
