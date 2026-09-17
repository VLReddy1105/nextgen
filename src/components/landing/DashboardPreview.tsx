"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, CheckCircle2, CircleUserRound, FolderKanban, MessageSquareText, Users } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

type PreviewRole = "Student" | "Founder" | "Company" | "University";

const roleData: Record<PreviewRole, { greeting: string; summary: string; metrics: Array<{ label: string; value: string; delta: string }>; tasks: string[] }> = {
  Student: {
    greeting: "Your next steps",
    summary: "A focused view of applications, recommendations, and community activity.",
    metrics: [
      { label: "Profile completion", value: "78%", delta: "2 steps left" },
      { label: "Saved opportunities", value: "8", delta: "3 closing soon" },
      { label: "Applications", value: "4", delta: "1 update" },
    ],
    tasks: ["AI Research Assistant matches your interests", "CV and HiWi workshop · 19 Sep", "Product and Design has new activity"],
  },
  Founder: {
    greeting: "Startup workspace",
    summary: "Manage active roles, collaborators, candidate interest, and founder events.",
    metrics: [
      { label: "Active roles", value: "3", delta: "12 interested" },
      { label: "Team members", value: "5", delta: "2 collaborators" },
      { label: "Requests", value: "7", delta: "3 new" },
    ],
    tasks: ["Review 5 candidates for product engineering", "Founder networking session · 14 Sep", "New collaboration request from Climate Lab"],
  },
  Company: {
    greeting: "Talent workspace",
    summary: "See published opportunities, applicant stages, team actions, and recruitment signals.",
    metrics: [
      { label: "Published roles", value: "6", delta: "4 active" },
      { label: "Applicants", value: "42", delta: "9 this week" },
      { label: "Shortlisted", value: "11", delta: "4 to review" },
    ],
    tasks: ["Review applicants for Product Design Intern", "Campus outreach plan needs approval", "Three interview notes were added"],
  },
  University: {
    greeting: "Campus network",
    summary: "Coordinate student engagement, research opportunities, events, and organizations.",
    metrics: [
      { label: "Active opportunities", value: "18", delta: "5 research" },
      { label: "Student groups", value: "24", delta: "6 active today" },
      { label: "Upcoming events", value: "9", delta: "3 this week" },
    ],
    tasks: ["Publish the AI research roundtable", "12 students saved a new HiWi role", "Robotics society requested a workspace"],
  },
};

const roles = Object.keys(roleData) as PreviewRole[];

export function DashboardPreview() {
  const [activeRole, setActiveRole] = useState<PreviewRole>("Student");
  const data = roleData[activeRole];

  return (
    <section className="overflow-hidden bg-white py-20 sm:py-24 lg:py-28">
      <div className="container-shell">
        <SectionHeading
          eyebrow="Role-aware workspace"
          title="One platform. A workspace shaped around your role."
          description="The structure stays familiar while priorities, tools, and signals adapt to what you are here to do."
        />
        <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Dashboard preview role">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={activeRole === role}
              aria-controls="dashboard-preview-panel"
              onClick={() => setActiveRole(role)}
              className={`min-h-11 rounded-full border px-5 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 ${activeRole === role ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[2rem] border border-slate-300 bg-slate-950 p-2 shadow-[0_38px_90px_rgba(15,23,42,.16)] sm:p-3">
          <div className="silver-line absolute inset-x-20 top-0 h-px" />
          <div className="overflow-hidden rounded-[1.55rem] bg-[#f8fafc]">
            <div className="grid min-h-[590px] lg:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-slate-200 bg-white p-5 lg:block">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-slate-950 text-[13px] font-bold text-white">GZ</div>
                  <div>
                    <p className="text-[15px] font-semibold text-slate-950">GenZnect</p>
                    <p className="text-[13px] text-slate-500">{activeRole} space</p>
                  </div>
                </div>
                <div className="mt-8 space-y-2">
                  {["Overview", "Discover", "Opportunities", "Communities", "Messages"].map((item, index) => (
                    <div key={item} className={`rounded-xl px-3 py-2.5 text-[14px] font-medium ${index === 0 ? "bg-slate-950 text-white" : "text-slate-500"}`}>{item}</div>
                  ))}
                </div>
              </aside>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeRole}
                  id="dashboard-preview-panel"
                  role="tabpanel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="p-5 sm:p-7 lg:p-9"
                >
                  <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-blue-700">{activeRole} dashboard</p>
                      <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{data.greeting}</h3>
                      <p className="mt-2 max-w-xl text-[15px] leading-6 text-slate-600">{data.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-2 pl-2 pr-4 text-[14px] font-medium text-slate-700">
                      <CircleUserRound aria-hidden="true" className="size-8 text-slate-400" /> Preview account
                    </div>
                  </div>
                  <div className="mt-7 grid gap-4 sm:grid-cols-3">
                    {data.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-[14px] font-medium text-slate-500">{metric.label}</p>
                        <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{metric.value}</p>
                        <p className="mt-2 text-[13px] font-medium text-blue-700">{metric.delta}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-base font-semibold text-slate-950">Recommended next actions</h4>
                        <ArrowUpRight aria-hidden="true" className="size-4 text-slate-400" />
                      </div>
                      <div className="mt-4 divide-y divide-slate-100">
                        {data.tasks.map((task, index) => (
                          <div key={task} className="flex items-start gap-3 py-3 first:pt-1">
                            <span className={`mt-1 grid size-7 shrink-0 place-items-center rounded-lg ${index === 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                              {index === 0 ? <CheckCircle2 className="size-4" /> : index === 1 ? <CalendarDays className="size-4" /> : <MessageSquareText className="size-4" />}
                            </span>
                            <p className="text-[14px] leading-6 text-slate-700">{task}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-950 p-5 text-white">
                      <div className="flex items-center justify-between">
                        <span className="grid size-10 place-items-center rounded-xl bg-white/10"><FolderKanban className="size-5" /></span>
                        <Users className="size-5 text-slate-500" />
                      </div>
                      <p className="mt-8 text-[14px] text-slate-400">This week</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">3 useful connections</p>
                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-blue-500" /></div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
