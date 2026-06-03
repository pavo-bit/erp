"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnquiryModal({ isOpen, onClose }: EnquiryModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Auto close after 3 seconds
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setStep(1);
          setIsSuccess(false);
        }, 500); // Reset after modal is closed
      }, 3000);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors z-10"
              >
                ✕
              </button>

              <div className="p-8">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-10"
                  >
                    <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                      <span className="text-4xl">✅</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Request Submitted!</h3>
                    <p className="text-white/70">
                      Thank you for your interest. Our admissions team will contact you shortly.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-8 text-center">
                      <div className="inline-block px-4 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">
                        Admission Enquiry
                      </div>
                      <h2 className="text-2xl font-bold text-white">Start Application</h2>
                      <p className="text-white/60 text-sm mt-2">
                        {step === 1 ? "Step 1: Student Information" : "Step 2: Parent Information"}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {step === 1 ? (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-white/70 text-xs font-medium mb-1.5 ml-1">Student's Full Name</label>
                            <input
                              type="text"
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                              placeholder="Enter student's name"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-white/70 text-xs font-medium mb-1.5 ml-1">Grade Applying For</label>
                              <select required className="w-full bg-[#1a2942]/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all appearance-none cursor-pointer">
                                <option value="" disabled selected>Select Grade</option>
                                <option value="Prarambha">Prarambha</option>
                                <option value="Bodha">Bodha</option>
                                <option value="1">Class 1</option>
                                <option value="2">Class 2</option>
                                <option value="3">Class 3</option>
                                <option value="4">Class 4</option>
                                <option value="5">Class 5</option>
                                <option value="6">Class 6</option>
                                <option value="7">Class 7</option>
                                <option value="8">Class 8</option>
                                <option value="9">Class 9</option>
                                <option value="10">Class 10</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-white/70 text-xs font-medium mb-1.5 ml-1">Academic Year</label>
                              <select required className="w-full bg-[#1a2942]/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all appearance-none cursor-pointer">
                                <option value="2025-2026">2025 - 2026</option>
                                <option value="2026-2027">2026 - 2027</option>
                              </select>
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transform transition-all active:scale-[0.98]"
                          >
                            Next Step →
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-white/70 text-xs font-medium mb-1.5 ml-1">Parent's Name</label>
                            <input
                              type="text"
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-all"
                              placeholder="Enter parent's name"
                            />
                          </div>
                          <div>
                            <label className="block text-white/70 text-xs font-medium mb-1.5 ml-1">Phone Number</label>
                            <input
                              type="tel"
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-all"
                              placeholder="+91 "
                            />
                          </div>
                          <div>
                            <label className="block text-white/70 text-xs font-medium mb-1.5 ml-1">Email Address</label>
                            <input
                              type="email"
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-all"
                              placeholder="name@example.com"
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="w-1/3 bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 px-4 rounded-xl transition-all"
                            >
                              Back
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-2/3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {isSubmitting ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Submit Enquiry"
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
