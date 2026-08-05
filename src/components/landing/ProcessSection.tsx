"use client";

import { motion } from "framer-motion";
import { Compass, Link2, TrendingUp, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  {
    title: "Create your identity",
    description: "Build a profile around your skills, interests, experience, and ambitions.",
    icon: UserRound,
  },
  {
    title: "Discover your network",
    description: "Find people, institutions, opportunities, and communities relevant to your direction.",
    icon: Compass,
  },
  {
    title: "Connect through opportunities",
    description: "Apply, collaborate, join projects, attend events, or start useful conversations.",
    icon: Link2,
  },
  {
    title: "Build meaningful progress",
    description: "Grow your network, experience, confidence, and long-term professional journey.",
    icon: TrendingUp,
  },
];

export function ProcessSection() {
  return (
    <section className="bg-[#f8fafc] py-20 sm:py-24 lg:py-28">
      <div className="container-shell">
        <SectionHeading
          eyebrow="How NextGen works"
          title="A clear path from introduction to action."
          description="NextGen is structured around the moments that turn a profile into a real conversation, project, role, or collaboration."
        />
        <div className="relative mt-14">
          <div aria-hidden="true" className="absolute bottom-10 left-6 top-10 hidden w-px bg-slate-300 md:block lg:bottom-auto lg:left-[8%] lg:right-[8%] lg:top-8 lg:h-px lg:w-auto" />
          <div className="grid gap-5 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="relative rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,.05)]"
                >
                  <div className="relative flex items-center justify-between">
                    <span className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,.18)]">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="font-mono text-[14px] font-semibold text-slate-400">0{index + 1}</span>
                  </div>
                  <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em] text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">{step.description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
