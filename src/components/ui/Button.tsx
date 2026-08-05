import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "dark" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white shadow-[0_10px_28px_rgba(37,99,235,.22)] hover:bg-blue-700 active:translate-y-px disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50 active:translate-y-px",
  dark: "bg-white text-slate-950 hover:bg-slate-100 active:translate-y-px",
  ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 disabled:pointer-events-none disabled:opacity-60";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
}

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  children: ReactNode;
  href: string;
  variant?: Variant;
  className?: string;
}

export function ButtonLink({ children, href, variant = "primary", className }: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], className)} href={href}>
      {children}
    </Link>
  );
}
