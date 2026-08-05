import type { LucideIcon } from "lucide-react";

interface MetricCardProps { label: string; value: string; detail: string; icon: LucideIcon; }

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><p className="text-[14px] font-medium text-slate-500">{label}</p><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon aria-hidden="true" className="size-[18px]" /></span></div><p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p><p className="mt-2 text-[14px] font-medium text-blue-700">{detail}</p></article>;
}
