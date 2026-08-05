import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  inverse?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  inverse = false,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("eyebrow", inverse && "border-white/15 bg-white/5 text-blue-200")}>{eyebrow}</p>
      <h2 className={cn("mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.6rem] lg:leading-[1.06]", inverse ? "text-white" : "text-slate-950")}>
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-5 max-w-2xl text-[17px] leading-8", inverse ? "text-slate-300" : "text-slate-600", align === "center" && "mx-auto")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
