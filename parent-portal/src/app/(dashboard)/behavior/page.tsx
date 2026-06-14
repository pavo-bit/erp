"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  reporter: { name: string; role: string };
};

export default function ParentBehaviorTimeline() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        setError(res.error || "Failed to load behavior logs");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching logs");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (sev: string, type: string) => {
    if (type === "MERIT") return "🌟";
    switch(sev) {
      case "CRITICAL": return "🚨";
      case "HIGH": return "⚠️";
      case "MEDIUM": return "⚡";
      default: return "ℹ️";
    }
  };

  const getSeverityColor = (sev: string, type: string) => {
    if (type === "MERIT") return "from-emerald-400 to-green-500 shadow-emerald-500/30 text-emerald-800 bg-emerald-50 border-emerald-200";
    switch(sev) {
      case "CRITICAL": return "from-red-500 to-red-600 shadow-red-500/30 text-red-800 bg-red-50 border-red-200";
      case "HIGH": return "from-orange-400 to-orange-500 shadow-orange-500/30 text-orange-800 bg-orange-50 border-orange-200";
      case "MEDIUM": return "from-yellow-400 to-yellow-500 shadow-yellow-500/30 text-yellow-800 bg-yellow-50 border-yellow-200";
      default: return "from-gray-400 to-gray-500 shadow-gray-500/30 text-gray-800 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="text-center md:text-left mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Behavior Timeline</h1>
        <p className="text-gray-500">Track merits, disciplinary records, and official school actions.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col justify-center items-center h-48 space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-medium">Loading official records...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4 opacity-50">✨</div>
          <h3 className="text-xl font-bold text-gray-800">Excellent Record!</h3>
          <p className="text-gray-500 mt-2">No disciplinary infractions or incidents found.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-100 ml-4 md:ml-6 space-y-10 py-4">
          {incidents.map((incident, idx) => {
            const colors = getSeverityColor(incident.severity, incident.type);
            const bgClass = colors.split(' ').find(c => c.startsWith('bg-')) || 'bg-white';
            const borderClass = colors.split(' ').find(c => c.startsWith('border-')) || 'border-gray-200';
            
            return (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                key={incident.id} 
                className="relative pl-8 md:pl-10"
              >
                {/* Timeline Node */}
                <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${colors.split(' ')[0]} ${colors.split(' ')[1]} text-white text-sm shadow-lg ${colors.split(' ')[2]} border-2 border-white`}>
                  {getSeverityIcon(incident.severity, incident.type)}
                </div>

                <div className={`bg-white rounded-2xl p-6 shadow-sm border ${borderClass} hover:shadow-md transition-shadow`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{incident.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${bgClass} text-${colors.split('text-')[1]?.split(' ')[0]}`}>
                          {incident.type === "MERIT" ? "MERIT" : incident.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        Reported by {incident.reporter.name} • {new Date(incident.incidentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    
                    <div className="shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        incident.status === "RESOLVED" ? "bg-green-50 text-green-700 border-green-200" :
                        incident.status === "UNDER_INVESTIGATION" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}>
                        {incident.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 border border-gray-100 italic">
                    "{incident.description}"
                  </div>

                  {incident.status === "RESOLVED" && incident.actionTaken && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Official Resolution</h4>
                      <p className="text-sm text-gray-700 font-medium">{incident.actionTaken}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
