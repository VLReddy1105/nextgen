import { Check, Compass, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export default function OnboardingCompletePage() {
  return (
    <OnboardingShell current={6}>
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-green-50 text-green-700 ring-8 ring-green-50/70"><Check aria-hidden="true" className="size-7" /></span>
        <p className="mt-7 text-[14px] font-semibold text-blue-700">Setup complete</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">Your NextGen starting point is ready.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">The data in this preview is local only. Once Supabase is connected, this flow can create and update the real profile.</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/dashboard/overview" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><LayoutDashboard aria-hidden="true" className="size-4" />Open dashboard</Link><Link href="/discover" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 px-6 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><Compass aria-hidden="true" className="size-4" />Explore NextGen</Link></div>
      </div>
    </OnboardingShell>
  );
}
