"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { HeroVisual } from "./HeroVisual";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const copyY = useTransform(scrollYProgress, [0, 0.48], [0, reduceMotion ? 0 : -72]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.34], [1, 0.18]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -22]);
  const crowdY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -12]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[linear-gradient(to_bottom,#fff_0%,#fff_68%,#f8fafc_100%)]"
    >
      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="container-shell relative z-20 flex flex-col items-center pt-10 text-center sm:pt-14 lg:pt-16"
      >
        <h1 className="overflow-visible text-[clamp(3.35rem,14.5vw,4.75rem)] font-[780] leading-[0.96] tracking-[-0.065em] text-[#0d0d0f] sm:text-[clamp(5.6rem,10vw,7.25rem)] lg:text-[clamp(6rem,8vw,8.5rem)]">
          <motion.span
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.68, delay: 0.18, ease }}
            className="block overflow-visible"
          >

          </motion.span>
          <motion.span
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.72, delay: 0.32, ease }}
            className="flex justify-center overflow-visible"
          >
            <span className="inline-flex items-baseline overflow-visible px-[1.55em] pb-[0.24em] pt-[0.09em] leading-[1.12]">
              <span className="inline-block bg-[linear-gradient(104deg,#111114_12%,#24243a_66%,#4338ca_112%)] bg-clip-text text-transparent">G e n Z n e c t</span>
              <span className="inline-block origin-top scale-y-[1.12] overflow-visible text-[#4338ca]"></span>
            </span>
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.68, delay: 0.5, ease }}
          className="mt-4 max-w-[52rem] text-[1.22rem] font-medium leading-[1.42] tracking-[-0.025em] text-zinc-600 sm:text-[1.55rem] lg:text-[1.72rem]"
        >
          Meet your people. Find your opportunities. Build what&apos;s next.
        </motion.p>
      </motion.div>

      <HeroVisual imageY={imageY} crowdY={crowdY} />
    </section>
  );
}
