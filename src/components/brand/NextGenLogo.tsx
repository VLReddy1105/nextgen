import Link from "next/link";
import { BrandMark } from "./BrandMark";

interface NextGenLogoProps {
  compact?: boolean;
  inverse?: boolean;
  href?: string;
}

export function NextGenLogo({ compact = false, inverse = false, href = "/" }: NextGenLogoProps) {
  return (
    <Link
      href={href}
      aria-label="NextGen Community home"
      className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
    >
      <BrandMark />
      {!compact ? (
        <span className={inverse ? "text-white" : "text-slate-950"}>
          <span className="block text-[17px] font-semibold leading-none tracking-[-0.02em]">NextGen</span>
          <span className={`mt-1 block text-[13px] leading-none ${inverse ? "text-slate-400" : "text-slate-500"}`}>
            Community
          </span>
        </span>
      ) : null}
    </Link>
  );
}
