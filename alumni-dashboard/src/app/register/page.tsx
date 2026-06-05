"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { User, BookOpen, Briefcase, Link as LinkIcon, Camera, ChevronRight, ChevronLeft, CheckCircle2, GraduationCap } from "lucide-react";
import Link from "next/link";

const steps = [
  { id: 1, title: "Basic Details", icon: User },
  { id: 2, title: "Academic", icon: BookOpen },
  { id: 3, title: "Professional", icon: Briefcase },
  { id: 4, title: "Social", icon: LinkIcon },
  { id: 5, title: "Photo", icon: Camera },
];

export default function PremiumAlumniRegister() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "",
    batch: "", passingYear: "", classPassed: "", branch: "",
    company: "", currentRole: "", industry: "",
    linkedin: "", github: "", portfolio: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => data.append(key, val));
      if (photo) data.append("photo", photo);
      
      // In a real app, this posts to the backend
      const res = await fetch("/api/auth/alumni/register", {
        method: "POST",
        body: data,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Registration failed");

      setSuccess("Application submitted successfully! Our team will review your profile and grant network access shortly.");
      setTimeout(() => router.push("/login"), 5000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex flex-col font-[var(--font-body)] text-white selection:bg-[#D4AF37]/30">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-8 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F5D061] flex items-center justify-center shadow-lg">
            <GraduationCap className="text-[#0A0F1C] w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white font-[var(--font-heading)] font-bold text-lg tracking-wide">SSVM</h1>
            <p className="text-[#D4AF37] text-[10px] font-semibold tracking-widest uppercase">Alumni Network</p>
          </div>
        </div>
        <Link href="/login" className="text-white/60 hover:text-white text-sm font-semibold transition-colors">
          Back to Login
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden mt-16">
        {/* Background Glows */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-2xl relative z-10">
          
          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-12 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold font-[var(--font-heading)] mb-4">Application Received</h2>
              <p className="text-white/60 leading-relaxed mb-8">{success}</p>
              <div className="w-8 h-8 border-2 border-white/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
            </motion.div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="mb-12">
                <div className="flex justify-between relative">
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/10 -translate-y-1/2" />
                  <div 
                    className="absolute top-1/2 left-0 h-[2px] bg-[#D4AF37] -translate-y-1/2 transition-all duration-500 ease-out" 
                    style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                  />
                  {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = step.id === currentStep;
                    const isPassed = step.id < currentStep;
                    return (
                      <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isActive ? "bg-[#D4AF37] text-[#0A0F1C] shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-110" : 
                          isPassed ? "bg-white/20 text-white border border-white/30" : "bg-[#0A0F1C] text-white/30 border border-white/10"
                        }`}>
                          {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${isActive ? "text-[#D4AF37]" : "text-white/40"}`}>
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <motion.div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
                
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {currentStep === 1 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-2xl font-bold font-[var(--font-heading)] mb-2">Personal Details</h2>
                            <p className="text-white/50 text-sm mb-8">Let's start with the basics to verify your identity.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField label="Full Name" value={formData.name} onChange={(v) => updateForm("name", v)} required />
                            <InputField label="Mobile Number" type="tel" value={formData.phone} onChange={(v) => updateForm("phone", v)} required />
                          </div>
                          <InputField label="Email Address" type="email" value={formData.email} onChange={(v) => updateForm("email", v)} required />
                          <InputField label="Create Password" type="password" value={formData.password} onChange={(v) => updateForm("password", v)} required />
                        </div>
                      )}

                      {currentStep === 2 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-2xl font-bold font-[var(--font-heading)] mb-2">Academic Journey</h2>
                            <p className="text-white/50 text-sm mb-8">Tell us about your time at SSVM College Square.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField label="Batch Year" value={formData.batch} onChange={(v) => updateForm("batch", v)} placeholder="e.g. 2012" required />
                            <InputField label="Passing Year" value={formData.passingYear} onChange={(v) => updateForm("passingYear", v)} placeholder="e.g. 2014" required />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField label="Class Passed" value={formData.classPassed} onChange={(v) => updateForm("classPassed", v)} placeholder="10th / 12th" required />
                            <InputField label="School Branch" value={formData.branch} onChange={(v) => updateForm("branch", v)} placeholder="College Square" required />
                          </div>
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-2xl font-bold font-[var(--font-heading)] mb-2">Professional Experience</h2>
                            <p className="text-white/50 text-sm mb-8">Where are you working right now?</p>
                          </div>
                          <InputField label="Company / Organization" value={formData.company} onChange={(v) => updateForm("company", v)} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField label="Designation" value={formData.currentRole} onChange={(v) => updateForm("currentRole", v)} />
                            <InputField label="Industry" value={formData.industry} onChange={(v) => updateForm("industry", v)} placeholder="e.g. Technology, Medicine" />
                          </div>
                        </div>
                      )}

                      {currentStep === 4 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-2xl font-bold font-[var(--font-heading)] mb-2">Social Profiles</h2>
                            <p className="text-white/50 text-sm mb-8">Connect your professional profiles with the network.</p>
                          </div>
                          <InputField label="LinkedIn Profile" type="url" value={formData.linkedin} onChange={(v) => updateForm("linkedin", v)} placeholder="https://linkedin.com/in/..." />
                          <InputField label="GitHub Profile" type="url" value={formData.github} onChange={(v) => updateForm("github", v)} placeholder="https://github.com/..." />
                          <InputField label="Personal Portfolio" type="url" value={formData.portfolio} onChange={(v) => updateForm("portfolio", v)} placeholder="https://..." />
                        </div>
                      )}

                      {currentStep === 5 && (
                        <div className="space-y-5 text-center">
                          <div>
                            <h2 className="text-2xl font-bold font-[var(--font-heading)] mb-2">Profile Photo</h2>
                            <p className="text-white/50 text-sm mb-8">Upload a clear, professional photo for the directory.</p>
                          </div>
                          
                          <div className="flex justify-center mb-6">
                            <label className="relative w-40 h-40 rounded-full border-2 border-dashed border-[#D4AF37]/50 flex flex-col items-center justify-center cursor-pointer hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all overflow-hidden group">
                              {photo ? (
                                <img src={URL.createObjectURL(photo)} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <Camera className="w-8 h-8 text-[#D4AF37] mb-2" />
                                  <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Upload</span>
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setPhoto(e.target.files[0]);
                                  }
                                }}
                              />
                              {photo && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="text-xs text-white font-semibold">Change</span>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(p => Math.max(1, p - 1))}
                      className={`flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors ${currentStep === 1 ? 'invisible' : ''}`}
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading || (currentStep === 5 && !photo)}
                      className="flex items-center gap-2 py-3 px-8 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:from-[#F5D061] hover:to-[#FFDF73] text-[#0A0F1C] font-bold text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-[#0A0F1C]/30 border-t-[#0A0F1C] rounded-full animate-spin" />
                      ) : (
                        <>
                          {currentStep === 5 ? "Submit Application" : "Continue"}
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Input Component
function InputField({ label, value, onChange, type = "text", placeholder = "", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-white/70 text-xs font-semibold tracking-wide uppercase">
        {label} {required && <span className="text-[#D4AF37]">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all sm:text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}
