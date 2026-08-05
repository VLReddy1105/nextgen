import { ArrowRight, Clock3, MapPin } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { events } from "@/data/mock-data";

export function EventsSection() {
  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">
      <div className="container-shell">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Events"
            title="Meet, learn, and build beyond the feed."
            description="Find small working sessions, thoughtful roundtables, practical workshops, and in-person meetups."
          />
          <Link href="/events" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full text-[15px] font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">Explore all events <ArrowRight aria-hidden="true" className="size-4" /></Link>
        </div>
        <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
          {events.map((event) => (
            <article key={event.title} className="group grid gap-5 py-7 transition md:grid-cols-[90px_1fr_auto] md:items-center md:py-8">
              <div className="flex items-baseline gap-2 md:block">
                <p className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">{event.date}</p>
                <p className="mt-1 font-mono text-[13px] font-semibold tracking-[0.08em] text-blue-700">{event.month}</p>
              </div>
              <div className="min-w-0 md:border-l md:border-slate-200 md:pl-8">
                <p className="text-[14px] font-medium text-slate-500">{event.organizer}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-2xl">{event.title}</h3>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="size-4" />{event.time} · {event.format}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-4" />{event.location}</span>
                </div>
              </div>
              <button type="button" className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-[15px] font-semibold text-slate-800 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">View event</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
