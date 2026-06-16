"use client";

import { useMyBooks } from "@/lib/student-api-hooks";
import { Book, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function LibraryPage() {
  const { data: booksData, isLoading } = useMyBooks("current-student-id");
  
  if (isLoading) return <div className="p-8 text-white">Loading library records...</div>;

  const issuedBooks = booksData?.data || [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
        <p className="text-white/60">Track your issued books and due dates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {issuedBooks.map((issue: any) => {
          const isOverdue = new Date() > new Date(issue.dueDate) && issue.status !== "RETURNED";
          
          return (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-2xl border backdrop-blur-md relative overflow-hidden ${
                isOverdue 
                  ? "bg-red-500/10 border-red-500/20" 
                  : issue.status === "RETURNED"
                  ? "bg-white/5 border-white/10"
                  : "bg-blue-500/10 border-blue-500/20"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${
                  isOverdue ? "bg-red-500/20 text-red-400" :
                  issue.status === "RETURNED" ? "bg-white/10 text-white/60" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  <Book className="w-6 h-6" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  isOverdue ? "bg-red-500/20 text-red-400" :
                  issue.status === "RETURNED" ? "bg-green-500/20 text-green-400" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  {isOverdue && <AlertTriangle className="w-3 h-3" />}
                  {isOverdue ? "Overdue" : issue.status}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-1 line-clamp-1">
                {issue.book?.title || "Unknown Book"}
              </h3>
              <p className="text-sm text-white/50 mb-6">
                by {issue.book?.author || "Unknown Author"}
              </p>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/50">Issued:</span>
                  <span className="text-white">{new Date(issue.issueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/50">Due Date:</span>
                  <span className={`${isOverdue ? "text-red-400 font-semibold" : "text-white"}`}>
                    {new Date(issue.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {issue.status === "RETURNED" && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/50">Returned:</span>
                    <span className="text-green-400">{new Date(issue.returnDate).toLocaleDateString()}</span>
                  </div>
                )}
                {isOverdue && issue.fineAmount > 0 && (
                  <div className="flex justify-between items-center text-sm mt-2 p-2 rounded bg-red-500/20">
                    <span className="text-red-300">Accumulated Fine:</span>
                    <span className="text-red-400 font-bold">₹{issue.fineAmount}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {issuedBooks.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white/5 border border-white/10 border-dashed">
            <CheckCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No Books Issued</h3>
            <p className="text-white/60">You currently have no books issued from the library.</p>
          </div>
        )}
      </div>
    </div>
  );
}
