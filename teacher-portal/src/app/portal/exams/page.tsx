"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiCall } from "@/lib/api-hooks";
import { Loader2, CheckCircle2, Save, Users, BookOpen } from "lucide-react";

interface Exam {
  id: string;
  name: string;
  classId: string | null;
  startDate: string | null;
}

interface StudentMarkInput {
  studentId: string;
  name: string;
  rollNo: string;
  marksObtained: number;
  grade: string;
}

export default function ExamsGradingPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // For the grid state
  const [studentsData, setStudentsData] = useState<StudentMarkInput[]>([
    { studentId: "std_101", name: "Aarav Sharma", rollNo: "10", marksObtained: 0, grade: "" },
    { studentId: "std_102", name: "Diya Patel", rollNo: "12", marksObtained: 0, grade: "" },
    { studentId: "std_103", name: "Rohan Gupta", rollNo: "25", marksObtained: 0, grade: "" },
    { studentId: "std_104", name: "Meera Reddy", rollNo: "32", marksObtained: 0, grade: "" },
  ]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await apiCall("/api/v1/exams", "GET");
      if (res.success && res.data) {
        setExams(res.data);
        if (res.data.length > 0) setSelectedExamId(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId: string, value: string) => {
    const val = parseInt(value, 10);
    if (isNaN(val)) return;

    setStudentsData(prev => prev.map(s => {
      if (s.studentId === studentId) {
        let grade = "F";
        if (val >= 90) grade = "A+";
        else if (val >= 80) grade = "A";
        else if (val >= 70) grade = "B";
        else if (val >= 60) grade = "C";
        else if (val >= 50) grade = "D";
        
        return { ...s, marksObtained: val, grade };
      }
      return s;
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedExamId) return;
    setSaving(true);
    setSuccess(false);

    try {
      // Map frontend state to backend batch UPSERT requirement
      const payload = studentsData.map(s => ({
        studentId: s.studentId,
        marksObtained: s.marksObtained,
        theoryMarksObtained: s.marksObtained,
        grade: s.grade,
      }));

      const res = await apiCall(`/api/v1/exams/${selectedExamId}/marks`, "POST", { marks: payload });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      alert("Failed to save marks. Check your connection or permissions.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
            <BookOpen className="text-teal-600" /> Academic Examination Engine
          </h1>
          <p className="text-slate-500 mt-1">Batch input student marks and sync directly to the immutable academic ledger.</p>
        </div>
        
        {exams.length > 0 && (
          <select 
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.name} {e.startDate ? `(${new Date(e.startDate).toLocaleDateString()})` : ''}</option>
            ))}
          </select>
        )}
      </div>

      {exams.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center">
          <p className="text-slate-500">No active exams found for your assigned subjects.</p>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Users className="w-5 h-5 text-teal-500" />
              Class Roster: Mathematics (Class X-A)
            </div>
            
            <button 
              onClick={handleSaveMarks}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-sm font-bold flex items-center shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-70"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Committing...</>
              ) : success ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved successfully</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Commit Batch Marks</>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Roll No</th>
                  <th className="p-4 font-semibold">Student Name</th>
                  <th className="p-4 font-semibold text-right w-48">Marks Obtained (/100)</th>
                  <th className="p-4 font-semibold text-center w-32">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsData.map((student, i) => (
                  <motion.tr 
                    key={student.studentId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-teal-50/30 transition-colors group"
                  >
                    <td className="p-4 font-mono text-sm text-slate-500">{student.rollNo}</td>
                    <td className="p-4 font-medium text-slate-800">{student.name}</td>
                    <td className="p-4 text-right">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={student.marksObtained || ''}
                        onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                        className="w-24 px-3 py-1.5 text-right border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-mono transition-all group-hover:border-teal-300 bg-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-md font-bold text-xs ${
                        student.grade === 'A+' || student.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                        student.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                        student.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                        student.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                        student.grade === 'F' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {student.grade || '-'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
      )}
    </div>
  );
}
