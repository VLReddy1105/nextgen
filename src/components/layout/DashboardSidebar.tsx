"use client";

import { Building2, CalendarDays, FolderKanban, GraduationCap, LayoutDashboard, Search, Settings, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GenZnectLogo } from "@/components/brand/GenZnectLogo";
import { cn } from "@/lib/utils";
import type { PrimaryRole } from "@/types";

const roleNames: Record<PrimaryRole, string> = { student: "Student", founder: "Founder", university: "University", company: "Company", mentor: "Mentor" };
const shared = [
  { label: "Overview", href: "/dashboard/overview", icon: LayoutDashboard },
  { label: "Opportunities", href: "/dashboard/opportunities", icon: Search },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Communities", href: "/dashboard/communities", icon: UsersRound },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays },
];

export function DashboardSidebar({ role, mobile = false, onClose }: { role: PrimaryRole; mobile?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const links = role === "university"
    ? [shared[0], { label: "Students", href: "/dashboard/students", icon: GraduationCap }, ...shared.slice(1)]
    : role === "student"
      ? [shared[0], { label: "My University", href: "/dashboard/my-university", icon: Building2 }, ...shared.slice(1)]
      : shared;
  return <aside className={cn("flex h-dvh w-[270px] shrink-0 flex-col border-r border-slate-200 bg-white p-4", mobile ? "w-full border-r-0" : "fixed inset-y-0 left-0 z-30 hidden lg:flex")}>
    <div className="flex h-12 items-center justify-between gap-3 px-1"><GenZnectLogo />{mobile ? <button type="button" onClick={onClose} aria-label="Close navigation" className="grid size-10 place-items-center rounded-full focus-visible:ring-4 focus-visible:ring-blue-600/20"><X aria-hidden="true" className="size-5" /></button> : null}</div>
    <div className="mt-6 rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workspace</p><p className="mt-1 font-semibold text-slate-950">{roleNames[role]}</p></div>
    <nav aria-label="Dashboard navigation" className="mt-6 flex-1 space-y-1 overflow-y-auto">{links.map(item => {
      const Icon = item.icon;
      const active = pathname === item.href;
      return <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20", active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}><Icon aria-hidden="true" className="size-[18px]" />{item.label}</Link>;
    })}</nav>
    <Link href="/dashboard/settings" onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"><Settings aria-hidden="true" className="size-[18px]" />Settings</Link>
  </aside>;
}
