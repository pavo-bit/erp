"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { NewNavbar, NewFooter, EnquiryModal } from "@/components";

const admissionSteps = [
  {
    step: "01",
    icon: "📋",
    title: "Enquiry & Registration",
    description: "Fill out the online enquiry form or visit our campus for a personal consultation. Our admissions team will guide you through the process.",
    color: "from-blue-500 to-blue-600",
  },
  {
    step: "02",
    icon: "📝",
    title: "Application Form",
    description: "Complete the detailed application form with student and parent information. Submit required documents including previous academic records.",
    color: "from-purple-500 to-purple-600",
  },
  {
    step: "03",
    icon: "🎯",
    title: "Assessment & Interaction",
    description: "Students undergo an age-appropriate assessment. Parents and students meet with school counselors and faculty members.",
    color: "from-green-500 to-green-600",
  },
  {
    step: "04",
    icon: "✅",
    title: "Admission Confirmation",
    description: "Upon selection, complete the fee payment and enrollment formalities. Welcome to the school family!",
    color: "from-orange-500 to-orange-600",
  },
];

const features = [
  { icon: "🎯", title: "Campus Tours", description: "Schedule a visit to explore our state-of-the-art facilities and vibrant campus life." },
  { icon: "👨‍🏫", title: "Meet Our Teachers", description: "Interact with our experienced and dedicated faculty who shape young minds." },
  { icon: "🎓", title: "Early Admissions", description: "Avail early bird benefits and secure your child's spot for the upcoming session." },
  { icon: "📞", title: "Counseling Support", description: "Get personalized guidance from our admissions counselors for the right stream." },
  { icon: "💰", title: "Fee Structure", description: "Transparent and competitive fee structure with flexible payment options available." },
  { icon: "🚌", title: "Transport Facility", description: "Safe and reliable school transport covering all major areas of the city." },
];

const documents = [
  "Birth Certificate (original & photocopy)",
  "Transfer Certificate from previous school",
  "Report Card / Mark Sheet of last class attended",
  "4 Passport-size photographs of the student",
  "Aadhar Card of student and parents",
  "Address proof (Electricity Bill / Rental Agreement)",
  "Caste Certificate (if applicable)",
  "Medical fitness certificate",
];

export default function AdmissionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <NewNavbar />
      <EnquiryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <main className="min-h-screen bg-[#f8f9fc]">
        {/* Hero Header */}
        <section className="relative pt-[110px] bg-gradient-to-br from-[#0A1628] via-[#1a2942] to-[#0A1628] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
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
                🎓 Join Us
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[clamp(36px,5vw,64px)] font-black text-white leading-tight mb-4"
              >
                Admissions{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
                  Open 2025-26
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-lg md:text-xl max-w-[650px] mx-auto mb-8 leading-relaxed"
              >
                Give your child the best start with our world-class education. Begin your child&apos;s journey with us today.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-4 justify-center flex-wrap"
              >
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm uppercase tracking-wider hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 no-underline cursor-pointer border-none"
                >
                  Apply Now →
                </button>
                <Link
                  href="/contact"
                  className="px-8 py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wider border-2 border-white/30 hover:border-white/60 hover:bg-white/10 transition-all duration-300 no-underline"
                >
                  Contact Us
                </Link>
              </motion.div>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 60V30C240 0 480 0 720 15C960 30 1200 45 1440 30V60H0Z" fill="#f8f9fc" />
            </svg>
          </div>
        </section>

        {/* Admission Process */}
        <section className="py-16">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <div className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-4 uppercase tracking-wider">
                How It Works
              </div>
              <h2 className="text-[clamp(28px,4vw,44px)] font-bold text-[#0A1628]">
                Admission Process
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {admissionSteps.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  whileHover={{ y: -8 }}
                  className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all group border border-gray-100"
                >
                  <div className={`absolute -top-4 -left-2 text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br ${item.color} opacity-20`}>
                    {item.step}
                  </div>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                    {item.icon}
                  </div>
                  <h3 className="text-[#0A1628] text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features & Documents Grid */}
        <section className="py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* What We Offer */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-8"
                >
                  <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mb-4 uppercase tracking-wider">
                    What We Offer
                  </div>
                  <h2 className="text-3xl font-bold text-[#0A1628]">Facilities & Support</h2>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-50 rounded-xl p-5 hover:bg-orange-50 hover:shadow-md transition-all group cursor-pointer border border-gray-100"
                    >
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{feature.icon}</div>
                      <h3 className="text-[#0A1628] text-base font-bold mb-1">{feature.title}</h3>
                      <p className="text-gray-500 text-xs leading-relaxed">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Required Documents */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-8"
                >
                  <div className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-600 text-xs font-semibold mb-4 uppercase tracking-wider">
                    Checklist
                  </div>
                  <h2 className="text-3xl font-bold text-[#0A1628]">Required Documents</h2>
                </motion.div>

                <div className="bg-gradient-to-br from-[#0A1628] to-[#1a2942] rounded-2xl p-8 shadow-2xl">
                  <div className="space-y-4">
                    {documents.map((doc, index) => (
                      <motion.div
                        key={doc}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 group"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                        </div>
                        <span className="text-white/80 text-sm leading-relaxed group-hover:text-white transition-colors">
                          {doc}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 pt-6 border-t border-white/10"
                  >
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold hover:from-orange-600 hover:to-orange-700 transition-all no-underline"
                    >
                      Start Application →
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <NewFooter />
    </>
  );
}
