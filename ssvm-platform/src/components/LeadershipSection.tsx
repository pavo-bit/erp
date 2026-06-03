"use client";

import { motion } from "framer-motion";
import { useGallery } from "@/lib/api-hooks";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const leaders = [
  { title: "Pradhan Acharya", role: "Head of Institution", description: "Leading with vision and dedication towards academic excellence and holistic student development.", gradient: "from-orange-500 to-orange-600", bgGlow: "bg-orange-500/10", placeholder: "PA" },
  { title: "Secretary", role: "School Secretary", description: "Ensuring seamless operations and administrative excellence for the institution's growth.", gradient: "from-blue-500 to-blue-600", bgGlow: "bg-blue-500/10", placeholder: "S" },
  { title: "President", role: "School President", description: "Guiding the school's mission with strategic leadership and community engagement.", gradient: "from-purple-500 to-purple-600", bgGlow: "bg-purple-500/10", placeholder: "P" },
  { title: "Vice President", role: "Vice President", description: "Fostering community relations and institutional growth.", gradient: "from-emerald-500 to-emerald-600", bgGlow: "bg-emerald-500/10", placeholder: "VP" },
  { title: "Joint Secretary", role: "Joint Secretary", description: "Assisting in core administrative operations.", gradient: "from-rose-500 to-rose-600", bgGlow: "bg-rose-500/10", placeholder: "JS" },
  { title: "Treasurer", role: "Financial Head", description: "Managing resources for sustainable development.", gradient: "from-amber-500 to-amber-600", bgGlow: "bg-amber-500/10", placeholder: "T" },
  { title: "Academic Director", role: "Academics", description: "Designing innovative curriculum and learning methodologies.", gradient: "from-cyan-500 to-cyan-600", bgGlow: "bg-cyan-500/10", placeholder: "AD" },
  { title: "Sports Director", role: "Athletics", description: "Building character through sports and physical education.", gradient: "from-red-500 to-red-600", bgGlow: "bg-red-500/10", placeholder: "SD" },
  { title: "Cultural Head", role: "Arts & Culture", description: "Preserving heritage and nurturing artistic talents.", gradient: "from-indigo-500 to-indigo-600", bgGlow: "bg-indigo-500/10", placeholder: "CH" },
];

export function LeadershipSection() {
  const { data: rawPillars } = useGallery("Pillars");
  const pillarsPhotos = Array.isArray(rawPillars) ? rawPillars : rawPillars?.data || [];

  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    // We only want the horizontal scroll on desktop. On mobile, we can use native horizontal scroll for better UX.
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) return;

    const ctx = gsap.context(() => {
      const slider = sliderRef.current;
      if (!slider || !slider.parentElement) return;

      const getScrollAmount = () => {
        // Calculate the exact amount needed to scroll to the end of the container
        const parentWidth = slider.parentElement!.offsetWidth;
        // Adding extra padding at the end so the last card isn't hugging the edge mask
        return -(slider.scrollWidth - parentWidth + 100); 
      };

      const tween = gsap.to(slider, {
        x: getScrollAmount,
        ease: "none",
      });

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: () => `+=${slider.scrollWidth}`,
        pin: true,
        animation: tween,
        scrub: 1,
        invalidateOnRefresh: true,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-12 md:py-20 bg-gray-50 relative overflow-hidden md:h-screen flex flex-col justify-center">
      {/* Decorative background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-100/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-4 md:px-[5%]">
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

        {/* Horizontal Sliding Cards */}
        <div 
          className="w-full overflow-hidden md:pl-[5vw]"
          style={{ 
            maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)"
          }}
        >
          <div 
            ref={sliderRef}
            className="flex gap-5 md:gap-8 px-4 md:px-0 overflow-x-auto md:overflow-x-visible snap-x md:snap-none hide-scrollbar pb-10 pt-4"
            style={{ width: "max-content", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {leaders.map((leader, index) => (
              <motion.div
                key={leader.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (index % 3) * 0.15, type: "spring", stiffness: 100 }}
                whileHover={{ y: -10 }}
                className="w-[85vw] sm:w-[320px] md:w-[340px] shrink-0 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all group cursor-pointer border border-gray-100 overflow-hidden"
              >
                {/* Photo area */}
                <div className="relative h-[200px] md:h-[320px] overflow-hidden">
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
                        <div className="w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500 border-4 border-white z-10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={uploadedPhoto.imageUrl} 
                            alt={leader.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-28 h-28 md:w-40 md:h-40 rounded-full bg-gradient-to-br ${leader.gradient} flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500 z-10`}>
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
      </div>
    </section>
  );
}
