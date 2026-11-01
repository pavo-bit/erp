"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ShieldCheck, Zap, Users, BarChart3, Database } from "lucide-react";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <main className="min-h-screen bg-noise relative">
      {/* Abstract Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gold-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-brown-800/30 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 glass-panel border-b-0 border-gold-400/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-bold text-brown-950 text-xl shadow-[0_0_20px_rgba(232,176,62,0.3)]">
              G
            </div>
            <span className="text-xl font-bold tracking-widest uppercase text-gradient-gold">Greyscales</span>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 rounded-full border border-gold-500/50 text-gold-400 font-semibold hover:bg-gold-500 hover:text-brown-950 transition-all duration-300 shadow-[0_0_15px_rgba(232,176,62,0.1)]"
          >
            Request Access
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-6 border-gold-500/20">
              <ShieldCheck className="w-4 h-4 text-gold-400" />
              <span className="text-sm text-gold-400/80 font-medium tracking-wide">Enterprise-Grade Education Platform</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              The Next Era of <br/>
              <span className="text-gradient-gold">School Management</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-xl leading-relaxed">
              Greyscales delivers an uncompromising, ultra-premium ERP experience. Unite your administration, teachers, and parents under one seamlessly engineered masterpiece.
            </p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-gold-400 to-gold-600 text-brown-950 rounded-full font-bold text-lg flex items-center gap-2 shadow-[0_0_30px_rgba(232,176,62,0.3)] hover:shadow-[0_0_40px_rgba(232,176,62,0.5)] transition-shadow"
            >
              Transform Your School <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Hero Visual Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="glass-panel p-4 rounded-3xl aspect-square relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="w-full h-full border border-gold-500/20 rounded-2xl flex items-center justify-center bg-brown-900/50">
                {/* Abstract Data Viz */}
                <div className="relative w-3/4 h-3/4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border border-gold-500/20 rounded-full border-dashed" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute inset-8 border border-gold-400/30 rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full blur-[20px] opacity-20" />
                    <BarChart3 className="w-16 h-16 text-gold-400 absolute" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto border-t border-gold-500/10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gradient-gold">Uncompromising Features</h2>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">Every module is crafted to absolute perfection, ensuring high performance and absolute reliability.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "Lightning Fast", desc: "Built on Edge infrastructure for sub-100ms response times globally." },
            { icon: ShieldCheck, title: "Military Grade", desc: "End-to-end encryption with advanced role-based access controls." },
            { icon: Users, title: "Multi-Tenant Architecture", desc: "Perfect isolation of data across multiple school branches." },
            { icon: Database, title: "Live Activity Streams", desc: "Real-time updates powered by Redis Server-Sent Events." }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-panel p-8 rounded-3xl hover:border-gold-400/30 transition-colors group"
            >
              <div className="w-12 h-12 bg-brown-800 rounded-2xl flex items-center justify-center mb-6 border border-gold-500/20 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-neutral-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center border-t border-gold-500/10">
        <p className="text-neutral-500 text-sm">© {new Date().getFullYear()} Greyscales Agency. Elite Software Solutions.</p>
      </footer>

      {/* Registration Modal */}
      <RegistrationModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </main>
  );
}

function RegistrationModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [form, setForm] = useState({ schoolName: "", principalName: "", email: "", phone: "", expectedStudents: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchWithCsrf = async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const token = window.sessionStorage.getItem("csrfToken");
    if (token && !["GET", "HEAD", "OPTIONS"].includes((init.method || "GET").toUpperCase())) headers.set("X-CSRF-Token", token);
    const response = await fetch(url, { ...init, headers, credentials: "include" });
    const responseToken = response.headers.get("X-CSRF-Token");
    if (responseToken) window.sessionStorage.setItem("csrfToken", responseToken);
    return response;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithCsrf("/api/v1/saas/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl glass-panel border border-gold-500/30 p-8 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            {/* Modal Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-600/20 rounded-full blur-[80px] pointer-events-none" />

            {success ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(232,176,62,0.4)]">
                  <ShieldCheck className="w-10 h-10 text-brown-950" />
                </div>
                <h2 className="text-3xl font-bold text-gradient-gold mb-4">Request Submitted</h2>
                <p className="text-neutral-400 mb-8">Our executive team will review your application. You will receive provision access shortly.</p>
                <button onClick={onClose} className="px-8 py-3 rounded-full border border-gold-500/50 text-gold-400 hover:bg-gold-500 hover:text-brown-950 transition-colors">
                  Close Window
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Request Access</h2>
                  <p className="text-neutral-400">Join the elite network of institutions powered by Greyscales.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gold-400/80 font-bold mb-2">Institution Name</label>
                      <input required type="text" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})}
                        className="w-full bg-brown-900/50 border border-gold-500/20 rounded-xl px-4 py-3 text-white outline-none focus:border-gold-400 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gold-400/80 font-bold mb-2">Principal Name</label>
                      <input required type="text" value={form.principalName} onChange={e => setForm({...form, principalName: e.target.value})}
                        className="w-full bg-brown-900/50 border border-gold-500/20 rounded-xl px-4 py-3 text-white outline-none focus:border-gold-400 transition-colors" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gold-400/80 font-bold mb-2">Official Email</label>
                      <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                        className="w-full bg-brown-900/50 border border-gold-500/20 rounded-xl px-4 py-3 text-white outline-none focus:border-gold-400 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gold-400/80 font-bold mb-2">Contact Phone</label>
                      <input required type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                        className="w-full bg-brown-900/50 border border-gold-500/20 rounded-xl px-4 py-3 text-white outline-none focus:border-gold-400 transition-colors" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gold-400/80 font-bold mb-2">Expected Students</label>
                      <input required type="number" value={form.expectedStudents} onChange={e => setForm({...form, expectedStudents: e.target.value})}
                        className="w-full bg-brown-900/50 border border-gold-500/20 rounded-xl px-4 py-3 text-white outline-none focus:border-gold-400 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gold-400/80 font-bold mb-2">City / Location</label>
                      <input required type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                        className="w-full bg-brown-900/50 border border-gold-500/20 rounded-xl px-4 py-3 text-white outline-none focus:border-gold-400 transition-colors" />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-4">
                    <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white px-4 py-2 transition-colors">Cancel</button>
                    <button type="submit" disabled={loading}
                      className="px-8 py-3 bg-gradient-to-r from-gold-400 to-gold-600 text-brown-950 font-bold rounded-xl shadow-[0_0_20px_rgba(232,176,62,0.3)] hover:shadow-[0_0_30px_rgba(232,176,62,0.5)] transition-shadow disabled:opacity-50">
                      {loading ? "Submitting..." : "Submit Application"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
