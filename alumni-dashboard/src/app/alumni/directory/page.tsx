"use client";

import { motion } from "framer-motion";
import { Search, Filter, MapPin, Briefcase } from "lucide-react";

const alumniData = [
  {
    name: "Dr. Ananya Sharma",
    role: "AI Researcher at DeepMind",
    batch: "2012",
    location: "London, UK",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
    tags: ["AI/ML", "Research"]
  },
  {
    name: "Rahul Verma",
    role: "Founder & CEO at TechFlow",
    batch: "2008",
    location: "Bangalore, India",
    image: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400",
    tags: ["Entrepreneurship", "SaaS"]
  },
  {
    name: "Priya Patel",
    role: "Investment Banker at Goldman Sachs",
    batch: "2015",
    location: "New York, USA",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
    tags: ["Finance", "M&A"]
  },
  {
    name: "Karthik Raj",
    role: "Senior Software Engineer at Google",
    batch: "2018",
    location: "Mountain View, CA",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
    tags: ["Engineering", "Cloud"]
  },
  {
    name: "Dr. Sanjay Panda",
    role: "Chief Cardiologist at AIIMS",
    batch: "1995",
    location: "New Delhi, India",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400",
    tags: ["Healthcare", "Medicine"]
  },
  {
    name: "Neha Gupta",
    role: "Creative Director at Vogue",
    batch: "2014",
    location: "Mumbai, India",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
    tags: ["Design", "Media"]
  }
];

export default function DirectoryPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0A0F1C] font-[var(--font-heading)] mb-2">Alumni Directory</h1>
          <p className="text-[#64748B] text-sm">Connect with 4,200+ graduates across the globe.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0A0F1C] shadow-sm hover:bg-[#F8FAFC]">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {alumniData.map((alumni, i) => (
          <div key={i} className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-xl hover:border-[#D4AF37]/50 transition-all duration-300 group">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#E2E8F0] group-hover:border-[#D4AF37] transition-colors shrink-0">
                <img src={alumni.image} className="w-full h-full object-cover" alt={alumni.name} />
              </div>
              <div>
                <h3 className="font-bold text-[#0A0F1C] text-lg leading-tight group-hover:text-[#D4AF37] transition-colors">{alumni.name}</h3>
                <p className="text-sm font-semibold text-[#D4AF37] mt-1">Class of {alumni.batch}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-[#64748B] text-sm">
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="truncate">{alumni.role}</span>
              </div>
              <div className="flex items-center gap-2 text-[#64748B] text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{alumni.location}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {alumni.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-[#F1F5F9] text-[#64748B] rounded-full text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>

            <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0A0F1C] to-[#1A233A] text-white text-sm font-bold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              View Profile
            </button>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
