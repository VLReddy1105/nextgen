"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GenZnectLogo } from "@/components/brand/GenZnectLogo";
import { ButtonLink } from "@/components/ui/Button";

const navigation = [
  { label: "Discover", href: "/discover" },
  { label: "Opportunities", href: "/opportunities" },
  { label: "Communities", href: "/communities" },
  { label: "Events", href: "/events" },
  { label: "For Organizations", href: "/organizations" },
  { label: "About", href: "/about" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 transition-[background-color,backdrop-filter] duration-300 ${
        scrolled ? "bg-white/[.82] backdrop-blur-[18px]" : "bg-white/90 backdrop-blur-sm"
      }`}
    >
      <div className="container-shell flex h-[76px] items-center justify-between gap-5">
        <GenZnectLogo />
        <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[15px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <ButtonLink href="/login" variant="ghost">Sign In</ButtonLink>
          <ButtonLink href="/signup">Join GenZnect</ButtonLink>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
          className="grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 xl:hidden"
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[76px] h-[calc(100dvh-76px)] overflow-y-auto border-t border-slate-200 bg-white p-5 xl:hidden"
          >
            <nav aria-label="Mobile navigation" className="mx-auto flex max-w-lg flex-col">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-slate-100 px-2 py-4 text-lg font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-7 grid gap-3">
                <ButtonLink href="/signup" className="w-full">Join GenZnect</ButtonLink>
                <ButtonLink href="/login" variant="secondary" className="w-full">Sign In</ButtonLink>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
