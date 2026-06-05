"use client";

import { useAuth } from "@/lib/auth-context";
import { UserCircle, Mail, MapPin, Briefcase, Edit3 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 pb-10 max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="h-48 bg-gradient-to-r from-[#0A0F1C] to-[#1A233A] relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
          <button className="absolute top-6 right-6 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 border border-white/20">
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        </div>
        <div className="px-8 pb-8 relative">
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-[#0A0F1C] absolute -top-16 left-8 flex items-center justify-center">
             {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <UserCircle className="w-16 h-16 text-[#D4AF37]" />
              )}
          </div>
          
          <div className="pt-20">
            <h1 className="text-3xl font-bold text-[#0A0F1C] font-[var(--font-heading)] mb-1">{user?.name || "Alumni"}</h1>
            <p className="text-lg text-[#D4AF37] font-semibold mb-6">Class of 2012</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider mb-2">Contact Info</h3>
                <div className="flex items-center gap-3 text-[#334155]">
                  <Mail className="w-5 h-5 text-[#94A3B8]" />
                  <span>{user?.email || "email@example.com"}</span>
                </div>
                <div className="flex items-center gap-3 text-[#334155]">
                  <MapPin className="w-5 h-5 text-[#94A3B8]" />
                  <span>San Francisco, CA</span>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider mb-2">Professional</h3>
                <div className="flex items-center gap-3 text-[#334155]">
                  <Briefcase className="w-5 h-5 text-[#94A3B8]" />
                  <span>Senior Product Manager at TechCorp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
