"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AlumniPortal() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Registration specific
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [batch, setBatch] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [company, setCompany] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/alumni/register";
      const payload = isLogin 
        ? { email, password }
        : { email, password, name, phone, batch, currentRole, company };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "An error occurred");
      }

      // Success!
      window.location.href = "/";
      
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 flex items-center justify-center relative overflow-hidden bg-[#0A1628]">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-[150px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Welcome Text */}
        <div className="text-center lg:text-left order-2 lg:order-1 mb-8 lg:mb-0 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6 uppercase tracking-[0.2em]">
              🎓 Alumni Network
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
              Welcome Back,<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                Proud Alumni
              </span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-md mx-auto lg:mx-0 mb-8">
              Reconnect with your roots, network with fellow graduates, and stay updated with your alma mater's ongoing journey of excellence.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto lg:mx-0">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm text-center">
                <div className="text-orange-400 text-3xl font-black mb-1">5k+</div>
                <div className="text-white/50 text-xs font-medium uppercase tracking-wider">Members</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm text-center">
                <div className="text-orange-400 text-3xl font-black mb-1">1987</div>
                <div className="text-white/50 text-xs font-medium uppercase tracking-wider">Founded</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
          >
            {/* Card internal gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full pointer-events-none" />

            {/* Tabs */}
            <div className="flex bg-black/20 p-1.5 rounded-2xl mb-8 relative z-10">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(""); }}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  isLogin ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg" : "text-white/50 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(""); }}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  !isLogin ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg" : "text-white/50 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center relative z-10">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "login" : "register"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {!isLogin && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Batch (Year)</label>
                          <input
                            type="text"
                            required
                            value={batch}
                            onChange={(e) => setBatch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="e.g. 2015"
                          />
                        </div>
                        <div>
                          <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Phone</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="+91..."
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Current Role</label>
                          <input
                            type="text"
                            value={currentRole}
                            onChange={(e) => setCurrentRole(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="Software Engineer"
                          />
                        </div>
                        <div>
                          <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Company</label>
                          <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition-all"
                            placeholder="Google"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="••••••••"
                    />
                    {!isLogin && (
                      <p className="text-white/40 text-[10px] mt-2">Must be at least 8 characters, with 1 uppercase and 1 number.</p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>{isLogin ? "Sign In to Portal" : "Join Alumni Network"}</span>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
