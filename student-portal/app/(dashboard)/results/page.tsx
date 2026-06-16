"use client";

import { useState } from "react";
import { useMyExams } from "@/lib/student-api-hooks";
import { motion } from "framer-motion";
import { Award, Calendar, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ResultsPage() {
  const { data: examsData, isLoading } = useMyExams("current-class"); // Replace with actual class ID logic or adjust API
  
  if (isLoading) return <div className="p-8 text-white">Loading results...</div>;

  const exams = examsData?.data || [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Examination Results</h1>
          <p className="text-white/60">View your academic performance and download report cards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam: any) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                  <Award className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                  Published
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{exam.name}</h3>
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <Link 
              href={`/results/${exam.id}`}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>View Report Card</span>
            </Link>
          </motion.div>
        ))}

        {exams.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white/5 border border-white/10 border-dashed">
            <Award className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No Results Yet</h3>
            <p className="text-white/60">No examination results have been published for your class.</p>
          </div>
        )}
      </div>
    </div>
  );
}
