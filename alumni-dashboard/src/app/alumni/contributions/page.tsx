"use client";

import { motion } from "framer-motion";
import { Heart, TrendingUp, Users } from "lucide-react";

export default function ContributionsPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="text-center max-w-2xl mx-auto py-12">
        <div className="w-16 h-16 mx-auto bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Heart className="w-8 h-8 fill-current" />
        </div>
        <h1 className="text-4xl font-bold text-[#0A0F1C] font-[var(--font-heading)] mb-4">Give Back to SSVM</h1>
        <p className="text-[#64748B] text-lg mb-8">
          Your contributions help us build state-of-the-art facilities, provide scholarships, and empower the next generation of leaders.
        </p>
        <button className="py-4 px-10 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5D061] text-[#0A0F1C] font-bold text-lg shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:scale-105 transition-all">
          Make a Contribution
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] text-center shadow-sm">
          <TrendingUp className="w-8 h-8 mx-auto text-[#D4AF37] mb-4" />
          <h3 className="text-2xl font-bold text-[#0A0F1C] mb-1">₹4.2 Cr</h3>
          <p className="text-[#64748B] text-sm font-medium">Raised this year</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] text-center shadow-sm">
          <Users className="w-8 h-8 mx-auto text-blue-500 mb-4" />
          <h3 className="text-2xl font-bold text-[#0A0F1C] mb-1">1,240</h3>
          <p className="text-[#64748B] text-sm font-medium">Alumni Donors</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] text-center shadow-sm">
          <Heart className="w-8 h-8 mx-auto text-red-500 mb-4" />
          <h3 className="text-2xl font-bold text-[#0A0F1C] mb-1">45</h3>
          <p className="text-[#64748B] text-sm font-medium">Scholarships Awarded</p>
        </div>
      </div>
    </div>
  );
}
