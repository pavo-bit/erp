"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const programs = [
  {
    icon: "🎨",
    title: "Early Years",
    description: "Nurturing curiosity and creativity in our little learners.",
    age: "Ages 3-5",
    color: "from-pink-500 to-pink-600",
  },
  {
    icon: "📚",
    title: "Primary School",
    description: "Strong foundation in academics, values and life skills.",
    age: "Grades 1-5",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: "🔬",
    title: "Middle School",
    description: "Encouraging critical thinking and holistic growth.",
    age: "Grades 6-8",
    color: "from-green-500 to-green-600",
  },
  {
    icon: "🎓",
    title: "High School",
    description: "Preparing for a bright future with strong academics.",
    age: "Grades 9-10",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: "📊",
    title: "Senior Secondary",
    description: "Stream choices and career-focused education.",
    age: "Grades 11-12",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: "🌟",
    title: "Co-Curricular",
    description: "Sports, arts, clubs and activities for all-round development.",
    age: "All Ages",
    color: "from-red-500 to-red-600",
  },
];

export function AcademicProgramsSection() {

  return (
    <section id="academics" className="py-20 bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-[5%]">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-4 uppercase tracking-wider"
            >
              Our Programs
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[clamp(32px,4vw,48px)] font-bold text-[#0A1628] mb-4"
            >
              Academic Programmes
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 text-lg max-w-[600px]"
            >
              A wide range of programs designed to help students discover their passion and achieve their dreams.
            </motion.p>
          </div>
          <Link
            href="#programs"
            className="hidden lg:inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-orange-600 border-2 border-orange-200 hover:bg-orange-50 transition-all no-underline"
          >
            View All Programs →
          </Link>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program, index) => (
            <motion.div
              key={program.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all group cursor-pointer border border-gray-100"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${program.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                {program.icon}
              </div>
              <div className="mb-2">
                <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold">
                  {program.age}
                </span>
              </div>
              <h3 className="text-[#0A1628] text-xl font-bold mb-2">{program.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{program.description}</p>
              <Link
                href={`#${program.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="inline-flex items-center gap-2 text-orange-600 text-sm font-semibold hover:gap-3 transition-all no-underline"
              >
                Learn More →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
