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
  student: { id: string; admissionNo: string; user?: { name: string } };
};

export default function TeacherDiscipline() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [students, setStudents] = useState<any[]>([]); // simplified for this example
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("INFRACTION");
  const [severity, setSeverity] = useState("LOW");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIncidents();
    fetchStudents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await apiCall("/api/v1/discipline/incidents", "GET");
      if (res.success) setIncidents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // Fetch students for the dropdown
      const res = await apiCall("/api/v1/students?limit=100", "GET");
      if (res.success) setStudents(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiCall("/api/v1/discipline/incidents", "POST", {
        studentId, type, severity, title, description, incidentDate: new Date().toISOString()
      });
      if (res.success) {
        setIsModalOpen(false);
        fetchIncidents();
        // reset
        setStudentId(""); setTitle(""); setDescription("");
      } else {
        alert(res.error || "Failed to log incident");
      }
    } catch (err: any) {
      alert(err.message || "Error logging incident");
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    const map: any = { CRITICAL: "bg-red-100 text-red-700", HIGH: "bg-orange-100 text-orange-700", MEDIUM: "bg-yellow-100 text-yellow-700", LOW: "bg-gray-100 text-gray-700" };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${map[sev] || map.LOW}`}>{sev}</span>;
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white shadow-lg">⚖️</span>
            My Disciplinary Reports
          </h1>
          <p className="text-gray-500 mt-1">Log merits and infractions for students in your classes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2"
        >
          <span>+</span> Log New Incident
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student & Report</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading your reports...</td></tr>
              ) : incidents.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No reports filed yet.</td></tr>
              ) : incidents.map(inc => (
                <tr key={inc.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(inc.incidentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">{getSeverityBadge(inc.severity)}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800">{inc.title}</div>
                    <div className="text-xs text-gray-500">Student ID: #{inc.student?.admissionNo}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      inc.status === "RESOLVED" ? "bg-green-100 text-green-700" : 
                      inc.status === "UNDER_INVESTIGATION" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logging Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900">File Disciplinary Report</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Student</label>
                  <select required value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 text-sm">
                    <option value="">Select Student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.user?.name} ({s.admissionNo})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 text-sm">
                      <option value="INFRACTION">Infraction</option>
                      <option value="MERIT">Merit / Reward</option>
                      <option value="ACADEMIC_VIOLATION">Academic Violation</option>
                      <option value="SAFETY">Safety Concern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Severity</label>
                    <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 text-sm">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Incident Title</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g., Disruption in class" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Detailed Description</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide specific details of the incident..." className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 text-sm h-24 resize-none" />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-sm disabled:opacity-70">
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
