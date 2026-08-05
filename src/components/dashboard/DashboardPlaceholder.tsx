import type { LucideIcon } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface DashboardPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
  action: string;
  href: string;
}

export function DashboardPlaceholder({ eyebrow, title, description, emptyTitle, emptyDescription, icon, action, href }: DashboardPlaceholderProps) {
  return <div className="mx-auto max-w-7xl"><p className="text-[14px] font-semibold text-blue-700">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p><div className="mt-8"><EmptyState title={emptyTitle} description={emptyDescription} icon={icon} action={action} href={href} /></div></div>;
}
