"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export default function GlobalSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("branding");
  
  const [brandingForm, setBrandingForm] = useState({
    themeMode: "DARK_PREMIUM",
    primaryColor: "#a855f7",
    logoUrl: "https://greyscales.io/logo.png",
  });

  const [featuresForm, setFeaturesForm] = useState({
    enableAIInsights: true,
    enableCryptoPayments: false,
    enforceMFA: true,
    betaTransportV2: false,
  });

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Global Branding Saved Successfully. All tenants will receive these fallback defaults.");
  };

  const handleSaveFeatures = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Feature Flags Updated. Nodes are restarting...");
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-dark)] text-[var(--color-text-primary)] selection:bg-[var(--color-primary)]">
      
      {/* Background glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Main Content Area - Note: Sidebar is on Layout in real app, assuming Layout wraps this */}
      <main className="flex-1 lg:ml-[280px] pt-[80px] lg:pt-8 pb-12 min-h-screen relative z-10">
        <div className="px-6 lg:px-12 max-w-[1200px] mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Core Active
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-[var(--color-text-secondary)] font-[var(--font-heading)] leading-tight">
                System Core
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[15px] text-[var(--color-text-secondary)] mt-2 font-medium max-w-xl">
                Global configurations, fallback white-labeling, and feature toggles for the entire SaaS network.
              </motion.p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-8 border-b border-[var(--color-border-dark)] overflow-x-auto pb-px">
            {["branding", "features", "security", "webhooks"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-3 text-[14px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap
                  ${activeTab === tab ? "text-emerald-400" : "text-[var(--color-text-secondary)] hover:text-white"}`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content: Branding */}
          {activeTab === "branding" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleSaveBranding} className="rounded-[1.5rem] p-8 relative overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-dark)" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 pointer-events-none" />
                <div className="relative z-10">
                  <h3 className="text-[20px] font-black text-white font-[var(--font-heading)] mb-6 flex items-center gap-2">
                    <span className="text-emerald-400">🎨</span> Fallback White Labeling
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Platform Theme Engine</label>
                      <select 
                        value={brandingForm.themeMode} onChange={e => setBrandingForm({ ...brandingForm, themeMode: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl text-[14px] font-medium text-white outline-none bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] focus:border-emerald-500 transition-colors appearance-none">
                        <option value="DARK_PREMIUM">Greyscales Ultra Dark (Default)</option>
                        <option value="LIGHT_CLASSIC">Classic Light</option>
                        <option value="GLASSMORPHISM">Dynamic Glassmorphism</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Global Primary Hex Color</label>
                      <div className="flex items-center gap-4">
                        <input type="color" value={brandingForm.primaryColor} onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })} className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer" />
                        <input type="text" value={brandingForm.primaryColor} onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })} className="flex-1 px-4 py-3.5 rounded-xl text-[14px] font-medium text-white outline-none bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] focus:border-emerald-500 transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Fallback Global Logo URL</label>
                      <input type="url" value={brandingForm.logoUrl} onChange={e => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })} className="w-full px-4 py-3.5 rounded-xl text-[14px] font-medium text-white outline-none bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] focus:border-emerald-500 transition-colors" />
                    </div>

                    <button type="submit" className="w-full mt-4 px-6 py-3.5 rounded-xl text-[14px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-transform">
                      Save Global Branding
                    </button>
                  </div>
                </div>
              </form>

              {/* Preview Card */}
              <div className="rounded-[1.5rem] p-8 flex flex-col items-center justify-center relative overflow-hidden border border-dashed border-[var(--color-border-dark)]">
                <h4 className="text-[12px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest absolute top-6 left-6">Live Preview</h4>
                <div className="w-full max-w-[300px] h-[400px] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden" style={{ background: brandingForm.themeMode === 'LIGHT_CLASSIC' ? '#ffffff' : '#0a0a0a' }}>
                  <div className="absolute top-0 left-0 right-0 h-32 opacity-20" style={{ background: `linear-gradient(to bottom, ${brandingForm.primaryColor}, transparent)` }} />
                  <div className="relative z-10 flex flex-col items-center pt-12">
                    <div className="w-16 h-16 rounded-2xl mb-4 shadow-lg flex items-center justify-center text-2xl bg-[var(--color-bg-card)] border border-white/10">
                      🔮
                    </div>
                    <div className="text-lg font-black tracking-widest uppercase font-[var(--font-heading)]" style={{ color: brandingForm.themeMode === 'LIGHT_CLASSIC' ? '#000' : '#fff' }}>Greyscales</div>
                    <div className="mt-8 w-[80%] h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-lg" style={{ background: brandingForm.primaryColor }}>Login</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab Content: Feature Flags */}
          {activeTab === "features" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleSaveFeatures} className="rounded-[1.5rem] p-8 relative overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-dark)" }}>
                <h3 className="text-[20px] font-black text-white font-[var(--font-heading)] mb-6 flex items-center gap-2">
                  <span className="text-teal-400">⚡</span> Global Feature Flags
                </h3>
                <div className="space-y-4">
                  {Object.entries(featuresForm).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)]">
                      <div>
                        <div className="text-[14px] font-bold text-white">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                        <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">Globally override configuration for all tenant nodes.</div>
                      </div>
                      <button type="button" onClick={() => setFeaturesForm({ ...featuresForm, [key]: !value })} className={`w-12 h-6 rounded-full relative transition-colors ${value ? 'bg-teal-500' : 'bg-gray-700'}`}>
                        <motion.div layout className={`w-4 h-4 rounded-full bg-white absolute top-1 ${value ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                  <button type="submit" className="w-full mt-6 px-6 py-3.5 rounded-xl text-[14px] font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-500 shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:scale-[1.02] transition-transform">
                    Deploy Feature Changes
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
