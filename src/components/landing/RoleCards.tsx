import { Building2, GraduationCap, Lightbulb, School, Users, Waypoints } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const roles = [
  {
    title: "Students",
    description: "Discover roles, projects, mentors, and communities aligned with your direction.",
    icon: GraduationCap,
  },
  {
    title: "Founders",
    description: "Build teams, meet emerging talent, share ideas, and grow a useful startup network.",
    icon: Lightbulb,
  },
  {
    title: "Companies",
    description: "Connect with skilled candidates and collaborate with the next generation of talent.",
    icon: Building2,
  },
  {
    title: "Universities",
    description: "Bring students, researchers, organizations, and opportunities into one connected space.",
    icon: School,
  },
  {
    title: "Mentors",
    description: "Share experience, guide emerging talent, and contribute to meaningful growth.",
    icon: Users,
  },
  {
    title: "Communities",
    description: "Create focused spaces where people learn, collaborate, organize, and move forward.",
    icon: Waypoints,
  },
];

export function RoleCards() {
  return (
    <section className="bg-[#f8fafc] py-20 sm:py-24 lg:py-28">
      <div className="container-shell">
        <SectionHeading
          eyebrow="Who it is for"
          title="Different paths. One shared place to meet."
          description="NextGen helps each person or organization participate in a way that fits what they are trying to do."
        />
        <div className="mt-12 grid border-l border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <article
                key={role.title}
                className="group min-h-[260px] border-b border-r border-slate-200 bg-white p-7 transition duration-300 hover:relative hover:z-10 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_45px_rgba(15,23,42,.08)] sm:p-8"
              >
                <span className="grid size-12 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-7 text-xl font-semibold tracking-[-0.02em] text-slate-950">{role.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{role.description}</p>
                <div aria-hidden="true" className="mt-7 h-px w-10 bg-slate-300 transition-all duration-300 group-hover:w-20 group-hover:bg-blue-500" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
