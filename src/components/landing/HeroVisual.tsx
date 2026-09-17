"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, type MotionValue } from "framer-motion";
import Image from "next/image";
import type { PointerEvent } from "react";

interface HeroVisualProps {
  imageY: MotionValue<number>;
  crowdY: MotionValue<number>;
}

export function HeroVisual({ imageY, crowdY }: HeroVisualProps) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 90, damping: 24, mass: 0.7 });
  const y = useSpring(pointerY, { stiffness: 90, damping: 24, mass: 0.7 });

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
    pointerX.set(normalizedX * 12);
    pointerY.set(normalizedY * 8);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.figure
      initial={reduceMotion ? false : { opacity: 0, clipPath: "inset(100% 0 0 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0% 0 0 0)" }}
      transition={{ duration: 1.05, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className="relative z-10 -mt-10 h-[clamp(38rem,82svh,50rem)] w-full overflow-hidden bg-[#f8fafc] sm:-mt-18 sm:h-[clamp(44rem,84svh,60rem)] lg:-mt-28 lg:h-[clamp(46rem,86svh,64rem)]"
    >
      <motion.div style={{ y: imageY }} className="absolute -inset-x-2 -inset-y-6 will-change-transform">
        <motion.div style={{ x, y }} className="absolute -inset-2 will-change-transform">
          <motion.div
            initial={{ scale: 1.02 }}
            animate={{ scale: reduceMotion ? 1.02 : 1.055 }}
            transition={{ duration: 22, delay: 1.25, ease: "linear" }}
            className="absolute inset-0 will-change-transform"
          >
            <Image
              src="/images/genznect-hero.png"
              alt="A focused young man looking upward while moving through a large crowd"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[51%_50%] sm:object-[50%_52%] lg:object-[50%_54%]"
            />
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ y: crowdY }}
            className="hero-crowd-treatment absolute -inset-4"
          />
          <div aria-hidden="true" className="hero-person-light absolute inset-0" />
        </motion.div>
      </motion.div>

      <div aria-hidden="true" className="hero-image-top-fade absolute inset-0 z-10" />
      <div aria-hidden="true" className="hero-image-edge-vignette absolute inset-0 z-10" />
      <div aria-hidden="true" className="hero-image-bottom-fade absolute inset-x-0 bottom-0 z-20 h-[25%]" />

      <figcaption className="sr-only">
        In a busy world, GenZnect helps people find the communities, conversations, and opportunities that give their next step direction.
      </figcaption>
    </motion.figure>
  );
}
