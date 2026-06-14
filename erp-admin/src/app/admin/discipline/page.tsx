"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiCall } from "@/lib/api-hooks";

type Incident = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  incidentDate: string;
  actionTaken: string | null;
  student: { admissionNo: string; user?: { name: string } };
  reporter: { name: string; role: string };
};

export default function DisciplineDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await apiCall("/api/v1/discipline/incidents", "GET");
      if (res.success) {
        setIncidents(res.data);
      } else {
        setError(res.error || "Failed to load incidents");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching incidents");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveClick = (incident: Incident) => {
    setActiveIncident(incident);
    setActionTaken(incident.actionTaken || "");
    setIsResolveModalOpen(true);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident) return;
    
    try {
      setSubmitting(true);
      const res = await apiCall(`/api/v1/discipline/incidents/${activeIncident.id}/resolve`, "PUT", {
        status: "RESOLVED",
        actionTaken
      });
      
      if (res.success) {
        setIsResolveModalOpen(false);
        setActiveIncident(null);
        fetchIncidents(); // refresh
      } else {
        alert(res.error || "Failed to resolve incident");
      }
    } catch (err: any) {
      alert(err.message || "Error resolving incident");
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const map: Record<string, string> = {
      CRITICAL: "bg-red-100 text-red-800 border-red-200 shadow-red-500/20",
      HIGH: "bg-orange-100 text-orange-800 border-orange-200 shadow-orange-500/20",
      MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200 shadow-yellow-500/20",
      LOW: "bg-gray-100 text-gray-800 border-gray-200 shadow-gray-500/20",
    };
    const style = map[severity] || map.LOW;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm tracking-wide ${style}`}>
        {severity}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "RESOLVED": return <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-200">Resolved</span>;
      case "UNDER_INVESTIGATION": return <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-xs font-semibold border border-blue-200">Investigating</span>;
      default: return <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md text-xs font-semibold border border-amber-200">Open</span>;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-600/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-xl shadow-lg shadow-red-500/20">
               ⚖️
            </span>
            Discipline & Incidents
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Investigate student behavioral reports and issue official resolutions.</p>
        </div>
        <button className="bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-semibold transition-all">
          Generate Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        {[
          { label: "Total Open", val: incidents.filter(i => i.status === "OPEN").length, color: "from-amber-400 to-amber-600" },
          { label: "Critical Priority", val: incidents.filter(i => i.severity === "CRITICAL" && i.status !== "RESOLVED").length, color: "from-red-500 to-red-700" },
          { label: "Under Investigation", val: incidents.filter(i => i.status === "UNDER_INVESTIGATION").length, color: "from-blue-400 to-indigo-600" },
          { label: "Resolved (30d)", val: incidents.filter(i => i.status === "RESOLVED").length, color: "from-emerald-400 to-teal-600" }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="text-slate-500 text-sm font-semibold mb-2">{stat.label}</div>
            <div className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
              {loading ? "-" : stat.val}
            </div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative z-10">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Incident Registry</h3>
          <input 
            type="text" 
            placeholder="Search incident..." 
            className="text-sm px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all w-64 bg-white"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 border-b border-red-100 font-medium text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold border-b border-slate-100">Date</th>
                <th className="px-6 py-4 font-semibold border-b border-slate-100">Severity</th>
                <th className="px-6 py-4 font-semibold border-b border-slate-100">Student & Title</th>
                <th className="px-6 py-4 font-semibold border-b border-slate-100">Reporter</th>
                <th className="px-6 py-4 font-semibold border-b border-slate-100">Status</th>
                <th className="px-6 py-4 font-semibold border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading secure incident logs...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No incidents reported yet.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(incident.incidentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSeverityBadge(incident.severity)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{incident.title}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="font-medium">#{incident.student?.admissionNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{incident.reporter.name}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider">{incident.reporter.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(incident.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {incident.status !== "RESOLVED" ? (
                        <button 
                          onClick={() => handleResolveClick(incident)}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-800 transition-colors transform active:scale-95"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleResolveClick(incident)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                        >
                          View Logs
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Modal */}
      <AnimatePresence>
        {isResolveModalOpen && activeIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsResolveModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Issue Resolution</h2>
                    <p className="text-red-100 text-sm">Actioning incident: {activeIncident.title}</p>
                  </div>
                  <button onClick={() => setIsResolveModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleResolveSubmit} className="p-6">
                <div className="mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Original Report</h4>
                  <p className="text-sm text-slate-700 italic border-l-2 border-red-300 pl-3">
                    "{activeIncident.description}"
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Resolution Action Taken</label>
                    <textarea 
                      required
                      value={actionTaken}
                      onChange={e => setActionTaken(e.target.value)}
                      disabled={activeIncident.status === "RESOLVED"}
                      placeholder="Detail the disciplinary measures, parent meetings, or counseling applied..."
                      className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all text-sm h-32 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  
                  {activeIncident.status !== "RESOLVED" && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs font-medium flex items-start gap-2">
                      <span className="mt-0.5">⚠️</span>
                      <p>Resolving this incident will push an immutable event to the outbox, which may trigger an automated notification to the registered guardians.</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsResolveModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    {activeIncident.status === "RESOLVED" ? "Close" : "Cancel"}
                  </button>
                  {activeIncident.status !== "RESOLVED" && (
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
                    >
                      {submitting ? "Resolving..." : "Confirm Resolution"}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
