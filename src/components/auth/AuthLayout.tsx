import { Network, ShieldCheck, Sparkles } from "lucide-react";
import { NextGenLogo } from "@/components/brand/NextGenLogo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[.85fr_1.15fr]">
      <section className="relative hidden overflow-hidden bg-[#09090b] p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,.34),transparent_38%),radial-gradient(circle_at_80%_100%,rgba(148,163,184,.13),transparent_36%)]" />
        <div aria-hidden="true" className="grid-fade absolute inset-0 opacity-20" />
        <div className="relative"><NextGenLogo inverse /></div>
        <div className="relative my-auto max-w-lg py-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[13px] font-semibold text-blue-200"><Sparkles aria-hidden="true" className="size-4" /> Find your people and possibilities</p>
          <h2 className="mt-7 text-5xl font-semibold leading-[1.08] tracking-[-0.05em] text-balance">One community. Many useful ways forward.</h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">Discover opportunities, join focused communities, build teams, and learn alongside people moving in the same direction.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Network aria-hidden="true" className="size-5 text-blue-300" />
              <p className="mt-3 text-[15px] font-medium text-slate-200">Role-aware connections</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck aria-hidden="true" className="size-5 text-blue-300" />
              <p className="mt-3 text-[15px] font-medium text-slate-200">Clear, responsible spaces</p>
            </div>
          </div>
        </div>
        <p className="relative text-[14px] text-slate-500">NextGen Community · Frontend preview</p>
      </section>
      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-10 lg:py-16">
        <div className="w-full max-w-[480px]">
          <div className="mb-10 lg:hidden"><NextGenLogo /></div>
          {children}
        </div>
      </section>
    </main>
  );
}
