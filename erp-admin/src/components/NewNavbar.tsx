"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { LoginModal } from "./LoginModal";

import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Academics", href: "/academics" },
  { name: "Admissions", href: "/admissions" },
  { name: "Gallery", href: "/gallery" },
  { name: "News & Events", href: "/events" },
  { name: "About Us", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export function NewNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -120 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
          scrolled ? "bg-[#0A1628] shadow-lg" : "bg-[#0A1628]/95 backdrop-blur-sm"
        }`}
      >
        <div className="w-full mx-auto px-4 lg:px-6 xl:px-8 flex items-center justify-between h-[130px]">
          {/* Left Logos */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Far Left Logo - Samiti */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/samiti-logo.png"
              alt="Samiti Logo"
              className="h-[115px] w-auto object-contain"
            />
            
            {/* School Logo & Name */}
            <Link href="/" className="flex items-center gap-4 no-underline group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/school-logo.png"
                alt="School Logo"
                className="h-[115px] w-auto object-contain"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-white text-[20px] font-bold tracking-tight">
                  Saraswati Shishu Vidya Mandir
                </span>
                <span className="text-orange-400 text-[15px] font-medium tracking-wide mt-1">
                  College Square • Estd. 1987
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <ul className="hidden lg:flex items-center gap-4 xl:gap-8 list-none m-0 flex-1 justify-center">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="text-white/90 text-[16px] xl:text-[18px] font-medium no-underline hover:text-orange-400 transition-colors duration-200 whitespace-nowrap"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Logo */}
          <div className="hidden lg:flex items-center flex-shrink-0 ml-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vidya-bharati-logo.png"
              alt="Vidya Bharati"
              className="h-[115px] w-auto object-contain"
            />
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex lg:hidden flex-col gap-2 p-2 bg-transparent border-none cursor-pointer"
          >
            <span className={`w-7 h-0.5 bg-white transition-all ${mobileOpen ? "rotate-45 translate-y-[10px]" : ""}`} />
            <span className={`w-7 h-0.5 bg-white transition-all ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`w-7 h-0.5 bg-white transition-all ${mobileOpen ? "-rotate-45 -translate-y-[10px]" : ""}`} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed top-[130px] left-0 right-0 bottom-0 bg-[#0A1628] z-[999] px-[5%] pt-8 overflow-y-auto"
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-white text-xl font-medium no-underline py-4 border-b border-white/10 hover:text-orange-400"
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
