"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { NewNavbar, NewFooter } from "@/components";
import { usePublicStats } from "@/lib/api-hooks";

const values = [
  { icon: "✨", title: "Excellence", description: "Striving for the highest standards in education, nurturing brilliance in every student.", color: "from-blue-500 to-blue-600" },
  { icon: "🛡️", title: "Integrity", description: "Honesty, transparency, and ethics in everything we do — shaping trustworthy citizens.", color: "from-green-500 to-green-600" },
  { icon: "❤️", title: "Respect", description: "Valuing every individual and perspective, fostering a culture of mutual understanding.", color: "from-red-500 to-red-600" },
  { icon: "🎯", title: "Responsibility", description: "Accountable to students, parents, and society — building a responsible future.", color: "from-purple-500 to-purple-600" },
  { icon: "💡", title: "Innovation", description: "Encouraging creativity and new ideas, preparing students for tomorrow's challenges.", color: "from-orange-500 to-orange-600" },
];

const milestones = [
  { year: "1987", title: "School Founded", description: "Established under Vidya Bharati with a vision to provide value-based education." },
  { year: "1970", title: "Campus Expansion", description: "New buildings and facilities added to accommodate growing student strength." },
  { year: "1995", title: "Senior Secondary Added", description: "Expanded to include Classes 11-12 with Science, Commerce, and Arts streams." },
  { year: "2010", title: "Digital Transformation", description: "Smart classrooms and computer labs introduced across all departments." },
  { year: "2020", title: "70+ Years of Excellence", description: "Celebrating decades of shaping young minds and producing outstanding citizens." },
  { year: "2025", title: "Modern Infrastructure", description: "State-of-the-art facilities, sports complex, and innovation labs established." },
];

const leadership = [
  { icon: "🏛️", title: "Vidya Bharati Affiliation", description: "Part of India's largest non-governmental educational network." },
  { icon: "👨‍💼", title: "Experienced Management", description: "Led by visionary educators with decades of experience in school administration." },
  { icon: "👩‍🏫", title: "Qualified Faculty", description: "120+ highly trained teachers passionate about nurturing young minds." },
  { icon: "🤝", title: "Parent Partnership", description: "Active parent-teacher collaboration for holistic student development." },
];

export default function AboutPage() {
  const { data: statsData } = usePublicStats();

  const stats = useMemo(() => {
    if (!statsData) {
      return [
        { icon: "🏛️", value: "1987", label: "Established" },
        { icon: "👥", value: "3,200+", label: "Students" },
        { icon: "🎓", value: "120+", label: "Expert Teachers" },
        { icon: "🏆", value: "98%", label: "Board Results" },
        { icon: "🏅", value: "250+", label: "Awards Won" },
      ];
    }
    return [
      { icon: "🏛️", value: statsData.establishmentYear || "1987", label: "Established" },
      { icon: "👥", value: statsData.studentCount || "3,200+", label: "Students" },
      { icon: "🎓", value: statsData.teacherCount || "120+", label: "Expert Teachers" },
      { icon: "🏆", value: statsData.boardResults || "98%", label: "Board Results" },
      { icon: "🏅", value: statsData.awardsCount || "250+", label: "Awards Won" },
    ];
  }, [statsData]);

  return (
    <>
      <NewNavbar />
      <main className="min-h-screen bg-[#f8f9fc]">
        {/* Hero Header */}
        <section className="relative pt-[110px] bg-[#0A1628] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
          </div>

          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          </div>

          <div className="relative max-w-[1400px] mx-auto px-[5%] py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold mb-6 uppercase tracking-[0.2em]"
              >
                🏫 Our Story
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[clamp(36px,5vw,64px)] font-black text-white leading-tight mb-4"
              >
                About{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-500 to-purple-600">
                  Our School
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-lg md:text-xl max-w-[700px] mx-auto mb-8 leading-relaxed"
              >
                Rooted in Indian values, driven by excellence. Since 1987, we have been shaping young minds for a brighter tomorrow under the Vidya Bharati network.
              </motion.p>
            </motion.div>

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 max-w-[900px] mx-auto"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl mb-2">{stat.icon}</div>
                    <div className="text-white text-2xl font-black mb-0.5">{stat.value}</div>
                    <div className="text-white/50 text-xs font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 60V30C240 0 480 0 720 15C960 30 1200 45 1440 30V60H0Z" fill="#f8f9fc" />
            </svg>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-16">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <div className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-4 uppercase tracking-wider">
                Our Foundation
              </div>
              <h2 className="text-[clamp(28px,4vw,44px)] font-bold text-[#0A1628] mb-3">Our Core Values</h2>
              <p className="text-gray-500 text-lg max-w-[550px] mx-auto">
                Building character and responsibility through timeless values.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-2xl p-7 shadow-lg hover:shadow-2xl transition-all group cursor-pointer border border-gray-100 text-center"
                >
                  <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    {value.icon}
                  </div>
                  <h3 className="text-[#0A1628] text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mb-4 uppercase tracking-wider">
                Our Journey
              </div>
              <h2 className="text-[clamp(28px,4vw,44px)] font-bold text-[#0A1628]">Milestones</h2>
            </motion.div>

            <div className="relative">
              {/* Timeline line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 via-blue-500 to-purple-500 -translate-x-1/2" />

              <div className="space-y-8 md:space-y-0">
                {milestones.map((item, index) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative md:flex items-center md:mb-12 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  >
                    <div className={`md:w-1/2 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                      <div className="bg-gray-50 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-100">
                        <div className="text-orange-600 text-sm font-bold mb-2">{item.year}</div>
                        <h3 className="text-[#0A1628] text-xl font-bold mb-2">{item.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                    {/* Center dot */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border-4 border-white shadow-lg z-10" />
                    <div className="md:w-1/2" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Leadership */}
        <section className="py-16 bg-[#0A1628]">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-block px-5 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-4 uppercase tracking-[0.2em]">
                Our Strength
              </div>
              <h2 className="text-[clamp(28px,4vw,44px)] font-bold text-white">
                Leadership & <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Governance</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {leadership.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 hover:bg-white/10 transition-all group cursor-pointer text-center"
                >
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                  <h3 className="text-white text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <NewFooter />
    </>
  );
}
