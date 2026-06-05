"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Users, ArrowRight } from "lucide-react";

const events = [
  {
    title: "Grand Alumni Meet 2026",
    date: "Dec 15, 2026",
    time: "10:00 AM - 8:00 PM",
    location: "SSVM Main Campus",
    attendees: 450,
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
    tags: ["Reunion", "Networking"]
  },
  {
    title: "Silicon Valley Chapter Mixer",
    date: "Oct 15, 2026",
    time: "6:00 PM - 9:00 PM",
    location: "San Francisco, CA",
    attendees: 120,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    tags: ["Tech", "Mixer"]
  },
  {
    title: "Global Mentorship Summit",
    date: "Nov 18, 2026",
    time: "9:00 AM EST",
    location: "Virtual (Zoom)",
    attendees: 800,
    image: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800",
    tags: ["Virtual", "Mentorship"]
  }
];

export default function EventsPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0A0F1C] font-[var(--font-heading)] mb-2">Events & Reunions</h1>
          <p className="text-[#64748B] text-sm">Reconnect with batchmates at exclusive global events.</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {events.map((event, i) => (
          <div key={i} className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#D4AF37]/50 transition-all duration-300 group flex flex-col md:flex-row">
            <div className="w-full md:w-2/5 h-48 md:h-auto relative overflow-hidden">
              <img src={event.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={event.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C]/80 to-transparent md:hidden" />
              <div className="absolute top-4 left-4 flex flex-col items-center justify-center w-12 h-12 bg-white rounded-xl shadow-lg">
                <span className="text-[10px] font-bold text-red-500 uppercase">{event.date.split(' ')[0]}</span>
                <span className="text-sm font-bold text-[#0A0F1C] leading-none mt-0.5">{event.date.split(' ')[1].replace(',', '')}</span>
              </div>
            </div>
            
            <div className="p-6 md:w-3/5 flex flex-col justify-between">
              <div>
                <div className="flex gap-2 mb-3">
                  {event.tags.map(t => (
                    <span key={t} className="px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider rounded-md">
                      {t}
                    </span>
                  ))}
                </div>
                <h3 className="font-bold text-[#0A0F1C] text-xl mb-4 group-hover:text-[#D4AF37] transition-colors">{event.title}</h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[#64748B] text-sm">
                    <Clock className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#64748B] text-sm">
                    <MapPin className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#64748B] text-sm">
                    <Users className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                    <span>{event.attendees} Attending</span>
                  </div>
                </div>
              </div>

              <button className="flex items-center justify-between w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-sm font-bold text-[#0A0F1C] group-hover:bg-[#0A0F1C] group-hover:text-white transition-all duration-300">
                <span>RSVP Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
