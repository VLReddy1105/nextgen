import { Check } from "lucide-react";
import { NextGenLogo } from "@/components/brand/NextGenLogo";

const steps = ["Welcome", "Role", "Profile", "Interests", "Organization", "Complete"];

interface OnboardingShellProps {
  current: number;
  children: React.ReactNode;
}

export function OnboardingShell({ current, children }: OnboardingShellProps) {
  return (
    <main className="min-h-dvh bg-[#f8fafc]">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-shell flex min-h-[76px] items-center justify-between gap-6 py-3">
          <NextGenLogo />
          <p className="hidden text-[14px] font-medium text-slate-500 sm:block">Set up your NextGen identity</p>
        </div>
      </header>
      <div className="container-shell py-8 sm:py-12">
        <div aria-label={`Onboarding progress: step ${current} of ${steps.length}`} className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const complete = stepNumber < current;
              const active = stepNumber === current;
              return (
                <div key={step} className="flex flex-1 items-center gap-2 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`grid size-8 place-items-center rounded-full border text-[13px] font-semibold ${complete ? "border-blue-600 bg-blue-600 text-white" : active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-400"}`}>
                      {complete ? <Check aria-hidden="true" className="size-4" /> : stepNumber}
                    </span>
                    <span className={`hidden text-[13px] font-medium sm:block ${active ? "text-slate-950" : "text-slate-500"}`}>{step}</span>
                  </div>
                  {index < steps.length - 1 ? <span aria-hidden="true" className={`mb-6 h-px flex-1 ${complete ? "bg-blue-500" : "bg-slate-300"}`} /> : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mx-auto mt-9 max-w-4xl rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,.07)] sm:p-9 lg:p-12">
          {children}
        </div>
      </div>
    </main>
  );
}
