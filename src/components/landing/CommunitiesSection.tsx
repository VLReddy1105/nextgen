import { ArrowUpRight, Radio, Users } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { communities } from "@/data/mock-data";

export function CommunitiesSection() {
  return (
    <section className="border-y border-slate-200 bg-[#f8fafc] py-20 sm:py-24 lg:py-28">
      <div className="container-shell">
        <SectionHeading
          eyebrow="Community spaces"
          title="Conversations become more useful when the room is right."
          description="Join focused spaces for questions, working sessions, peer support, research exchange, and collaboration."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {communities.map((community, index) => (
            <article key={community.name} className="group flex min-h-[275px] flex-col rounded-[1.4rem] border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_45px_rgba(15,23,42,.08)]">
              <div className="flex items-center justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-2xl ${index % 3 === 0 ? "bg-blue-50 text-blue-700" : index % 3 === 1 ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-700"}`}>
                  <Users aria-hidden="true" className="size-5" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500"><Radio aria-hidden="true" className="size-3.5 text-green-600" />{community.activity}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-slate-950">{community.name}</h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">{community.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {community.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-600">{tag}</span>)}
              </div>
              <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                <span className="text-[13px] font-medium text-slate-500">{community.members}</span>
                <button type="button" className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">View community <ArrowUpRight aria-hidden="true" className="size-4" /></button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
