"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";

// Fetcher for cookie-authenticated API
const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json()).then((d) => d.data ?? d);

export default function TransportTrackingPage() {
  const { user } = useAuth();
  const { data: allocationsData, isLoading } = useSWR("/api/v1/transport/allocations", fetcher);

  const allocations = Array.isArray(allocationsData) ? allocationsData : [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeAllocation = allocations[selectedIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Live Transport Tracking</h1>
          <p className="text-slate-500 dark:text-slate-400">Track bus location and route status in real-time.</p>
        </div>
        
        {allocations.length > 1 && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
            {allocations.map((alloc: any, idx: number) => (
              <button
                key={alloc.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedIndex === idx 
                    ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {alloc.student?.name || `Student ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500">Loading transport allocation...</div>
      ) : allocations.length === 0 ? (
        <div className="p-12 text-center glass-card border border-slate-200 dark:border-slate-800 rounded-3xl">
          <div className="text-5xl mb-3">🚌</div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Active Transport Allocation</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
            No active school bus allocation is currently mapped to your registered student profile. Contact the school transport desk to request bus allocation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Display */}
          <div className="lg:col-span-2 glass-card p-0 overflow-hidden relative min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, slate 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative z-10 text-center">
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-6xl mb-4"
              >
                🚌
              </motion.div>
              <h3 className="text-lg font-bold">Route Active</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                Bus {activeAllocation?.vehicle?.registrationNo || "Assigned Vehicle"} - Route {activeAllocation?.route?.name || "School Commute"}
              </p>
            </div>
          </div>

          {/* Allocation Details */}
          <div className="glass-card p-6 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold">Trip Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Pickup Stop</span>
                <span className="font-semibold">{activeAllocation?.stop?.name || "Assigned Stop"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Vehicle Number</span>
                <span className="font-semibold">{activeAllocation?.vehicle?.registrationNo || "Fleet Bus"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Status</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">EN ROUTE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
