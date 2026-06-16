"use client";

import { motion } from "framer-motion";
import { Building2, Plus, Search, ShieldCheck } from "lucide-react";

export default function SchoolsPage() {
  return (
    <div className="p-6 lg:p-12 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4" /> Tenant Management
          </motion.div>
          <h1 className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-slate-400 font-[var(--font-heading)] leading-tight">
            School Network
          </h1>
          <p className="text-[15px] text-slate-400 mt-2 font-medium max-w-xl">
            Provision, monitor, and manage the isolated school environments deployed on the Greyscales network.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              placeholder="Search tenants..."
              className="pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 w-64 transition-all"
            />
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-5 h-5" /> Deploy Tenant
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="p-6">Tenant Name</th>
                <th className="p-6">Code</th>
                <th className="p-6">Location</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {[
                { name: "SSVM College Square", code: "SSVM_CS", loc: "Cuttack", status: "ONLINE" },
                { name: "Greyscales Demo Academy", code: "DEMO_01", loc: "Virtual", status: "MAINTENANCE" }
              ].map((school, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-white text-base">{school.name}</span>
                    </div>
                  </td>
                  <td className="p-6 font-mono text-sm text-slate-400">{school.code}</td>
                  <td className="p-6 text-sm text-slate-400 font-medium">{school.loc}</td>
                  <td className="p-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold tracking-widest ${
                      school.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${school.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {school.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
