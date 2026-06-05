"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Mail, Lock, ArrowRight, Sparkles, GraduationCap, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const successStories = [
  {
    name: "Dr. Ananya Sharma",
    batch: "Class of 2012",
    role: "AI Researcher at DeepMind",
    quote: "The foundation I built at SSVM shaped my entire scientific journey.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop"
  },
  {
    name: "Rahul Verma",
    batch: "Class of 2008",
    role: "Founder, TechNova Solutions",
    quote: "The discipline and values from my school days are the secret to my startup's success.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop"
  },
  {
    name: "Dr. Sandeep Dash",
    batch: "Class of 1999",
    role: "Chief Surgeon, Apollo Hospitals",
    quote: "Forever grateful to my teachers who saw my potential before I did.",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=800&auto=format&fit=crop"
  }
];

export default function PremiumAlumniLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState(0);
  
  const { login } = useAuth();
  const router = useRouter();

  // Auto-rotate stories
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStory((prev) => (prev + 1) % successStories.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push("/alumni");
      } else {
        setError(result.error || "Login failed");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex overflow-hidden font-[var(--font-body)]">
      {/* LEFT SIDE - Cinematic Storytelling (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStory}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${successStories[currentStory].image})` }}
          />
        </AnimatePresence>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0A0F1C]/20 to-[#0A0F1C]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F5D061] flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              <GraduationCap className="text-[#0A0F1C] w-6 h-6" />
            </div>
            <div>
              <h1 className="text-white font-[var(--font-heading)] font-bold text-xl tracking-wide">SSVM</h1>
              <p className="text-[#D4AF37] text-xs font-semibold tracking-widest uppercase">Alumni Network</p>
            </div>
          </motion.div>

          <div className="max-w-xl pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-white/80 text-sm font-medium">Inspiring Excellence Since 1987</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-white font-[var(--font-heading)] leading-tight mb-6">
                Where extraordinary <br />
                journeys <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5D061]">begin.</span>
              </h2>
            </motion.div>

            {/* Testimonial Carousel */}
            <div className="h-[140px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStory}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.6 }}
                  className="pl-6 border-l-2 border-[#D4AF37]/50"
                >
                  <p className="text-xl text-white/90 font-light italic leading-relaxed mb-4">
                    "{successStories[currentStory].quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/20">
                      <img src={successStories[currentStory].image} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">{successStories[currentStory].name}</h4>
                      <p className="text-white/60 text-xs">{successStories[currentStory].role} • {successStories[currentStory].batch}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-2 mt-8">
              {successStories.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentStory(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentStory ? "w-8 bg-[#D4AF37]" : "w-2 bg-white/20"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Premium Login Glassmorphism */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 relative">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F5D061] flex items-center justify-center shadow-lg">
              <GraduationCap className="text-[#0A0F1C] w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-[var(--font-heading)] font-bold text-lg tracking-wide">SSVM</h1>
              <p className="text-[#D4AF37] text-[10px] font-semibold tracking-widest uppercase">Alumni Network</p>
            </div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white font-[var(--font-heading)] mb-2">Welcome Back</h2>
              <p className="text-white/50 text-sm">Sign in to your premium alumni account.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
              >
                <div className="text-red-400 mt-0.5">⚠️</div>
                <p className="text-red-400 text-sm font-medium leading-relaxed">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-white/70 text-xs font-semibold tracking-wide uppercase">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all sm:text-sm"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-white/70 text-xs font-semibold tracking-wide uppercase">Password</label>
                  <a href="#" className="text-[#D4AF37] hover:text-[#F5D061] text-xs font-medium transition-colors">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="remember"
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#D4AF37] focus:ring-[#D4AF37]/50 focus:ring-offset-0"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="remember" className="text-white/60 font-medium cursor-pointer hover:text-white transition-colors">
                      Remember me for 30 days
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-[#0A0F1C] bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:from-[#F5D061] hover:to-[#FFDF73] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0F1C] focus:ring-[#D4AF37] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group mt-6"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#0A0F1C]/30 border-t-[#0A0F1C] rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-[#0A0F1C] text-white/50 uppercase tracking-widest font-semibold rounded-full">Or</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Continue with Google
            </button>

          </div>

          <p className="mt-8 text-center text-sm text-white/60">
            Don't have an alumni account?{" "}
            <Link href="/register" className="text-[#D4AF37] hover:text-[#F5D061] font-semibold transition-colors">
              Apply for Network Access
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
