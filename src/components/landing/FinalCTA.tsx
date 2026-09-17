import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ButtonLink } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#09090b] px-6 py-14 text-center sm:px-10 sm:py-18 lg:px-16 lg:py-22">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,.25),transparent_40%)]" />
        <div aria-hidden="true" className="silver-line absolute inset-x-24 top-0 h-px" />
        <div className="relative mx-auto max-w-4xl">
          <BrandMark className="mx-auto size-14 rounded-2xl" />
          <h2 className="mt-7 text-4xl font-semibold tracking-[-0.045em] text-balance text-white sm:text-5xl lg:text-6xl">Your next opportunity may begin with one meaningful connection.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-slate-300">Join a community built to help students, founders, institutions, and organizations discover what they can build together.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" variant="dark">Create Your Profile <ArrowRight aria-hidden="true" className="size-4" /></ButtonLink>
            <ButtonLink href="/discover" className="border border-white/20 bg-transparent text-white shadow-none hover:bg-white/10">Explore GenZnect</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
