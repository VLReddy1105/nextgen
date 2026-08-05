import { BadgeCheck, Eye, FileCheck2, MessagesSquare, ShieldCheck, UsersRound } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const principles = [
  { title: "Role-aware access", description: "Interfaces and permissions can be shaped around a person’s role.", icon: UsersRound },
  { title: "Organization workflows", description: "Designed to support verified organization workflows as the platform grows.", icon: BadgeCheck },
  { title: "Profile visibility", description: "Prepared for clear controls over what people share and with whom.", icon: Eye },
  { title: "Application management", description: "Structured status tracking keeps applicants and teams aligned.", icon: FileCheck2 },
  { title: "Responsible moderation", description: "Community tools are designed with reporting and moderation needs in mind.", icon: ShieldCheck },
  { title: "Clear communication", description: "Useful updates and explicit status signals reduce avoidable uncertainty.", icon: MessagesSquare },
];

export function TrustSection() {
  return (
    <section className="border-t border-slate-200 bg-[#f8fafc] py-20 sm:py-24 lg:py-28">
      <div className="container-shell grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
        <div>
          <SectionHeading
            eyebrow="Built for trust"
            title="Professional spaces need clear boundaries."
            description="The foundation anticipates responsible access, visibility, moderation, and status tracking without claiming systems that are not connected yet."
          />
        </div>
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <article key={principle.title} className="border-t border-slate-200 py-6">
                <Icon aria-hidden="true" className="size-5 text-blue-700" />
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{principle.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-slate-600">{principle.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
