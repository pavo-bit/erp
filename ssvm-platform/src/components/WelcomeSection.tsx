"use client";

import { motion } from "framer-motion";

export function WelcomeSection() {
  return (
    <section className="py-16 md:py-28 bg-white relative overflow-hidden">
      {/* Subtle decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-4 md:px-[5%]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Side - Text Content (Reveals from Left) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold mb-6 uppercase tracking-[0.2em]"
            >
              <span className="text-base">🙏</span> Welcome to SSVM
            </motion.div>

            {/* Heading */}
            <h2 className="text-[clamp(32px,4vw,56px)] font-black text-[#0A1628] leading-[1.1] mb-6">
              Nurturing Minds with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500">
                Traditional Wisdom
              </span>{" "}
              & Modern Knowledge.
            </h2>

            {/* Decorative divider */}
            <div className="w-20 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mb-8" />

            {/* Description */}
            <p className="text-gray-600 text-lg md:text-xl leading-relaxed mb-6 font-medium">
              Rooted in Indian values and driven by a passion for excellence, Saraswati Shishu Vidya Mandir, College Square, Cuttack has been a beacon of quality education since 1987.
            </p>

            <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-10">
              Under the banner of Vidya Bharati, our mission is to develop well-rounded individuals who are academically proficient, morally upright, and socially responsible — ready to face the challenges of a rapidly evolving world with confidence and compassion.
            </p>

            {/* Interactive Stats/Features in Welcome Section */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 text-xl font-bold shadow-inner">
                  🕉️
                </div>
                <div>
                  <h4 className="font-bold text-[#0A1628]">Indian Values</h4>
                  <p className="text-sm text-gray-500">Cultural foundation</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold shadow-inner">
                  🚀
                </div>
                <div>
                  <h4 className="font-bold text-[#0A1628]">Modern Edu</h4>
                  <p className="text-sm text-gray-500">21st century skills</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Image Composition (Reveals from Right) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative h-[500px] md:h-[600px] w-full mt-10 lg:mt-0"
          >
            {/* Background Shape */}
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-transparent rounded-[3rem] transform rotate-3 scale-95" />
            
            {/* Main Large Image */}
            <div className="absolute top-0 right-0 w-[85%] h-[80%] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="absolute inset-0 bg-[#0A1628]/10 group-hover:bg-transparent transition-colors z-10" />
              {/* Using a beautiful generic educational placeholder */}
              <img 
                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1000&auto=format&fit=crop" 
                alt="Students studying" 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Overlapping Small Image */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="absolute bottom-[5%] left-0 w-[55%] h-[45%] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white z-20"
            >
              <img 
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop" 
                alt="School activities" 
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
              />
            </motion.div>

            {/* Floating Experience Badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[10%] left-[-5%] bg-white rounded-2xl p-4 shadow-xl border border-gray-100 z-30 flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                37+
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Years of</p>
                <p className="text-sm font-black text-[#0A1628]">Excellence</p>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
