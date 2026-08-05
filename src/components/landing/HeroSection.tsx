"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EcosystemVisual } from "./EcosystemVisual";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white pb-20 pt-12 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_70%_18%,rgba(37,99,235,.10),transparent_40%),radial-gradient(circle_at_12%_0%,rgba(148,163,184,.15),transparent_28%)]" />
      <div className="container-shell relative grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-10">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="eyebrow">A community for meaningful progress</p>
          <h1 className="mt-7 max-w-3xl text-[3.15rem] font-semibold leading-[1.02] tracking-[-0.055em] text-balance text-slate-950 sm:text-6xl lg:text-[4.55rem] xl:text-[5.1rem]">
            Where the next generation finds its <span className="text-blue-600">people</span> and possibilities.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
            Connect with students, founders, companies, universities, and mentors through one community built for useful opportunities and real progress.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup" className="group px-6">
              Join the Community
              <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-0.5" />
            </ButtonLink>
            <ButtonLink href="/opportunities" variant="secondary" className="px-6">Explore Opportunities</ButtonLink>
          </div>
          <p className="mt-6 flex items-start gap-2 text-[15px] leading-6 text-slate-500">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-600" />
            Built for students, builders, institutions, and ambitious teams.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.12 }}>
          <EcosystemVisual />
        </motion.div>
      </div>
    </section>
  );
}
