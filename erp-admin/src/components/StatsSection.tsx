"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const stats = useMemo(() => {
    return [
      { icon: "🏛️", value: "1987", label: "Years of Excellence", color: "from-blue-500 to-blue-600" },
      { icon: "🎓", value: "5000+", label: "Alumni Network", color: "from-green-500 to-green-600" },
      { icon: "🏆", value: "25+", label: "State Rank Holders", color: "from-purple-500 to-purple-600" },
      { icon: "💻", value: "100%", label: "Digital Administration", color: "from-orange-500 to-orange-600" },
      { icon: "🎪", value: "50+", label: "Events Every Year", color: "from-red-500 to-red-600" },
    ];
  }, []);

  return (
    <section className="relative py-0 -mt-16 z-10">
      <div className="max-w-[1400px] mx-auto px-[5%]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-[#0f1f3a] to-[#1a2942] rounded-2xl shadow-2xl border border-white/10 p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="text-center group cursor-pointer"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <div className="text-white text-2xl font-bold mb-1">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
