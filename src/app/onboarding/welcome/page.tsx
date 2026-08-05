import { ArrowRight, Compass, Network, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export default function OnboardingWelcomePage() {
  return (
    <OnboardingShell current={1}>
      <p className="text-[14px] font-semibold text-blue-700">Welcome to NextGen</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">Let’s shape a useful starting point.</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">A few short steps will help NextGen understand your role, interests, and the kinds of people or opportunities you want to find.</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-3">
        {[{ icon: UserRoundCheck, title: "Your identity", copy: "A concise professional introduction." }, { icon: Compass, title: "Your direction", copy: "Topics and opportunities that matter." }, { icon: Network, title: "Your network", copy: "People and spaces with useful context." }].map((item) => {
          const Icon = item.icon;
          return <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><Icon aria-hidden="true" className="size-5 text-blue-700" /><h2 className="mt-4 text-base font-semibold text-slate-950">{item.title}</h2><p className="mt-2 text-[14px] leading-6 text-slate-600">{item.copy}</p></div>;
        })}
      </div>
      <div className="mt-9 flex justify-end border-t border-slate-200 pt-6"><Link href="/onboarding/role" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,.22)] transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">Get started<ArrowRight aria-hidden="true" className="size-4" /></Link></div>
    </OnboardingShell>
  );
}
