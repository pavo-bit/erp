"use client";

import { motion } from "framer-motion";
import { useGallery } from "@/lib/api-hooks";

const cardDesigns = [
  {
    theme: "Rose Elegance",
    bgColor: "bg-[#fff1f2]",
    borderColor: "border-[#fecdd3]",
    innerBorder: "border-[#fda4af]",
    textColor: "text-[#881337]",
    accentColor: "text-[#e11d48]",
    shadow: "rgba(225, 29, 72, 0.15)",
    flower: "❀",
    floralPattern: "radial-gradient(circle at top left, #ffe4e6 0%, transparent 40%), radial-gradient(circle at bottom right, #ffe4e6 0%, transparent 40%)",
  },
  {
    theme: "Lavender Dreams",
    bgColor: "bg-[#f5f3ff]",
    borderColor: "border-[#ede9fe]",
    innerBorder: "border-[#ddd6fe]",
    textColor: "text-[#4c1d95]",
    accentColor: "text-[#7c3aed]",
    shadow: "rgba(124, 58, 237, 0.15)",
    flower: "✿",
    floralPattern: "radial-gradient(circle at top right, #ede9fe 0%, transparent 40%), radial-gradient(circle at bottom left, #ede9fe 0%, transparent 40%)",
  },
  {
    theme: "Golden Lily",
    bgColor: "bg-[#fffbeb]",
    borderColor: "border-[#fef3c7]",
    innerBorder: "border-[#fde68a]",
    textColor: "text-[#78350f]",
    accentColor: "text-[#d97706]",
    shadow: "rgba(217, 119, 6, 0.15)",
    flower: "❁",
    floralPattern: "radial-gradient(circle at center, #fef3c7 0%, transparent 50%)",
  }
];

export function StudentAchievementsSection() {
  const { data: rawAchievements } = useGallery("Achievements");
  const achievements = Array.isArray(rawAchievements) ? rawAchievements : rawAchievements?.data || [];

  if (achievements.length === 0) {
    return null; // Don't show the section if no achievements have been uploaded
  }

  return (
    <section className="py-24 relative overflow-hidden bg-[#faf8f5] border-y border-amber-900/10">
      {/* Subtle traditional pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiM0NTE0MDAiLz48L3N2Zz4=')]" />
      
      <div className="relative max-w-[1400px] mx-auto px-[5%]">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-amber-800/30" />
            <span className="text-amber-800/80 uppercase tracking-[0.3em] text-[11px] font-bold font-serif">Honoring Excellence</span>
            <div className="h-[1px] w-12 bg-amber-800/30" />
          </div>

          <h2 className="text-[clamp(32px,5vw,52px)] font-serif text-[#2c1810] mb-6">
            Student Achievements
          </h2>
          <div className="w-24 h-[2px] mx-auto bg-amber-800/20" />
        </motion.div>

        {/* Grid of Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-[1200px] mx-auto">
          {achievements.map((achievement: Record<string, unknown>, index: number) => {
            const design = cardDesigns[index % cardDesigns.length];
            
            // Extract Class and actual Description from the combined string
            let studentClass = "";
            let descriptionText = (achievement.description as string) || "";
            
            if (descriptionText.startsWith("Class: ")) {
              const lines = descriptionText.split("\n");
              studentClass = lines[0].replace("Class: ", "");
              descriptionText = lines.slice(1).join("\n").trim();
            }

            return (
              <motion.div
                key={achievement.id as string}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index % 3) * 0.2, duration: 0.8, type: "spring", stiffness: 100 }}
                className={`p-6 relative group rounded-2xl overflow-hidden ${design.bgColor} border ${design.borderColor} transition-transform duration-500 hover:-translate-y-2`}
                style={{ 
                  boxShadow: `0 15px 40px -10px ${design.shadow}, 0 0 0 1px ${design.shadow}`,
                  backgroundImage: design.floralPattern
                }}
              >
                {/* Traditional double border inner frame */}
                <div className={`absolute inset-3 border-[1.5px] border-dashed rounded-xl pointer-events-none transition-colors duration-500 ${design.innerBorder} opacity-50 group-hover:border-solid group-hover:opacity-100`} />
                
                {/* Floral corners */}
                <div className={`absolute top-4 left-4 text-3xl opacity-50 ${design.accentColor} pointer-events-none group-hover:scale-110 transition-transform duration-500`}>{design.flower}</div>
                <div className={`absolute bottom-4 right-4 text-3xl opacity-50 ${design.accentColor} pointer-events-none group-hover:scale-110 transition-transform duration-500`}>{design.flower}</div>
                <div className={`absolute top-4 right-4 text-xl opacity-30 ${design.accentColor} pointer-events-none`}>✧</div>
                <div className={`absolute bottom-4 left-4 text-xl opacity-30 ${design.accentColor} pointer-events-none`}>✧</div>

                {/* Photo window - Greeting Card Arch style */}
                <div className={`relative h-[260px] w-[75%] mx-auto mt-8 mb-8 overflow-hidden rounded-t-[100px] rounded-b-xl border-[6px] border-white shadow-lg group-hover:shadow-xl transition-shadow duration-500`}>
                  <div className="w-full h-full overflow-hidden relative bg-white">
                    <div className="absolute inset-0 bg-black/5 mix-blend-multiply opacity-0 group-hover:opacity-10 transition-opacity z-10" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={achievement.imageUrl as string} 
                      alt={achievement.title as string}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    />
                  </div>
                </div>

                <div className="text-center px-4 pb-6 relative z-10">
                  <h3 className={`font-serif text-[26px] font-bold ${design.textColor} mb-2 tracking-wide`}>{achievement.title as string}</h3>
                  
                  {studentClass && (
                    <div className="mb-5">
                      <span className={`inline-block border-b-[1.5px] pb-1 ${design.accentColor} border-current opacity-80 font-serif italic text-[15px] font-medium px-2`}>
                        {studentClass}
                      </span>
                    </div>
                  )}
                  
                  <p className={`${design.textColor} text-[15px] leading-relaxed font-serif opacity-90 px-2`}>
                    {descriptionText}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
