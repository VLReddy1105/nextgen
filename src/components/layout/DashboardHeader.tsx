"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps { onMenu: () => void; }

export function DashboardHeader({ onMenu }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={onMenu} aria-label="Open dashboard navigation" className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 lg:hidden"><Menu aria-hidden="true" className="size-5" /></button>
        <label className="relative hidden max-w-md flex-1 sm:block"><span className="sr-only">Search NextGen</span><Search aria-hidden="true" className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" /><input type="search" placeholder="Search people, roles, or communities" className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-600/10" /></label>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/notifications" aria-label="Notifications" className="relative grid size-11 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><Bell aria-hidden="true" className="size-[19px]" /><span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-blue-600 ring-2 ring-white" /></Link>
          <button type="button" aria-label="Open user menu" className="flex min-h-11 items-center gap-3 rounded-full border border-slate-200 bg-white p-1 pr-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><span className="grid size-9 place-items-center rounded-full bg-slate-950 text-[13px] font-semibold text-white">AM</span><span className="hidden text-[14px] font-semibold text-slate-800 md:block">Alex Morgan</span></button>
        </div>
      </div>
    </header>
  );
}
