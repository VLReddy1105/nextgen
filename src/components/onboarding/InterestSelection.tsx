"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { OnboardingActions } from "./OnboardingActions";

const interests = ["Artificial intelligence", "Startups", "Software engineering", "Product design", "Research", "Climate", "Career development", "Entrepreneurship", "Data science", "Social impact", "Mentorship", "Community building"];

export function InterestSelection() {
  const [selected, setSelected] = useState(["Artificial intelligence", "Research", "Career development"]);
  function toggle(interest: string) { setSelected((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]); }
  return (
    <div>
      <p className="text-[14px] font-semibold text-blue-700">Step 4 · Interests</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">What should NextGen help you find?</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Pick a few topics. You can adjust them whenever your direction changes.</p>
      <div className="mt-8 flex flex-wrap gap-3" aria-label="Interest selection">
        {interests.map((interest) => {
          const active = selected.includes(interest);
          return <button key={interest} type="button" aria-pressed={active} onClick={() => toggle(interest)} className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>{active ? <Check aria-hidden="true" className="size-4" /> : null}{interest}</button>;
        })}
      </div>
      <p className="mt-5 text-[14px] text-slate-500">{selected.length} selected</p>
      <OnboardingActions back="/onboarding/profile" next="/onboarding/organization" />
    </div>
  );
}
