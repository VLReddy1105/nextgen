"use client";

import { Bell, CalendarDays, Compass, FileCheck2, FolderKanban, LayoutDashboard, MessageSquareText, Search, Settings, Sparkles, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NextGenLogo } from "@/components/brand/NextGenLogo";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const primary = [
  { label: "Overview", href: "/dashboard/overview", icon: LayoutDashboard },
  { label: "Discover", href: "/dashboard/discover", icon: Compass },
  { label: "Opportunities", href: "/dashboard/opportunities", icon: Search },
  { label: "Applications", href: "/dashboard/applications", icon: FileCheck2 },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Communities", href: "/dashboard/communities", icon: UsersRound },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays },
];

const secondary = [
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquareText },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface DashboardSidebarProps { mobile?: boolean; onClose?: () => void; }

export function DashboardSidebar({ mobile = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const renderLinks = (items: typeof primary) => items.map((item) => {
    const Icon = item.icon;
    const active = pathname === item.href;
    return <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20", active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}><Icon aria-hidden="true" className="size-[18px]" />{item.label}</Link>;
  });
  return (
    <aside className={cn("flex h-dvh w-[270px] shrink-0 flex-col border-r border-slate-200 bg-white p-4", mobile ? "w-full border-r-0" : "fixed inset-y-0 left-0 z-30 hidden lg:flex")}>
      <div className="flex h-12 items-center justify-between gap-3 px-1"><NextGenLogo />{mobile ? <button type="button" onClick={onClose} aria-label="Close dashboard navigation" className="grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><X aria-hidden="true" className="size-5" /></button> : null}</div>
      <div className="mt-5"><WorkspaceSwitcher /></div>
      <nav aria-label="Dashboard navigation" className="mt-6 flex flex-1 flex-col overflow-y-auto">
        <div className="space-y-1">{renderLinks(primary)}</div>
        <div className="my-4 h-px bg-slate-200" />
        <div className="space-y-1">{renderLinks(secondary)}</div>
      </nav>
      <Link href="/discover" className="mt-4 rounded-2xl bg-blue-50 p-4 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><Sparkles aria-hidden="true" className="size-5 text-blue-700" /><p className="mt-3 text-[14px] font-semibold text-slate-950">Explore the wider network</p><p className="mt-1 text-[13px] leading-5 text-slate-600">Discover people and communities.</p></Link>
    </aside>
  );
}
