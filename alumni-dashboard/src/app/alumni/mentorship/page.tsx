"use client";

import { motion } from "framer-motion";
import { BookOpen, Star, Search } from "lucide-react";

const mentors = [
  {
    name: "Dr. Sanjay Panda",
    role: "Chief Cardiologist at AIIMS",
    expertise: ["Medical Career", "Research", "Work-Life Balance"],
    slots: 2,
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400",
  },
  {
    name: "Priya Patel",
    role: "Investment Banker at Goldman Sachs",
    expertise: ["Finance", "Interview Prep", "Networking"],
    slots: 1,
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
  }
];

export default function MentorshipPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-[#0A0F1C] to-[#1A233A] p-8 md:p-12 rounded-3xl text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-heading)] mb-4">SSVM Mentorship Program</h1>
          <p className="text-white/70 leading-relaxed mb-6">
            Get 1:1 guidance from industry leaders who walked the same halls as you. Or, give back by mentoring the next generation.
          </p>
          <div className="flex gap-4">
            <button className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5D061] text-[#0A0F1C] font-bold text-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-105 transition-all">
              Find a Mentor
            </button>
            <button className="py-3 px-6 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all">
              Become a Mentor
            </button>
          </div>
        </div>
        <div className="hidden lg:flex relative z-10 w-32 h-32 rounded-full border-4 border-[#D4AF37]/30 items-center justify-center bg-white/5 backdrop-blur-sm">
          <BookOpen className="w-12 h-12 text-[#D4AF37]" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#0A0F1C] font-[var(--font-heading)] mb-6">Featured Mentors</h2>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {mentors.map((mentor, i) => (
            <div key={i} className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-xl transition-all group text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-[#F1F5F9] group-hover:bg-[#0A0F1C] transition-colors duration-500" />
              <div className="relative pt-6">
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 relative z-10 group-hover:border-[#D4AF37] transition-colors duration-500">
                  <img src={mentor.image} className="w-full h-full object-cover" alt={mentor.name} />
                </div>
                <h3 className="font-bold text-[#0A0F1C] text-lg mb-1">{mentor.name}</h3>
                <p className="text-sm font-medium text-[#64748B] mb-4">{mentor.role}</p>
                
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {mentor.expertise.map(exp => (
                    <span key={exp} className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] rounded-md text-xs font-semibold">
                      {exp}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {mentor.slots} Slots Available
                  </span>
                  <button className="text-sm font-bold text-[#0A0F1C] hover:text-[#D4AF37] transition-colors">
                    Request
                  </button>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
