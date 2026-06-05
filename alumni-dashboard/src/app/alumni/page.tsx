"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { 
  Trophy, 
  Briefcase, 
  Users, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Profile Strength", value: "85%", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Network Size", value: "4,200+", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Active Jobs", value: "142", icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Upcoming Events", value: "8", icon: Calendar, color: "text-purple-500", bg: "bg-purple-500/10" },
];

const feed = [
  {
    id: 1,
    type: "ACHIEVEMENT",
    author: "Dr. Ananya Sharma",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    role: "AI Researcher at DeepMind",
    batch: "Class of 2012",
    time: "2 hours ago",
    content: "Thrilled to announce that our team's research on generative models was just published in Nature! Always grateful for the strong science foundation I got at SSVM.",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800",
    likes: 245,
    comments: 42
  },
  {
    id: 2,
    type: "EVENT",
    author: "SSVM Alumni Association",
    avatar: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150",
    role: "Official Network",
    batch: "",
    time: "1 day ago",
    content: "The Grand Alumni Meet 2026 is officially happening! Join us this December to reconnect with your batchmates, walk the old corridors, and celebrate the SSVM legacy.",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
    likes: 890,
    comments: 156
  }
];

const upcomingEvents = [
  { title: "Silicon Valley Chapter Meetup", date: "Oct 15", location: "San Francisco, CA" },
  { title: "Class of 2010 Reunion", date: "Nov 02", location: "SSVM Campus" },
  { title: "Tech Startup Networking", date: "Nov 18", location: "Virtual (Zoom)" },
];

export default function PremiumAlumniDashboard() {
  const { user } = useAuth();
  
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVars}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8 pb-10"
    >
      {/* Hero Welcome Banner */}
      <motion.div variants={itemVars} className="relative overflow-hidden rounded-3xl bg-[#0A0F1C] text-white shadow-2xl border border-white/10">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80" 
            className="w-full h-full object-cover opacity-20"
            alt="Library"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1C] via-[#0A0F1C]/80 to-transparent" />
        </div>
        
        <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-semibold tracking-widest uppercase text-white/90">Premium Network Access</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-[var(--font-heading)] leading-tight mb-4">
              Welcome back, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5D061]">
                {user?.name?.split(" ")[0] || "Alumni"}
              </span>
            </h1>
            <p className="text-lg text-white/70 font-light leading-relaxed max-w-xl">
              Connect with fellow batchmates, explore exclusive career opportunities, and give back to the community that shaped your journey.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col gap-3">
            <Link href="/alumni/directory" className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:from-[#F5D061] hover:to-[#FFDF73] text-[#0A0F1C] font-bold text-sm shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:scale-105 transition-all group">
              Browse Directory
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/alumni/profile" className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold text-sm transition-all hover:scale-105">
              Complete Profile
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVars} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow group flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold text-[#0A0F1C] font-[var(--font-heading)]">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Feed */}
        <motion.div variants={itemVars} className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0A0F1C] font-[var(--font-heading)]">Network Highlights</h2>
            <button className="text-sm font-semibold text-[#64748B] hover:text-[#0A0F1C] transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            {feed.map((post) => (
              <div key={post.id} className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E2E8F0]">
                        <img src={post.avatar} className="w-full h-full object-cover" alt={post.author} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0A0F1C] text-base leading-tight">{post.author}</h4>
                        <p className="text-xs text-[#64748B] mt-0.5">{post.role} {post.batch && `• ${post.batch}`}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#94A3B8]">{post.time}</span>
                  </div>
                  <p className="text-[#334155] leading-relaxed text-sm mb-5">
                    {post.content}
                  </p>
                </div>
                {post.image && (
                  <div className="w-full h-[300px] bg-[#F1F5F9]">
                    <img src={post.image} className="w-full h-full object-cover" alt="Post" />
                  </div>
                )}
                <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center gap-6">
                  <button className="flex items-center gap-2 text-sm font-semibold text-[#64748B] hover:text-blue-600 transition-colors">
                    <span className="text-lg">👍</span> {post.likes}
                  </button>
                  <button className="flex items-center gap-2 text-sm font-semibold text-[#64748B] hover:text-[#0A0F1C] transition-colors">
                    <span className="text-lg">💬</span> {post.comments} Comments
                  </button>
                  <button className="flex items-center gap-2 text-sm font-semibold text-[#64748B] hover:text-[#0A0F1C] transition-colors ml-auto">
                    <span className="text-lg">↗️</span> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sidebar Widgets */}
        <motion.div variants={itemVars} className="space-y-8">
          
          {/* Upcoming Events */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A0F1C] font-[var(--font-heading)] mb-6 flex items-center justify-between">
              Upcoming Events
              <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#64748B]" />
              </div>
            </h3>
            <div className="space-y-5">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="flex gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors">
                    <span className="text-[10px] font-bold text-blue-600 uppercase group-hover:text-white transition-colors">{event.date.split(' ')[0]}</span>
                    <span className="text-sm font-bold text-[#0A0F1C] leading-none mt-0.5 group-hover:text-white transition-colors">{event.date.split(' ')[1]}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A0F1C] group-hover:text-blue-600 transition-colors">{event.title}</h4>
                    <p className="text-xs text-[#64748B] flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3 h-3" /> {event.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#0A0F1C] hover:bg-[#F8FAFC] transition-colors">
              View All Events
            </button>
          </div>

          {/* Mentorship Spotlight */}
          <div className="bg-gradient-to-br from-[#0A0F1C] to-[#1A233A] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-[40px] pointer-events-none" />
            <h3 className="text-lg font-bold font-[var(--font-heading)] mb-2 relative z-10">Give back as a Mentor</h3>
            <p className="text-sm text-white/70 mb-6 relative z-10">Guide the next generation of SSVM students towards success.</p>
            <Link href="/alumni/mentorship" className="inline-flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#0A0F1C] text-sm font-bold hover:bg-[#F8FAFC] transition-colors relative z-10">
              Become a Mentor
            </Link>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
