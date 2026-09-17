import Link from "next/link";
import { GenZnectLogo } from "@/components/brand/GenZnectLogo";

const columns = [
  {
    title: "Platform",
    links: ["Discover", "Opportunities", "Communities", "Events", "Organizations"],
  },
  {
    title: "For people",
    links: ["Students", "Founders", "Mentors"],
  },
  {
    title: "For organizations",
    links: ["Companies", "Universities", "Student organizations", "Community partners"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Careers", "Privacy", "Terms"],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8fafc]">
      <div className="container-shell py-14 sm:py-18">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <GenZnectLogo />
            <p className="mt-5 text-base leading-7 text-slate-600">
              A professional community where people and organizations find useful opportunities, build teams, and make progress together.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-[15px] font-semibold text-slate-950">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link}>
                      <Link
                        href={`/${link.toLowerCase().replaceAll(" ", "-")}`}
                        className="text-[15px] text-slate-600 transition hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-slate-200 pt-6 text-[15px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GenZnect. All rights reserved.</p>
          <p>Built for purposeful professional connection.</p>
        </div>
      </div>
    </footer>
  );
}
