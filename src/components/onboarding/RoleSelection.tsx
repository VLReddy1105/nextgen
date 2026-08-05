"use client";

import { Building2, GraduationCap, Lightbulb, School, UserRoundCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { OnboardingActions } from "./OnboardingActions";

const roles = [
  { id: "student", title: "Student", description: "Find roles, projects, mentors, and communities.", icon: GraduationCap },
  { id: "founder", title: "Founder", description: "Build a team, share roles, and meet collaborators.", icon: Lightbulb },
  { id: "company_representative", title: "Company representative", description: "Connect your organization with emerging talent.", icon: Building2 },
  { id: "university_representative", title: "University representative", description: "Coordinate students, research, events, and groups.", icon: School },
  { id: "mentor", title: "Mentor or professional", description: "Share experience and join useful conversations.", icon: UserRoundCheck },
  { id: "community_coordinator", title: "Community coordinator", description: "Create a focused space and organize activity.", icon: UsersRound },
];

export function RoleSelection() {
  const [selected, setSelected] = useState("student");

  return (
    <div>
      <p className="text-[14px] font-semibold text-blue-700">Step 2 · Primary role</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">How will you use NextGen first?</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Choose your primary role. The profile model is prepared to support additional roles later.</p>
      <div className="mt-8 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Primary role">
        {roles.map((role) => {
          const Icon = role.icon;
          const active = selected === role.id;
          return (
            <button
              key={role.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(role.id)}
              className={`flex min-h-[132px] items-start gap-4 rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 ${active ? "border-blue-500 bg-blue-50/70 shadow-[inset_0_0_0_1px_#2563eb]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}><Icon aria-hidden="true" className="size-5" /></span>
              <span>
                <span className="block text-base font-semibold text-slate-950">{role.title}</span>
                <span className="mt-1 block text-[14px] leading-6 text-slate-600">{role.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <OnboardingActions back="/onboarding/welcome" next="/onboarding/profile" />
    </div>
  );
}
