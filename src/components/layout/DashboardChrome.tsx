"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { DashboardHeader, type DashboardUser } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import type { PrimaryRole } from "@/types";

export function DashboardChrome({ children, user, role }: { children: React.ReactNode; user: DashboardUser; role: PrimaryRole }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <div className="min-h-dvh bg-[#f8fafc]">
      <DashboardSidebar role={role} />
      <AnimatePresence>
        {open ? <div className="fixed inset-0 z-50 lg:hidden"><motion.button type="button" aria-label="Close dashboard navigation" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" /><motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.25, ease: "easeOut" }} className="relative h-full max-w-[320px]"><DashboardSidebar role={role} mobile onClose={() => setOpen(false)} /></motion.div></div> : null}
      </AnimatePresence>
      <div className="lg:pl-[270px]">
        <DashboardHeader onMenu={() => setOpen(true)} user={user} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
