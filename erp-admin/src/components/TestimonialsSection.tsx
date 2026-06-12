"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "My children have blossomed here. The teachers know each child personally and the school's emphasis on Indian values alongside academics is truly unique.",
    initials: "SK",
    name: "Sujata Kumar",
    role: "Parent · Class VII & IX",
  },
  {
    quote:
      "I studied here from Class I to XII. The discipline, values, and academic foundation I received made me who I am today. Proud alumnus!",
    initials: "RB",
    name: "Rajat Behera",
    role: "Alumnus · Batch 2018 · IIT Bhubaneswar",
  },
  {
    quote:
      "The school's annual cultural programme is extraordinary. My daughter has developed so much confidence through their performing arts programme.",
    initials: "PM",
    name: "Priti Mohanty",
    role: "Parent · Class V",
  },
  {
    quote:
      "100% pass result in Matric this year is no accident. The teachers work tirelessly and the school's mentorship programme is exceptional.",
    initials: "AS",
    name: "Ashok Swain",
    role: "Parent · Class X",
  },
  {
    quote:
      "The emphasis on yoga and Sanskrit alongside modern curriculum gives our children a balanced education that very few schools can offer.",
    initials: "DN",
    name: "Deepa Nanda",
    role: "Parent · Class III",
  },
  {
    quote:
      "Best decision we made. Our son went from shy to confident, secured 96% in boards and is now pursuing MBBS. The school deserves all credit.",
    initials: "TK",
    name: "Tapan Kumar",
    role: "Parent · Alumnus Parent",
  },
];

function TestimonialCard({
  quote,
  initials,
  name,
  role,
}: (typeof testimonials)[number]) {
  return (
    <div className="min-w-[340px] bg-white rounded-2xl p-7 border-[1.5px] border-border shrink-0">
      <div className="text-primary text-[14px] mb-3.5 tracking-[2px]">
        ★★★★★
      </div>
      <p className="text-[15px] text-text-primary leading-[1.7] mb-5 italic">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white font-[var(--font-heading)]"
          style={{ background: "linear-gradient(135deg, #FF6B00, #FF9933)" }}
        >
          {initials}
        </div>
        <div>
          <span className="block text-[14px] font-semibold font-[var(--font-heading)]">
            {name}
          </span>
          <span className="text-[12px] text-text-secondary">{role}</span>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  // Duplicate for infinite scroll
  const allCards = [...testimonials, ...testimonials];

  return (
    <section className="py-24 px-[5%] bg-surface overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-primary mb-3 block font-[var(--font-heading)]">
          What People Say
        </span>
        <h2 className="text-[clamp(28px,3vw,42px)] font-bold text-text-primary leading-[1.2] font-[var(--font-heading)]">
          Voices of Our Community
        </h2>
      </motion.div>

      <div className="overflow-hidden">
        <div
          className="flex gap-6 hover:[animation-play-state:paused]"
          style={{ animation: "scroll-left 35s linear infinite" }}
        >
          {allCards.map((testimonial, i) => (
            <TestimonialCard key={`${testimonial.initials}-${i}`} {...testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
