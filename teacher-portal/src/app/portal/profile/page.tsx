"use client";

import { User, Mail, Phone, MapPin, Award, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user } = useAuth();
  
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
          <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-3xl font-black text-indigo-600">
              {user?.name?.charAt(0) || "T"}
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-8 px-8 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{user?.name || "Teacher Profile"}</h1>
            <p className="text-slate-500 font-medium mt-1">Senior Faculty • Mathematics Department</p>
          </div>
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{user?.email || "No email linked"}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Cuttack, Odisha</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Academic Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <Award className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">M.Sc. Mathematics, B.Ed.</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Teaching Classes IX, X, XI, XII</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
