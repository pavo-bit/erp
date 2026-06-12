"use client";

import { useState } from "react";
import { BookOpen, Calendar, Clock, CheckCircle2, FileText, ChevronRight, AlertCircle, PlayCircle, Download } from "lucide-react";

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  const assignments = [
    { id: 1, title: "Algebra Linear Equations Worksheet", subject: "Mathematics", dueDate: "Tomorrow, 11:59 PM", status: "pending", type: "homework", attachments: 1 },
    { id: 2, title: "Photosynthesis Diagram & Short Essay", subject: "Science", dueDate: "Oct 18, 11:59 PM", status: "pending", type: "assignment", attachments: 2 },
    { id: 3, title: "History Chapter 4 Reading", subject: "Social Studies", dueDate: "Oct 20, 08:00 AM", status: "pending", type: "reading", attachments: 0 },
    { id: 4, title: "Grammar Exercises Pg 45", subject: "English", dueDate: "Oct 10, 11:59 PM", status: "completed", grade: "9/10", feedback: "Good effort. Pay attention to comma splices.", type: "homework" }
  ];

  const studyMaterials = [
    { id: 1, title: "Trigonometry Basics Video", subject: "Mathematics", type: "video" },
    { id: 2, title: "Physics Chapter 5 Notes", subject: "Science", type: "pdf" },
    { id: 3, title: "English Grammar Revision", subject: "English", type: "document" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Assignments & Homework</h1>
        <p className="text-slate-500 dark:text-slate-400">Track pending tasks, view study materials, and monitor completed work.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab("pending")}
              className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === "pending" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Pending Tasks <span className="ml-1.5 inline-flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full w-5 h-5">3</span>
            </button>
            <button 
              onClick={() => setActiveTab("completed")}
              className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === "completed" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Completed
            </button>
          </div>

          <div className="space-y-4">
            {assignments.filter(a => a.status === activeTab).map((item) => (
              <div key={item.id} className="glass-card p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer group">
                <div className="flex items-start">
                  <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mr-4 ${
                    item.status === "completed" 
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {item.status === "completed" ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">{item.subject}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">{item.type}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h3>
                    
                    {item.status === "pending" ? (
                      <div className="flex items-center mt-2 text-sm text-slate-600 dark:text-slate-400">
                        <Clock size={14} className="mr-1.5 text-amber-500" /> 
                        <span className="font-medium text-amber-600 dark:text-amber-500">Due: {item.dueDate}</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Grade: {item.grade}</span>
                        <p className="text-slate-600 dark:text-slate-400 mt-1 italic">"{item.feedback}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {item.status === "pending" && (
                  <div className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center justify-center transition-colors">
                      View Details <ChevronRight size={16} className="ml-1" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6 bg-gradient-to-br from-amber-500 to-orange-600 border-none text-white shadow-xl shadow-amber-500/20">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center">
                <AlertCircle size={20} className="mr-2" /> Action Required
              </h2>
            </div>
            <p className="text-amber-50 text-sm mb-4 leading-relaxed">
              Aarav has a Math assignment due tomorrow. Please ensure he submits it before 11:59 PM to avoid late penalties.
            </p>
            <button className="w-full py-2.5 bg-white text-amber-600 hover:bg-amber-50 rounded-lg text-sm font-bold transition-colors">
              Remind Aarav
            </button>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Recent Study Material</h3>
            <div className="space-y-4">
              {studyMaterials.map(mat => (
                <div key={mat.id} className="flex items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 shrink-0 ${
                    mat.type === 'video' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                    mat.type === 'pdf' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 
                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                  }`}>
                    {mat.type === 'video' ? <PlayCircle size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{mat.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{mat.subject}</p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <Download size={18} />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              View Study Material Library
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
