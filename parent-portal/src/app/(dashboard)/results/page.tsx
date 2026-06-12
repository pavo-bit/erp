"use client";

import { useState } from "react";
import { GraduationCap, Download, Trophy, FileText, ChevronDown } from "lucide-react";

export default function ResultsPage() {
  const [selectedChild, setSelectedChild] = useState(1);
  const [expandedExam, setExpandedExam] = useState<number | null>(1);

  const children = [
    { id: 1, name: "Aarav Sharma", class: "Class X-A" },
    { id: 2, name: "Diya Sharma", class: "Class VIII-B" }
  ];

  const exams = [
    {
      id: 1,
      name: "Term 1 Final Examination",
      date: "September 2026",
      percentage: "92.5%",
      grade: "A+",
      status: "published",
      subjects: [
        { name: "Mathematics", marks: 95, total: 100, grade: "A+" },
        { name: "Science", marks: 88, total: 100, grade: "A" },
        { name: "English", marks: 92, total: 100, grade: "A+" },
        { name: "Social Studies", marks: 89, total: 100, grade: "A" },
        { name: "Hindi", marks: 98, total: 100, grade: "A+" }
      ],
      remarks: "Excellent performance. Keep up the good work!"
    },
    {
      id: 2,
      name: "Unit Test 1",
      date: "July 2026",
      percentage: "88.0%",
      grade: "A",
      status: "published",
      subjects: [
        { name: "Mathematics", marks: 42, total: 50, grade: "A" },
        { name: "Science", marks: 45, total: 50, grade: "A+" },
        { name: "English", marks: 40, total: 50, grade: "B+" },
        { name: "Social Studies", marks: 44, total: 50, grade: "A" },
        { name: "Hindi", marks: 49, total: 50, grade: "A+" }
      ],
      remarks: "Good effort, needs a little more focus on English."
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Results & Marks</h1>
          <p className="text-slate-500 dark:text-slate-400">View performance reports and download digital report cards.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedChild === child.id 
                  ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Results List */}
        <div className="lg:col-span-2 space-y-6">
          {exams.map(exam => (
            <div key={exam.id} className="glass-card overflow-hidden">
              <div 
                className="p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                onClick={() => setExpandedExam(expandedExam === exam.id ? null : exam.id)}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mr-4">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{exam.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{exam.date}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 sm:ml-auto">
                  <div className="text-right">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Percentage</div>
                    <div className="font-bold text-lg text-slate-900 dark:text-slate-100">{exam.percentage}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Grade</div>
                    <div className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{exam.grade}</div>
                  </div>
                  <button className={`p-2 rounded-full transition-transform ${expandedExam === exam.id ? "rotate-180 bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                    <ChevronDown size={20} className="text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedExam === exam.id && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-6 animate-slide-up">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 dark:text-slate-400 text-sm">Subject</th>
                          <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 dark:text-slate-400 text-sm text-right">Marks Obtained</th>
                          <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 dark:text-slate-400 text-sm text-right">Total Marks</th>
                          <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 dark:text-slate-400 text-sm text-right">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {exam.subjects.map((sub, idx) => (
                          <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4 font-medium">{sub.name}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{sub.marks}</td>
                            <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">{sub.total}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-block px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                                {sub.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="mb-4 sm:mb-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Class Teacher Remarks</p>
                      <p className="text-sm font-medium italic text-slate-700 dark:text-slate-300">"{exam.remarks}"</p>
                    </div>
                    <button className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center transition-colors shadow-md shadow-indigo-500/20">
                      <Download size={16} className="mr-2" />
                      Download Report Card
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="glass-card p-6 bg-gradient-to-br from-indigo-600 to-purple-700 border-none text-white shadow-xl shadow-indigo-600/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Overall Rank</h2>
              <Trophy size={24} className="text-yellow-300 drop-shadow-md" />
            </div>
            <div className="text-4xl font-black mb-2 flex items-baseline">
              3<span className="text-lg font-medium ml-1 text-indigo-200">/ 45</span>
            </div>
            <p className="text-sm text-indigo-100">Top 10% of the class! Outstanding performance across all major subjects.</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Subject Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Strongest Subject</span>
                  <span className="font-bold text-emerald-600">Hindi (98%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full w-[98%]"></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Needs Improvement</span>
                  <span className="font-bold text-amber-500">Science (88%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full w-[88%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
