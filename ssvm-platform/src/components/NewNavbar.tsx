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
  { name: "Alumni", href: "/alumni" },
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
        {/* Desktop Navbar */}
        <div className="hidden md:flex w-full mx-auto px-4 lg:px-6 xl:px-8 items-center justify-between h-[130px]">
          {/* Left Logos */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* School Logo & Name */}
            <Link href="/" className="flex items-center gap-4 no-underline group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/samiti-logo.png"
                alt="Sikhya Bikash Samiti Logo"
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
          <ul className="hidden lg:flex items-center gap-4 xl:gap-8 list-none m-0 flex-1 justify-start pl-6 xl:pl-12">
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

          {/* Right Section: Payment Button + Logo */}
          <div className="hidden lg:flex items-center gap-4 flex-shrink-0 ml-auto">
            <a
              href="http://onlinepay.ssvmcuttack.in/Login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-400 text-white font-semibold text-[14px] xl:text-[16px] shadow-lg hover:shadow-green-500/30 transition-all hover:-translate-y-0.5 no-underline whitespace-nowrap"
            >
              💳 Click to Payment
            </a>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vidya-bharati-logo.png"
              alt="Vidya Bharati"
              className="h-[115px] w-auto object-contain ml-2"
            />
          </div>
        </div>

        {/* Mobile Navbar */}
        <div className="flex md:hidden w-full px-3 items-center justify-between h-[64px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/samiti-logo.png"
              alt="Sikhya Bikash Samiti Logo"
              className="h-[44px] w-auto object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-white text-[13px] font-bold tracking-tight">
                SSVM
              </span>
              <span className="text-orange-400 text-[10px] font-medium">
                College Square
              </span>
            </div>
          </Link>

          {/* Right side: Vidya Bharati mini + Hamburger */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vidya-bharati-logo.png"
              alt="Vidya Bharati"
              className="h-[40px] w-auto object-contain"
            />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex flex-col gap-[5px] p-2 bg-transparent border-none cursor-pointer"
              aria-label="Toggle menu"
            >
              <span className={`w-6 h-[2px] bg-white transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
              <span className={`w-6 h-[2px] bg-white transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`w-6 h-[2px] bg-white transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-[64px] md:top-[130px] left-0 right-0 bottom-0 bg-[#0A1628] z-[999] px-6 pt-6 overflow-y-auto"
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
                  className="block text-white text-lg font-medium no-underline py-3.5 border-b border-white/10 hover:text-orange-400 transition-colors"
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}

            {/* Mobile Payment Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: navLinks.length * 0.05 + 0.1 }}
              className="mt-6"
            >
              <a
                href="http://onlinepay.ssvmcuttack.in/Login"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-green-400 text-white font-semibold text-base no-underline shadow-lg"
              >
                💳 Click to Payment
              </a>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
