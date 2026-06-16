"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Upload, FileText, CheckCircle, ShieldCheck } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json());

export default function DocumentsPage() {
  const { data: documentsData, isLoading } = useSWR("/api/documents", fetcher);
  const [activeTab, setActiveTab] = useState("all");

  const documents = documentsData?.data || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Repository</h1>
          <p className="text-gray-500">Secure storage and verification of compliance documents.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-white rounded-xl w-max shadow-sm border border-gray-200">
        {["all", "verified", "pending"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-gray-100 text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documents.map((doc: any) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg ${
                  doc.category === 'AADHAAR' ? 'bg-orange-100 text-orange-600' :
                  doc.category === 'TC' ? 'bg-purple-100 text-purple-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                {doc.isVerified ? (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                ) : (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Pending</span>
                )}
              </div>
              
              <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{doc.name}</h3>
              <div className="text-xs text-gray-500 flex flex-col gap-1">
                <span>Type: {doc.ownerType}</span>
                <span className="truncate">Ref: {doc.ownerId}</span>
                <span>Date: {new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <a 
                href={doc.fileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 text-center py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                View
              </a>
              {!doc.isVerified && (
                <button className="flex-1 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-lg transition-colors">
                  Verify
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {documents.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center rounded-2xl border-2 border-dashed border-gray-200">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Documents Found</h3>
            <p className="text-gray-500">Upload compliance and academic documents to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
