"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function TransportTrackingPage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState("1");

  const children = [
    { id: "1", name: "Aarav Sharma", busNumber: "DL-1V-4422", stop: "Sector 14 Metro", dropTime: "15:45 PM" },
    { id: "2", name: "Diya Sharma", busNumber: "HR-26-XX-11", stop: "Cyber Hub Gate", dropTime: "16:00 PM" }
  ];

  const activeChild = children.find(c => c.id === selectedChild);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Live Transport Tracking</h1>
          <p className="text-slate-500 dark:text-slate-400">Track bus location and estimated drop-off times in real-time.</p>
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
        
        {/* Map Placeholder */}
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
            <h3 className="text-lg font-bold">Connecting to Telemetry...</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
              Live GPS coordinates are being fetched from Bus {activeChild?.busNumber}.
            </p>
          </div>

          <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 shadow-lg px-4 py-2 rounded-full flex items-center gap-2 border border-slate-100 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Live GPS Active</span>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6 bg-gradient-to-br from-blue-600 to-indigo-600 border-none text-white shadow-xl rounded-3xl">
            <h2 className="font-bold text-blue-100 mb-6 flex items-center uppercase tracking-wider text-xs">
              <span className="mr-2">📍</span> Current Assignment
            </h2>
            
            <div className="space-y-6">
              <div>
                <p className="text-blue-200 text-xs font-semibold mb-1 uppercase">Allocated Bus</p>
                <p className="text-3xl font-black">{activeChild?.busNumber}</p>
              </div>
              
              <div>
                <p className="text-blue-200 text-xs font-semibold mb-1 uppercase">Designated Stop</p>
                <p className="text-xl font-bold">{activeChild?.stop}</p>
              </div>

              <div className="pt-4 border-t border-blue-500/30">
                <p className="text-blue-200 text-xs font-semibold mb-1 uppercase">Est. Drop Time</p>
                <p className="text-2xl font-black text-amber-300">{activeChild?.dropTime}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl">
            <h3 className="font-bold mb-4 flex items-center text-sm">
              <span className="mr-2 text-indigo-500">🛡️</span> Security Check
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium">Boarded Morning</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">07:15 AM</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium">Reached Campus</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">08:05 AM</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium">Boarded Return</span>
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">Pending</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
