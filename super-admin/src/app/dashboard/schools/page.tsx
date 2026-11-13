"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Search, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";
import { useSchools } from "@/lib/api";

export default function SchoolsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: schoolsData, isLoading } = useSchools();

  const schools = Array.isArray(schoolsData)
    ? schoolsData.filter(
        (s: any) =>
          !searchTerm ||
          (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-8 pt-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4" /> Tenant Management
          </motion.div>
          <h1 className="text-[40px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-slate-400 font-[var(--font-heading)] leading-tight">
            School Network
          </h1>
          <p className="text-[15px] text-slate-400 mt-2 font-medium max-w-xl">
            Provision, monitor, and manage the isolated school environments deployed on the platform.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tenants..."
              className="pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading school tenants...</div>
        ) : schools.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No School Tenants Found</p>
            <p className="text-sm text-slate-500 mt-1">Provision a new school tenant via the SaaS Provisioning Wizard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <th className="p-6">Tenant Name</th>
                  <th className="p-6">Code</th>
                  <th className="p-6">Contact / Domain</th>
                  <th className="p-6">Status</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {schools.map((school: any) => (
                  <tr key={school.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-6 font-bold text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      {school.name}
                    </td>
                    <td className="p-6 font-mono text-sm text-slate-400">{school.code || "-"}</td>
                    <td className="p-6 text-sm text-slate-400">{school.email || school.domain || "Standard"}</td>
                    <td className="p-6">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {school.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-6 text-right space-x-3">
                      <Link
                        href={`/dashboard/schools/${school.id}/shifts`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" /> Configure Shifts
                      </Link>
                      <Link
                        href={`/dashboard/schools/${school.id}/modules`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
                      >
                        Manage Modules →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
