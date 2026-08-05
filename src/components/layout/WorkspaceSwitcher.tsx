"use client";

import { Check, ChevronsUpDown, GraduationCap } from "lucide-react";
import { useState } from "react";

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><GraduationCap aria-hidden="true" className="size-[18px]" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold text-slate-950">Personal workspace</span><span className="block text-[13px] text-slate-500">Student</span></span>
        <ChevronsUpDown aria-hidden="true" className="size-4 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,.14)]">
          <button type="button" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><span className="flex-1 text-[14px] font-medium text-slate-800">Personal workspace</span><Check aria-hidden="true" className="size-4 text-blue-700" /></button>
          <button type="button" disabled className="w-full cursor-not-allowed rounded-lg px-3 py-2.5 text-left text-[13px] text-slate-400">Organization workspaces will appear here</button>
        </div>
      ) : null}
    </div>
  );
}
