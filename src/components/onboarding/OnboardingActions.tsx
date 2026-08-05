import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

interface OnboardingActionsProps {
  back?: string;
  next: string;
  nextLabel?: string;
}

export function OnboardingActions({ back, next, nextLabel = "Continue" }: OnboardingActionsProps) {
  return (
    <div className="mt-9 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
      {back ? <Link href={back} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><ArrowLeft aria-hidden="true" className="size-4" />Back</Link> : <span />}
      <Link href={next} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,.22)] transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">{nextLabel}<ArrowRight aria-hidden="true" className="size-4" /></Link>
    </div>
  );
}
