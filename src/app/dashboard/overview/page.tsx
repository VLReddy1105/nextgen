import { Bookmark, CheckCircle2, Clock3, Compass, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { ApplicationStatus } from "@/components/dashboard/ApplicationStatus";
import { EventCard } from "@/components/dashboard/EventCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { OpportunityCard } from "@/components/dashboard/OpportunityCard";
import { opportunities } from "@/data/mock-data";

export default function DashboardOverviewPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[14px] font-semibold text-blue-700">Monday, 3 August</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Good morning, Alex.</h1><p className="mt-2 text-base text-slate-600">Here is what is moving across your NextGen workspace.</p></div><button type="button" className="inline-flex min-h-11 w-fit items-center rounded-full border border-slate-300 bg-white px-5 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">Edit profile</button></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Profile completion" value="78%" detail="Complete 2 more details" icon={UserRoundCheck} /><MetricCard label="Saved opportunities" value="8" detail="3 closing soon" icon={Bookmark} /><MetricCard label="Applications" value="4" detail="1 status update" icon={CheckCircle2} /><MetricCard label="Upcoming events" value="3" detail="Next event in 2 days" icon={Clock3} /></div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">Recommended opportunities</h2><p className="mt-1 text-[14px] text-slate-500">Based on your interests and direction</p></div><Link href="/dashboard/opportunities" className="text-[14px] font-semibold text-blue-700">View all</Link></div><div className="mt-4 grid gap-4 md:grid-cols-2">{opportunities.slice(0, 2).map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} compact />)}</div></section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">Application status</h2><Link href="/dashboard/applications" className="text-[13px] font-semibold text-blue-700">View all</Link></div><div className="mt-3"><ApplicationStatus title="AI Research Assistant" organization="BTU Cottbus-Senftenberg" stage="In review" /><ApplicationStatus title="Product Design Intern" organization="NextGen Labs" stage="Submitted" /><ApplicationStatus title="Student Research Fellow" organization="Mobility Lab" stage="Interview" /></div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold text-slate-950">Coming up</h2><div className="mt-2"><EventCard date="14 SEP · 18:30" title="Founder networking session" meta="Berlin Mitte · In person" /><EventCard date="19 SEP · 16:00" title="CV and HiWi workshop" meta="Online" /></div></section>
        </div>
      </div>
      <section className="mt-6 rounded-2xl bg-slate-950 p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-blue-300"><Compass aria-hidden="true" className="size-5" /></span><div><h2 className="text-lg font-semibold">Make your recommendations more useful</h2><p className="mt-1 max-w-2xl text-[15px] leading-6 text-slate-400">Add the skills you are currently building and the kinds of opportunities you want next.</p></div></div><button type="button" className="mt-5 min-h-11 shrink-0 rounded-full bg-white px-5 text-[15px] font-semibold text-slate-950 sm:mt-0">Update interests</button></section>
    </div>
  );
}
