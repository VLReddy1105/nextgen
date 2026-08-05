"use client";

import { Bookmark, CalendarClock, MapPin } from "lucide-react";
import { useState } from "react";
import type { Opportunity } from "@/types";
import { ButtonLink } from "@/components/ui/Button";

interface OpportunityCardProps {
  opportunity: Opportunity;
  compact?: boolean;
}

export function OpportunityCard({ opportunity, compact = false }: OpportunityCardProps) {
  const [saved, setSaved] = useState(false);

  return (
    <article className="group flex h-full flex-col rounded-[1.4rem] border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_22px_50px_rgba(15,23,42,.09)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-[13px] font-bold tracking-[-0.03em] text-slate-700">
          {opportunity.monogram}
        </div>
        <button
          type="button"
          aria-label={saved ? `Remove ${opportunity.title} from saved opportunities` : `Save ${opportunity.title}`}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
          className={`grid size-10 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 ${saved ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"}`}
        >
          <Bookmark aria-hidden="true" className="size-[18px]" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="mt-5">
        <p className="text-[15px] font-medium text-blue-700">{opportunity.type}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-slate-950">{opportunity.title}</h3>
        <p className="mt-1 text-[15px] text-slate-600">{opportunity.organization}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden="true" className="size-4" /> {opportunity.location} · {opportunity.workMode}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock aria-hidden="true" className="size-4" /> Apply by {opportunity.deadline}
        </span>
      </div>
      {!compact ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {opportunity.skills.map((skill) => (
            <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-medium text-slate-600">
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto pt-6">
        <ButtonLink href={`/opportunities#${opportunity.id}`} variant="secondary" className="w-full">View details</ButtonLink>
      </div>
    </article>
  );
}
