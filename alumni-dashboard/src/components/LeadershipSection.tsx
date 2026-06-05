"use client";

import { motion } from "framer-motion";
import { useGallery } from "@/lib/api-hooks";

const leaders = [
  {
    title: "Pradhan Acharya",
    role: "Head of Institution",
    description: "Leading with vision and dedication towards academic excellence and holistic student development.",
    gradient: "from-orange-500 to-orange-600",
    bgGlow: "bg-orange-500/10",
    placeholder: "PA",
  },
  {
    title: "Secretary",
    role: "School Secretary",
    description: "Ensuring seamless operations and administrative excellence for the institution's growth.",
    gradient: "from-blue-500 to-blue-600",
    bgGlow: "bg-blue-500/10",
    placeholder: "S",
  },
  {
    title: "President",
    role: "School President",
    description: "Guiding the school's mission with strategic leadership and community engagement.",
    gradient: "from-purple-500 to-purple-600",
    bgGlow: "bg-purple-500/10",
    placeholder: "P",
  },
];

export function LeadershipSection() {
  const { data: rawPillars } = useGallery("Pillars");
  const pillarsPhotos = Array.isArray(rawPillars) ? rawPillars : rawPillars?.data || [];

  return (
    <section className="py-20 bg-gray-50 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-100/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-[5%]">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-block px-5 py-2 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-5 uppercase tracking-[0.2em]"
          >
            🏛️ Our Leadership
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-[clamp(28px,4vw,44px)] font-black text-[#0A1628] mb-4"
          >
            The Pillars of Our{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
              Institution
            </span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-20 h-1 mx-auto bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mb-4"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-gray-500 text-lg max-w-[550px] mx-auto"
          >
            Meet the visionary leaders who guide our school towards excellence.
          </motion.p>
        </motion.div>

        {/* Leadership Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px] mx-auto">
          {leaders.map((leader, index) => (
            <motion.div
              key={leader.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + index * 0.15, type: "spring", stiffness: 100 }}
              whileHover={{ y: -10 }}
              className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all group cursor-pointer border border-gray-100 overflow-hidden"
            >
              {/* Photo area */}
              <div className="relative h-[320px] overflow-hidden">
                {/* Gradient placeholder background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${leader.gradient} opacity-10`} />

                {/* Decorative glow */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 ${leader.bgGlow} rounded-full blur-3xl`} />

                {/* Placeholder avatar / Real Photo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {(() => {
                    const uploadedPhoto = pillarsPhotos.find((p: any) => 
                      p.title.toLowerCase().includes(leader.title.toLowerCase())
                    );
                    
                    return uploadedPhoto ? (
                      <div className="w-40 h-40 rounded-full overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500 border-4 border-white z-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={uploadedPhoto.imageUrl} 
                          alt={leader.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`w-40 h-40 rounded-full bg-gradient-to-br ${leader.gradient} flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500 z-10`}>
                        <span className="text-white text-5xl font-black tracking-wider">
                          {leader.placeholder}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom gradient fade */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* Info */}
              <div className="px-7 pb-8 -mt-4 relative text-center">
                <h3 className="text-[#0A1628] text-xl font-black mb-1 group-hover:text-orange-600 transition-colors">
                  {leader.title}
                </h3>
                <div className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${leader.gradient} text-white text-xs font-semibold mb-3 shadow-sm`}>
                  {leader.role}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {leader.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
