"use client";

import { Camera } from "lucide-react";
import { OnboardingActions } from "./OnboardingActions";

export function ProfileStep() {
  return (
    <div>
      <p className="text-[14px] font-semibold text-blue-700">Step 3 · Profile</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Give people useful context.</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">A clear introduction helps recommendations and conversations feel more relevant.</p>
      <form className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-4">
          <button type="button" className="grid size-20 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-blue-400 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20" aria-label="Add profile image"><Camera aria-hidden="true" className="size-6" /></button>
          <div><p className="text-[15px] font-semibold text-slate-800">Profile image</p><p className="mt-1 text-[14px] text-slate-500">Optional for now · JPG or PNG</p></div>
        </div>
        <label className="text-[15px] font-semibold text-slate-800">Display name<input defaultValue="Alex Morgan" className="mt-2 h-13 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10" /></label>
        <label className="text-[15px] font-semibold text-slate-800">Current location<input placeholder="City, country" className="mt-2 h-13 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10" /></label>
        <label className="sm:col-span-2 text-[15px] font-semibold text-slate-800">Professional headline<input placeholder="What are you studying, building, or working on?" className="mt-2 h-13 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10" /></label>
        <label className="sm:col-span-2 text-[15px] font-semibold text-slate-800">Short introduction<textarea rows={4} placeholder="Share what you care about and what you would like to find here." className="mt-2 w-full resize-none rounded-xl border border-slate-300 p-4 font-normal leading-7 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10" /></label>
      </form>
      <OnboardingActions back="/onboarding/role" next="/onboarding/interests" />
    </div>
  );
}
