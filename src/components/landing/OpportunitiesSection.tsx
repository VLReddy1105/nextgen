"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { OpportunityCard } from "@/components/dashboard/OpportunityCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { opportunities } from "@/data/mock-data";

const filters = ["All", "Internships", "HiWi Jobs", "Working Student", "Projects", "Research", "Startup Roles", "Mentorship", "Events"];

export function OpportunitiesSection() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");

  const visibleOpportunities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return opportunities;
    return opportunities.filter((item) =>
      [item.title, item.organization, item.type, item.location, ...item.skills].join(" ").toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <section id="opportunities" className="border-y border-slate-200 bg-white py-20 sm:py-24 lg:py-28">
      <div className="container-shell">
        <SectionHeading
          eyebrow="Opportunity discovery"
          title="Opportunities designed to move people forward."
          description="Explore internships, HiWi roles, projects, startup opportunities, mentorship, research, events, and collaborative initiatives."
        />

        <div className="mt-10 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search opportunities</span>
              <Search aria-hidden="true" className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search roles, skills, or organizations"
                className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10"
              />
            </label>
            <button type="button" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">
              <SlidersHorizontal aria-hidden="true" className="size-4" /> More filters
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Opportunity type filters">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
                className={`min-h-10 rounded-full border px-4 text-[14px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 ${
                  activeFilter === filter ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {visibleOpportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
        {visibleOpportunities.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-base text-slate-600">
            No sample opportunities match that search. Try a broader phrase.
          </div>
        ) : null}
      </div>
    </section>
  );
}
