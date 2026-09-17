import Link from "next/link";
import { BrandMark } from "./BrandMark";

interface GenZnectLogoProps {
  compact?: boolean;
  inverse?: boolean;
  href?: string;
}

export function GenZnectLogo({ compact = false, inverse = false, href = "/" }: GenZnectLogoProps) {
  return (
    <Link
      href={href}
      aria-label="GenZnect home"
      className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
    >
      <BrandMark />
      {!compact ? (
        <span className={inverse ? "text-white" : "text-slate-950"}>
          <span className="block text-[17px] font-semibold leading-none tracking-[-0.02em]">GenZnect</span>
        </span>
      ) : null}
    </Link>
  );
}
