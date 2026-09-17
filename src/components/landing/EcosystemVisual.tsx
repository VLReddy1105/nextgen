"use client";

import { motion } from "framer-motion";
import { BriefcaseBusiness, Building2, GraduationCap, Lightbulb, School, Sparkles, Users } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";

const nodes = [
  { label: "Student", meta: "Open to research", icon: GraduationCap, className: "left-[2%] top-[8%]" },
  { label: "Founder", meta: "Building a team", icon: Lightbulb, className: "right-[1%] top-[15%]" },
  { label: "University", meta: "Research call", icon: School, className: "left-[0%] bottom-[12%]" },
  { label: "Company", meta: "3 active roles", icon: Building2, className: "right-[2%] bottom-[8%]" },
];

export function EcosystemVisual() {
  return (
    <div className="relative mx-auto aspect-[1/1.04] w-full max-w-[600px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_35px_90px_rgba(15,23,42,.12)]">
      <div aria-hidden="true" className="grid-fade absolute inset-0" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/70" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-300" />
      <svg aria-hidden="true" className="absolute inset-0 size-full text-blue-300/70" viewBox="0 0 600 620" fill="none">
        <path d="M300 300 105 105M300 300 502 130M300 300 95 505M300 300 500 510" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 8" />
        {["M105 105 300 300", "M502 130 300 300", "M95 505 300 300", "M500 510 300 300"].map((path, index) => (
          <motion.path
            key={path}
            d={path}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 0.25, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 3.2, delay: index * 0.65, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </svg>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="absolute left-1/2 top-1/2 flex w-[180px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[1.7rem] border border-slate-200 bg-white p-5 text-center shadow-[0_18px_50px_rgba(15,23,42,.14)]"
      >
        <BrandMark className="size-14 rounded-2xl" />
        <p className="mt-3 font-semibold tracking-[-0.02em] text-slate-950">GenZnect Network</p>
        <p className="mt-1 text-[13px] leading-5 text-slate-500">People · Ideas · Progress</p>
      </motion.div>

      {nodes.map((node, index) => {
        const Icon = node.icon;
        return (
          <motion.div
            key={node.label}
            className={`absolute ${node.className} flex w-[156px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,.1)] sm:w-[184px] sm:p-4`}
            animate={{ y: [0, index % 2 ? -7 : 7, 0] }}
            transition={{ duration: 5 + index * 0.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Icon aria-hidden="true" className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-slate-900 sm:text-[15px]">{node.label}</span>
              <span className="mt-0.5 block truncate text-[13px] text-slate-500">{node.meta}</span>
            </span>
          </motion.div>
        );
      })}

      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[29%] top-[8%] hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-sm sm:flex"
      >
        <Sparkles aria-hidden="true" className="size-4 text-blue-600" /> New match
      </motion.div>
      <div className="absolute bottom-[4%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-sm">
        <Users aria-hidden="true" className="size-4 text-blue-600" /> Community
        <span className="h-4 w-px bg-slate-200" />
        <BriefcaseBusiness aria-hidden="true" className="size-4 text-blue-600" /> Opportunity
      </div>
    </div>
  );
}
