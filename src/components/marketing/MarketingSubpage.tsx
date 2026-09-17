import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

interface MarketingSubpageProps {
  eyebrow: string;
  title: string;
  description: string;
  items: Array<{ title: string; description: string }>;
}

export function MarketingSubpage({ eyebrow, title, description, items }: MarketingSubpageProps) {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-slate-200 bg-white py-20 sm:py-28">
        <div aria-hidden="true" className="grid-fade absolute inset-0" />
        <div className="container-shell relative">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.05em] text-balance text-slate-950 sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup">Join GenZnect <ArrowRight aria-hidden="true" className="size-4" /></ButtonLink>
            <ButtonLink href="/" variant="secondary">Back to home</ButtonLink>
          </div>
        </div>
      </section>
      <section className="bg-[#f8fafc] py-16 sm:py-20">
        <div className="container-shell grid gap-5 md:grid-cols-3">
          {items.map((item, index) => (
            <article key={item.title} className="border-t-2 border-slate-950 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,.05)]">
              <p className="font-mono text-[13px] font-semibold text-blue-700">0{index + 1}</p>
              <h2 className="mt-5 text-xl font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
