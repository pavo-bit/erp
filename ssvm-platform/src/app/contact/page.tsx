"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { NewNavbar, NewFooter } from "@/components";

const contactInfo = [
  {
    icon: "📍",
    title: "Visit Us",
    lines: ["Saraswati Shishu Vidya Mandir", "College Square, Cuttack", "Odisha, India - 753003"],
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: "📞",
    title: "Call Us",
    lines: ["(0671) 2548577", "(0671) 3582999", "Mon-Sat: 8:00 AM - 4:00 PM"],
    color: "from-green-500 to-green-600",
  },
  {
    icon: "✉️",
    title: "Email Us",
    lines: ["ssvmcollegesquare1987@gmail.com", "We reply within 24 hours"],
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: "🌐",
    title: "Office Hours",
    lines: ["Monday - Friday: 8AM - 4PM", "Saturday: 8AM - 1PM", "Sunday: Closed"],
    color: "from-orange-500 to-orange-600",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        console.error('Failed to send message');
        alert('Failed to send message. Please try again later.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <NewNavbar />
      <main className="min-h-screen bg-[#f8f9fc]">
        {/* Hero Header */}
        <section className="relative pt-[110px] bg-[#0A1628] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
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
                📬 Get In Touch
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[clamp(36px,5vw,64px)] font-black text-white leading-tight mb-4"
              >
                Contact{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-500 to-green-600">
                  Us
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-lg md:text-xl max-w-[650px] mx-auto leading-relaxed"
              >
                We&apos;d love to hear from you. Reach out for admissions, queries, or just to say hello!
              </motion.p>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 60V30C240 0 480 0 720 15C960 30 1200 45 1440 30V60H0Z" fill="#f8f9fc" />
            </svg>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactInfo.map((info, index) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-2xl p-7 shadow-lg hover:shadow-2xl transition-all group cursor-pointer border border-gray-100 text-center"
                >
                  <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                    {info.icon}
                  </div>
                  <h3 className="text-[#0A1628] text-lg font-bold mb-3">{info.title}</h3>
                  {info.lines.map((line) => (
                    <p key={line} className="text-gray-500 text-sm leading-relaxed break-words">
                      {line}
                    </p>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form + Map */}
        <section className="py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="mb-8">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-4 uppercase tracking-wider">
                    Send a Message
                  </div>
                  <h2 className="text-3xl font-bold text-[#0A1628] mb-2">Write to Us</h2>
                  <p className="text-gray-500">Fill out the form and we&apos;ll get back to you soon.</p>
                </div>

                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium"
                  >
                    ✅ Thank you! Your message has been sent successfully. We&apos;ll get back to you soon.
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-[#0A1628] mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0A1628] mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-[#0A1628] mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                        placeholder="+91-XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0A1628] mb-2">Subject *</label>
                      <select
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                      >
                        <option value="">Select a subject</option>
                        <option value="admission">Admission Enquiry</option>
                        <option value="fee">Fee Structure</option>
                        <option value="transport">Transport</option>
                        <option value="academic">Academic Query</option>
                        <option value="complaint">Complaint</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#0A1628] mb-2">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[#0A1628] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
                      placeholder="Write your message here..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm uppercase tracking-wider hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Sending..." : "Send Message →"}
                  </button>
                </form>
              </motion.div>

              {/* Map / Location */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="mb-8">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mb-4 uppercase tracking-wider">
                    Find Us
                  </div>
                  <h2 className="text-3xl font-bold text-[#0A1628] mb-2">Our Location</h2>
                  <p className="text-gray-500">Visit our campus at College Square, Cuttack.</p>
                </div>

                {/* Map embed */}
                <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 h-[400px] bg-gray-100 relative group">
                  <a 
                    href="https://www.google.com/maps/place/Saraswati+Shishu+Vidya+Mandir+College+Square+Cuttack,+Zunuspatna+College+Square,+Odisha+753003/data=!4m2!3m1!1s0x3a190d7e9d0504f1:0xf106d1e4af6b5c59!18m1!1e1?utm_source=mstt_1&entry=gps&coh=192189&g_ep=CAESBzI2LjIxLjIYACCIJyqfASw5NDI2NzcyNyw5NDI5MjE5NSw5NDI5OTUzMiwxMDA3OTY0OTgsMTAwNzk3NzYxLDEwMDc5NjUzNSwxMDA4MTUwMzYsOTQyODA1NzYsOTQyMDczOTQsOTQyMDc1MDYsOTQyMDg1MDYsOTQyMTg2NTMsOTQyMjk4MzksOTQyNzUxNjgsOTQyNzk2MTksMTAwODE1NjM1LDEwMDc5MjU3MkICSU4%3D&skid=9d0d83f1-9671-4efb-bbbd-4f3e1b61b321&g_st=aw" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute top-4 right-4 z-10"
                    aria-label="Open in Google Maps"
                  >
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold text-[#0A1628] shadow-lg flex items-center gap-2 hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                      <span>📍</span> Open in Google Maps
                    </div>
                  </a>
                  <iframe
                    src="https://maps.google.com/maps?q=Saraswati+Shishu+Vidya+Mandir+College+Square+Cuttack,+Zunuspatna+College+Square,+Odisha+753003&t=&z=15&ie=UTF8&iwloc=&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="School Location"
                    className="w-full h-full"
                  />
                </div>

                {/* Quick Links */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-[#0A1628] to-[#1a2942] rounded-xl p-5 text-center">
                    <div className="text-2xl mb-2">📞</div>
                    <div className="text-white text-sm font-bold">Call Now</div>
                    <div className="text-white/60 text-xs mt-1">(0671) 2548577</div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0A1628] to-[#1a2942] rounded-xl p-5 text-center">
                    <div className="text-2xl mb-2">✉️</div>
                    <div className="text-white text-sm font-bold">Email Us</div>
                    <div className="text-white/60 text-xs mt-1 break-all">ssvmcollegesquare1987@gmail.com</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <NewFooter />
    </>
  );
}
