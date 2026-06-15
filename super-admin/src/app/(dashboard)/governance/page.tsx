"use client";

import { useState } from "react";
import { useDataRetentionPolicies, apiCall } from "@/lib/api";
import { ShieldAlert, Database, Trash2, Archive, Loader2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GovernanceDashboard() {
  const { data: policies, isLoading, mutate } = useDataRetentionPolicies();
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    schoolId: "",
    entityName: "AuditLog",
    retentionDays: 90,
    action: "PURGE"
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiCall("/api/v1/admin/governance-workflows/retention-policies", "POST", formData);
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 to-indigo-900 p-8 rounded-3xl text-white shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <ShieldAlert className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
            <Database className="w-10 h-10 text-indigo-400" />
            Enterprise Data Governance
          </h1>
          <p className="text-slate-300 max-w-2xl text-lg font-medium">
            Configure strict zero-trust data retention limits across all tenants. 
            Automated background workers will irreversibly purge data beyond these thresholds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Policy Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-indigo-500" />
              New Retention Policy
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Tenant (School ID)</label>
                <input 
                  required
                  value={formData.schoolId}
                  onChange={e => setFormData({...formData, schoolId: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all" 
                  placeholder="e.g. clx123..." 
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Target Entity</label>
                <select 
                  value={formData.entityName}
                  onChange={e => setFormData({...formData, entityName: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="AuditLog">AuditLog</option>
                  <option value="VisitorLog">VisitorLog</option>
                  <option value="LedgerEntry">LedgerEntry</option>
                  <option value="AdmissionEnquiry">AdmissionEnquiry</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Days to Retain</label>
                  <input 
                    type="number"
                    min="1"
                    value={formData.retentionDays}
                    onChange={e => setFormData({...formData, retentionDays: parseInt(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Action</label>
                  <select 
                    value={formData.action}
                    onChange={e => setFormData({...formData, action: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="PURGE">PURGE</option>
                    <option value="ARCHIVE">ARCHIVE</option>
                  </select>
                </div>
              </div>
              <Button disabled={isCreating} className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">
                {isCreating ? <Loader2 className="animate-spin w-5 h-5" /> : "Enforce Policy"}
              </Button>
            </form>
          </div>
        </div>

        {/* Policies List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                Active Policies
              </h2>
            </div>
            
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
            ) : policies?.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No retention policies configured.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {policies?.map((p: any) => (
                  <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${p.action === 'PURGE' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {p.action === 'PURGE' ? <Trash2 className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                          {p.entityName}
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            {p.schoolId.slice(0,8)}...
                          </span>
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">
                          Keep data for exactly <strong className="text-indigo-600 dark:text-indigo-400">{p.retentionDays} days</strong>, then {p.action.toLowerCase()}.
                        </p>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
