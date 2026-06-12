"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const values = [
  {
    icon: "✨",
    title: "Excellence",
    description: "Striving for the highest standards in education.",
    color: "from-blue-500/20 to-blue-600/20",
    borderColor: "border-blue-500/30",
  },
  {
    icon: "🛡️",
    title: "Integrity",
    description: "Honesty, transparency and ethics in all we do.",
    color: "from-green-500/20 to-green-600/20",
    borderColor: "border-green-500/30",
  },
  {
    icon: "❤️",
    title: "Respect",
    description: "Valuing every individual and perspective.",
    color: "from-red-500/20 to-red-600/20",
    borderColor: "border-red-500/30",
  },
  {
    icon: "🎯",
    title: "Responsibility",
    description: "Accountable to students and society.",
    color: "from-purple-500/20 to-purple-600/20",
    borderColor: "border-purple-500/30",
  },
  {
    icon: "💡",
    title: "Innovation",
    description: "Encouraging creativity and new ideas.",
    color: "from-orange-500/20 to-orange-600/20",
    borderColor: "border-orange-500/30",
  },
];

export function CoreValuesSection() {
  return (
    <section id="about" className="py-20 bg-white">
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
              Our Foundation
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[clamp(32px,4vw,48px)] font-bold text-[#0A1628] mb-4"
            >
              Our Core Values
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 text-lg max-w-[600px]"
            >
              Building character and responsibility in our students through timeless values.
            </motion.p>
          </div>
          <Link
            href="#values"
            className="hidden lg:inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-orange-600 border-2 border-orange-200 hover:bg-orange-50 transition-all no-underline"
          >
            Discover More →
          </Link>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${value.color} ${value.borderColor} border rounded-2xl p-6 hover:shadow-xl transition-all group cursor-pointer`}
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {value.icon}
              </div>
              <h3 className="text-[#0A1628] text-xl font-bold mb-2">{value.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
