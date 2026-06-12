"use client";

import { motion } from "framer-motion";

export function WelcomeSection() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-orange-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative max-w-[1100px] mx-auto px-[5%] text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-block px-5 py-2 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-6 uppercase tracking-[0.2em]"
          >
            🙏 Welcome
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-[clamp(28px,4vw,48px)] font-black text-[#0A1628] leading-tight mb-6"
          >
            Welcome to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500">
              Saraswati Shishu Vidya Mandir
            </span>
          </motion.h2>

          {/* Decorative divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-24 h-1 mx-auto bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mb-8"
          />

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 text-lg md:text-xl leading-relaxed mb-6 max-w-[850px] mx-auto"
          >
            Rooted in Indian values and driven by a passion for excellence, Saraswati Shishu Vidya Mandir, College Square, Cuttack has been a beacon of quality education since 1987. Under the banner of Vidya Bharati, we nurture young minds with a perfect blend of traditional wisdom and modern knowledge.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="text-gray-500 text-base md:text-lg leading-relaxed max-w-[800px] mx-auto"
          >
            Our mission is to develop well-rounded individuals who are academically proficient, morally upright, and socially responsible — ready to face the challenges of a rapidly evolving world with confidence and compassion.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
