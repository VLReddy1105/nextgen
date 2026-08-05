import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-[#09090b] shadow-[inset_0_1px_0_rgba(255,255,255,.14)]",
        className,
      )}
    >
      <span className="absolute inset-x-2 top-2 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <svg className="size-6" viewBox="0 0 24 24" fill="none">
        <path d="M5 18 12 4l7 14-7-4.2L5 18Z" fill="url(#silver)" />
        <path d="m12 4 .1 9.8L19 18 12 4Z" fill="white" fillOpacity=".62" />
        <defs>
          <linearGradient id="silver" x1="5" y1="4" x2="19" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F8FAFC" />
            <stop offset=".48" stopColor="#94A3B8" />
            <stop offset="1" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
