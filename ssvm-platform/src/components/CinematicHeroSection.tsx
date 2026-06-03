"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { useGallery, usePublicStats } from "@/lib/api-hooks";



// Slide data with rich content
const slides = [
  {
    id: 1,
    eyebrow: "WELCOME TO SSVM",
    title: "Shaping Young Minds",
    subtitle: "for a Brighter Tomorrow",
    description: "Nurturing an environment that inspires learning, creativity and character. We prepare students to lead with confidence and compassion.",
    cta1: { text: "Explore Our Programs", href: "#programs" },
    cta2: { text: "Admission Open 2025", href: "#admissions" },
    bgGradient: "from-[#0A1628] via-[#1a2942] to-[#2d3e5f]",
    accentColor: "orange",
  },
  {
    id: 2,
    eyebrow: "EXCELLENCE IN EDUCATION",
    title: "Building Future",
    subtitle: "Leaders",
    description: "Empowering students with knowledge, skills and values to excel in a rapidly changing world with confidence and integrity.",
    cta1: { text: "Our Curriculum", href: "#academics" },
    cta2: { text: "Meet Our Faculty", href: "/admin/faculty" },
    bgGradient: "from-[#1a0a28] via-[#2a1a42] to-[#3a2a5f]",
    accentColor: "purple",
  },
  {
    id: 3,
    eyebrow: "HOLISTIC DEVELOPMENT",
    title: "Mind, Body",
    subtitle: "& Spirit",
    description: "Fostering academic excellence alongside physical fitness, creativity and emotional intelligence for well-rounded individuals.",
    cta1: { text: "Campus Life", href: "#campus" },
    cta2: { text: "View Gallery", href: "#gallery" },
    bgGradient: "from-[#0a1a28] via-[#1a2a42] to-[#2a3a5f]",
    accentColor: "blue",
  },
  {
    id: 4,
    eyebrow: "INNOVATIVE APPROACH",
    title: "Empowering",
    subtitle: "Through Tech",
    description: "Integrating modern technology with traditional values to provide a comprehensive, 21st-century education.",
    cta1: { text: "Our Facilities", href: "#facilities" },
    cta2: { text: "Learn More", href: "/about" },
    bgGradient: "from-[#0a1820] via-[#1a2830] to-[#2a3840]",
    accentColor: "blue",
  },
  {
    id: 5,
    eyebrow: "COMMUNITY & CULTURE",
    title: "Rooted in",
    subtitle: "Heritage",
    description: "Celebrating our rich cultural heritage while fostering a global outlook and mutual respect among students.",
    cta1: { text: "Events", href: "#events" },
    cta2: { text: "Contact Us", href: "/contact" },
    bgGradient: "from-[#281010] via-[#381a1a] to-[#482020]",
    accentColor: "orange",
  },
];

export function CinematicHeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: rawHeroGallery } = useGallery("Hero");
  const { data: statsData } = usePublicStats();
  const heroGallery = Array.isArray(rawHeroGallery) ? rawHeroGallery : rawHeroGallery?.data || [];
  const heroImages = heroGallery.map((img: any) => img.imageUrl);

  // Dynamic achievements from API with fallback to defaults
  const achievements = useMemo(() => {
    if (!statsData) {
      return [
        { icon: "🏆", value: "98%", label: "Board Results", color: "from-orange-500 to-orange-600" },
        { icon: "👥", value: "3,200+", label: "Happy Students", color: "from-blue-500 to-blue-600" },
        { icon: "🎓", value: "120+", label: "Expert Teachers", color: "from-purple-500 to-purple-600" },
        { icon: "🏅", value: "250+", label: "Awards Won", color: "from-red-500 to-red-600" },
      ];
    }

    return [
      { icon: "🏆", value: statsData.boardResults || "98%", label: "Board Results", color: "from-orange-500 to-orange-600" },
      { icon: "👥", value: statsData.studentCount || "3,200+", label: "Happy Students", color: "from-blue-500 to-blue-600" },
      { icon: "🎓", value: statsData.teacherCount || "120+", label: "Expert Teachers", color: "from-purple-500 to-purple-600" },
      { icon: "🏅", value: statsData.awardsCount || "250+", label: "Awards Won", color: "from-red-500 to-red-600" },
    ];
  }, [statsData]);

  // Pre-compute random particle positions — fewer on mobile
  const particles = useMemo(() =>
    Array.from({ length: isMobile ? 8 : 20 }, () => ({
      ix: Math.random() * 1400,
      iy: Math.random() * 800,
      ax: Math.random() * 1400,
      ay: Math.random() * 800,
      dur: Math.random() * 10 + 10,
    })),
  [isMobile]);

  const { scrollYProgress } = useScroll();
  // Disable parallax on mobile for performance
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, isMobile ? 0 : 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, isMobile ? 1 : 0]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);

    return () => clearInterval(timer);
  }, [currentSlide]);

  // GSAP cinematic entrance animation
  useEffect(() => {
    if (!titleRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: isMobile ? 40 : 100, scale: isMobile ? 0.95 : 0.8, rotationX: isMobile ? 0 : -15 },
        { opacity: 1, y: 0, scale: 1, rotationX: 0, duration: isMobile ? 0.6 : 1.2, ease: "power4.out", delay: 0.3 }
      );

      gsap.fromTo(
        contentRef.current?.children || [],
        { opacity: 0, y: isMobile ? 20 : 60, x: isMobile ? 0 : -30 },
        { opacity: 1, y: 0, x: 0, duration: isMobile ? 0.5 : 0.8, stagger: 0.15, ease: "power3.out", delay: 0.5 }
      );
    });

    return () => ctx.revert();
  }, [currentSlide, isMobile]);

  // Touch swipe support for mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  const slide = slides[currentSlide];

  // Slide animation variants — simpler on mobile
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? (isMobile ? 300 : 1000) : (isMobile ? -300 : -1000),
      opacity: 0,
      scale: isMobile ? 0.95 : 0.8,
      rotateY: isMobile ? 0 : (direction > 0 ? 45 : -45),
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
      transition: {
        duration: isMobile ? 0.5 : 0.8,
        ease: [0.32, 0.72, 0, 1] as const,
      },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? (isMobile ? -300 : -1000) : (isMobile ? 300 : 1000),
      opacity: 0,
      scale: isMobile ? 0.95 : 0.8,
      rotateY: isMobile ? 0 : (direction > 0 ? -45 : 45),
      transition: {
        duration: isMobile ? 0.5 : 0.8,
        ease: [0.32, 0.72, 0, 1] as const,
      },
    }),
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden pt-[64px] md:pt-[110px] pb-[40px] md:pb-[75px]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Base dark background */}
      <div className="absolute inset-0 bg-[#0A1628]" />

      {/* 2. Photo Cinematic Sliding */}
      <div className="absolute top-[64px] md:top-[110px] left-0 right-0 bottom-0 overflow-hidden z-0">
        <AnimatePresence mode="wait">
          {heroImages.length > 0 && (
            <motion.div
              key={`bg-${currentSlide}`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImages[currentSlide % heroImages.length]}
                alt={`Hero Background ${currentSlide + 1}`}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Gradient & Dark Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient} opacity-30 mix-blend-multiply transition-colors duration-1000 pointer-events-none`} />
      <div className="absolute inset-0 bg-slate-900/30 pointer-events-none" />

      {/* Animated Particles — reduced on mobile */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isMounted && particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full"
              initial={{ x: p.ix, y: p.iy }}
              animate={{ x: p.ax, y: p.ay, scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: p.dur, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>
      )}

      {/* Geometric Patterns */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
      </div>

      <motion.div style={{ y: parallaxY, opacity }} className="relative w-full max-w-[1400px] mx-auto px-4 md:px-[5%] z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 items-center">
          {/* Left Content - Slide Content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="text-white"
            >
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[10px] md:text-xs font-semibold mb-4 md:mb-6 uppercase tracking-[0.15em] md:tracking-[0.2em]"
              >
                {slide.eyebrow}
              </motion.div>

              {/* Title */}
              <div ref={titleRef} className="mb-4 md:mb-6 perspective-1000">
                <h1 className="text-[clamp(28px,7vw,80px)] md:text-[clamp(40px,6vw,80px)] font-black leading-[0.95] tracking-tight">
                  {slide.title}
                  <br />
                  <span
                    className={`text-transparent bg-clip-text bg-gradient-to-r ${
                      slide.accentColor === "orange"
                        ? "from-orange-400 via-orange-500 to-orange-600"
                        : slide.accentColor === "purple"
                        ? "from-purple-400 via-purple-500 to-purple-600"
                        : "from-blue-400 via-blue-500 to-blue-600"
                    }`}
                  >
                    {slide.subtitle}
                  </span>
                </h1>
              </div>

              {/* Content */}
              <div ref={contentRef}>
                <p className="text-white/80 text-[14px] md:text-[18px] leading-relaxed mb-6 md:mb-8 max-w-[560px]">
                  {slide.description}
                </p>

                {/* Progress Indicators */}
                <div className="flex gap-2 md:gap-3">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className="group relative h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer border-none p-0"
                      style={{ width: index === currentSlide ? "40px" : "24px" }}
                    >
                      {index === currentSlide && (
                        <motion.div
                          className={`absolute inset-0 bg-gradient-to-r ${
                            slide.accentColor === "orange"
                              ? "from-orange-400 to-orange-600"
                              : slide.accentColor === "purple"
                              ? "from-purple-400 to-purple-600"
                              : "from-blue-400 to-blue-600"
                          }`}
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 6, ease: "linear" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right - Achievement Cards — Desktop */}
          <div className="relative hidden lg:block">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: 0.5, duration: 1, ease: "backOut" }}
              className="relative"
            >
              {/* Main Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/school-logo.png" alt="School Logo" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Our Achievements</h3>
                    <p className="text-white/60 text-sm">Excellence in Education</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {achievements.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1, type: "spring" }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className={`bg-gradient-to-br ${item.color} rounded-2xl p-6 cursor-pointer group`}
                    >
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="text-white text-3xl font-black mb-1">{item.value}</div>
                      <div className="text-white/80 text-sm font-medium">{item.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-orange-400/20 to-orange-600/20 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full blur-2xl"
              />
            </motion.div>
          </div>
        </div>

        {/* Mobile Achievement Strip */}
        <div className="block lg:hidden mt-8">
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
            {achievements.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`bg-gradient-to-br ${item.color} rounded-xl p-4 min-w-[130px] snap-start flex-shrink-0`}
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-white text-xl font-black">{item.value}</div>
                <div className="text-white/80 text-[11px] font-medium">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Navigation Arrows — hidden on mobile (swipe instead) */}
      <button
        onClick={prevSlide}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 items-center justify-center text-white hover:bg-white/20 transition-all z-20 cursor-pointer"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 items-center justify-center text-white hover:bg-white/20 transition-all z-20 cursor-pointer"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Scroll Indicator — desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-white/50 z-20"
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-white rounded-full"
          />
        </div>
        <span className="text-xs uppercase tracking-wider">Scroll</span>
      </motion.div>
    </section>
  );
}
