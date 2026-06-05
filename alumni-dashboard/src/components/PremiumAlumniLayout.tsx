"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { 
  Home, 
  Users, 
  Calendar, 
  BookOpen, 
  HeartHandshake, 
  UserCircle, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  Sparkles,
  GraduationCap
} from "lucide-react";

export interface SidebarItem {
  icon: any;
  label: string;
  href: string;
}

const navItems: SidebarItem[] = [
  { icon: Home, label: "Dashboard", href: "/alumni" },
  { icon: Users, label: "Alumni Directory", href: "/alumni/directory" },
  { icon: Calendar, label: "Events & Reunions", href: "/alumni/events" },
  { icon: BookOpen, label: "Mentorship", href: "/alumni/mentorship" },
  { icon: HeartHandshake, label: "Giving Back", href: "/alumni/contributions" },
  { icon: UserCircle, label: "My Profile", href: "/alumni/profile" },
];

export function PremiumAlumniLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0A0F1C] font-[var(--font-body)] flex overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] bg-[#0A0F1C] flex-col relative z-20 shadow-2xl">
        {/* Logo Area */}
        <div className="px-8 py-8 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F5D061] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            <GraduationCap className="text-[#0A0F1C] w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white font-[var(--font-heading)] font-bold text-lg tracking-wide">SSVM</h1>
            <p className="text-[#D4AF37] text-[10px] font-semibold tracking-widest uppercase">Alumni Network</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 px-4 flex flex-col gap-2 overflow-y-auto">
          <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2 px-4">Menu</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative group ${
                  isActive 
                    ? "bg-[#D4AF37]/10 text-[#D4AF37]" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNav" 
                    className="absolute inset-0 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#D4AF37] rounded-r-full shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? "text-[#D4AF37]" : "text-white/40 group-hover:text-white/80"}`} />
                <span className="relative z-10 tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini */}
        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F5D061] p-0.5">
              <div className="w-full h-full bg-[#0A0F1C] rounded-full flex items-center justify-center overflow-hidden border-2 border-[#0A0F1C]">
                {user?.avatar ? (
                  <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <UserCircle className="w-6 h-6 text-[#D4AF37]" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate font-[var(--font-heading)]">{user?.name || "Loading..."}</h4>
              <p className="text-xs text-white/50 truncate">Class of 2012</p>
            </div>
            <button 
              onClick={logout}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-[#0A0F1C] border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#F5D061] flex items-center justify-center">
            <GraduationCap className="text-[#0A0F1C] w-4 h-4" />
          </div>
          <span className="text-white font-[var(--font-heading)] font-bold text-lg">SSVM</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-white p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-[#0A0F1C] z-[70] flex flex-col"
            >
              <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#F5D061] flex items-center justify-center">
                    <GraduationCap className="text-[#0A0F1C] w-4 h-4" />
                  </div>
                  <span className="text-white font-bold tracking-wide">Network</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium ${
                        isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" : "text-white/60"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-[#D4AF37]" : "text-white/40"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <header className="hidden lg:flex h-20 bg-white/80 backdrop-blur-xl border-b border-[#E2E8F0] items-center justify-between px-10 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#0A0F1C] transition-colors" />
              <input 
                type="text"
                placeholder="Search alumni, events, jobs..."
                className="w-[300px] pl-10 pr-4 py-2.5 bg-[#F1F5F9] border-none rounded-full text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:bg-white transition-all placeholder:text-[#94A3B8]"
              />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button className="relative p-2 text-[#64748B] hover:text-[#0A0F1C] hover:bg-[#F1F5F9] rounded-full transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4AF37] rounded-full border-2 border-white" />
            </button>
            <div className="w-px h-6 bg-[#E2E8F0]" />
            <Link href="/alumni/contributions" className="flex items-center gap-2 px-4 py-2 bg-[#0A0F1C] hover:bg-[#1A233A] text-white rounded-full text-sm font-medium transition-colors shadow-md">
              <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
              Give Back
            </Link>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0 relative">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay" />
          
          <div className="p-6 lg:p-10 max-w-7xl mx-auto relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
