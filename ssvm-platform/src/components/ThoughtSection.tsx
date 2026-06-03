"use client";

import { motion } from "framer-motion";

export function ThoughtSection() {
  return (
    <section className="relative py-12 md:py-20 overflow-hidden bg-gradient-to-b from-[#FFF8F0] to-[#FFF1E0]">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute bottom-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-orange-100/40 blur-3xl" />
        {/* Subtle Om pattern watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] text-orange-100/20 font-serif select-none pointer-events-none">
          ॐ
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8 md:mb-14"
        >
          <span className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 text-orange-700 text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4 tracking-wide">
            🙏 श्लोक विचार
          </span>
          <h2 className="text-[clamp(28px,4vw,42px)] font-extrabold text-[#1a1a2e] leading-tight">
            Thought of{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
              Inspiration
            </span>
          </h2>
          <p className="text-gray-500 text-[15px] mt-3 max-w-xl mx-auto leading-relaxed">
            A timeless teaching from the Bhagavad Gita that guides our pursuit of knowledge and righteous action
          </p>
        </motion.div>

        {/* Main Content - Image Left, Text Right */}
        <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-10 lg:gap-16">
          {/* Left - Image */}
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:w-[45%] w-full flex-shrink-0"
          >
            <div className="relative group">
              {/* Decorative frame */}
              <div className="absolute -inset-3 bg-gradient-to-br from-orange-400/30 via-orange-300/20 to-amber-400/30 rounded-3xl blur-sm group-hover:blur-md transition-all duration-500" />
              <div className="absolute -inset-1 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
              
              <div className="relative bg-white rounded-2xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Ornamental top border */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
                
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/gita-updesh.png"
                  alt="Shrimad Bhagavad Gita - Lord Krishna teaching Arjuna"
                  className="w-full h-auto rounded-xl object-cover aspect-[4/3]"
                />
                
                {/* Image caption */}
                <div className="mt-3 text-center pb-1">
                  <p className="text-orange-600 text-[13px] font-semibold tracking-wide">
                    श्रीमद् भगवद्गीता — गीतोपदेश
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Shloka and Meaning */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="lg:w-[55%] w-full"
          >
            {/* Shloka Card */}
            <div className="relative mb-5 md:mb-8">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 via-amber-400 to-orange-500 rounded-full" />
              
              <div className="bg-white/80 backdrop-blur-sm border border-orange-100 rounded-2xl p-5 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                {/* Shloka label */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    📖
                  </div>
                  <span className="text-orange-600 text-[13px] font-bold tracking-widest uppercase">
                    श्लोक — Shloka
                  </span>
                </div>

                {/* Sanskrit Shloka */}
                <div className="space-y-2">
                  <p className="text-[clamp(18px,2.5vw,24px)] font-bold text-[#2d1810] leading-relaxed" style={{ fontFamily: "'Noto Sans Devanagari', serif" }}>
                    यतः प्रवृत्तिर्भूतानां येन सर्वमिदं ततम् ।
                  </p>
                  <p className="text-[clamp(18px,2.5vw,24px)] font-bold text-[#2d1810] leading-relaxed" style={{ fontFamily: "'Noto Sans Devanagari', serif" }}>
                    स्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः ॥
                  </p>
                </div>

                {/* Reference */}
                <div className="mt-4 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200/60 text-orange-700 text-[13px] font-semibold px-3.5 py-1.5 rounded-full">
                  📜 গীতা : ୧୮-୪୬ (Gita : 18-46)
                </div>
              </div>
            </div>

            {/* Meaning Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-teal-400 to-emerald-500 rounded-full" />
                
                <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 backdrop-blur-sm border border-emerald-100 rounded-2xl p-5 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                  {/* Meaning label */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                      💡
                    </div>
                    <span className="text-emerald-700 text-[13px] font-bold tracking-widest uppercase">
                      ଅର୍ଥ — Meaning
                    </span>
                  </div>

                  {/* Odia meaning */}
                  <p className="text-[clamp(15px,2vw,18px)] text-gray-700 leading-[1.9]" style={{ fontFamily: "'Noto Sans Oriya', sans-serif" }}>
                    ଯେଉଁ ପରମେଶ୍ୱରଙ୍କଠାରୁ ସମସ୍ତ ପ୍ରାଣୀ ଉତ୍ପତ୍ତି ହୋଇଛି ଏବଂ ଯାହାଙ୍କ ଦ୍ୱାରା
                    ଏହି ସମସ୍ତ ଜଗତ ପରିବ୍ୟାପ୍ତ ହୋଇଛି, ସେହି ପରମେଶ୍ୱରଙ୍କୁ ନିଜର
                    ସ୍ୱାଭାବିକ କର୍ମମାନଙ୍କ ଦ୍ୱାରା ପୂଜା କରି ମନୁଷ୍ୟ ପରମସିଦ୍ଧି ପାଇଥାଏ ।
                  </p>

                  {/* English translation */}
                  <div className="mt-5 pt-5 border-t border-emerald-200/60">
                    <p className="text-[14px] text-emerald-800/70 leading-relaxed italic">
                      &ldquo;From whom all beings originate and by whom all this is pervaded — by worshipping Him through one&apos;s own natural duties, a person attains supreme perfection.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
