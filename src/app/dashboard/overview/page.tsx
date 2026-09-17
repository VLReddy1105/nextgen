import Link from "next/link";
import { getSessionContext } from "@/lib/supabase/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/utils";
import type { PrimaryRole } from "@/types";

const copy: Record<PrimaryRole, { title: string; description: string; action: string; href: string }> = {
  student: { title: "Your student workspace", description: "Explore projects, communities and opportunities at your own pace.", action: "My University", href: "/dashboard/my-university" },
  founder: { title: "Your founder workspace", description: "Build your profile and bring collaborators into your projects.", action: "Projects", href: "/dashboard/projects" },
  university: { title: "Your university workspace", description: "Manage your students and your university presence on GenZnect.", action: "Manage students", href: "/dashboard/students" },
  company: { title: "Your company workspace", description: "Develop your company presence and connect with the wider network.", action: "Opportunities", href: "/dashboard/opportunities" },
  mentor: { title: "Your mentor workspace", description: "Share your experience through projects and communities.", action: "Communities", href: "/dashboard/communities" },
};

export default async function DashboardOverviewPage() {
  const session = await getSessionContext();
  const role = session?.profile?.primary_role ?? "student";
  const supabase = await createSupabaseServerClient();
  const userId = session?.user.id ?? "";
  const [projects, communities, studentUniversities, officialOrganization] = await Promise.all([
    supabase.from("project_members").select("project_id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
    supabase.from("community_members").select("community_id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
    supabase.from("university_student_memberships").select("university_id", { count: "exact", head: true }).eq("student_user_id", userId).eq("status", "active"),
    supabase.from("organizations").select("id, name").eq("created_by", userId).eq("official_account", true).maybeSingle(),
  ]);
  const membershipCount = role === "student" ? studentUniversities.count ?? 0 : 0;
  const universityStudents = role === "university" && officialOrganization.data
    ? await supabase.from("university_student_memberships").select("id", { count: "exact", head: true }).eq("university_id", officialOrganization.data.id).eq("status", "active")
    : null;
  const headline = copy[role];
  const stats = role === "university"
    ? [["Active students", universityStudents?.count ?? 0], ["Projects", projects.count ?? 0], ["Communities", communities.count ?? 0]]
    : role === "student"
      ? [["University affiliations", membershipCount], ["Projects", projects.count ?? 0], ["Communities", communities.count ?? 0]]
      : [["Projects", projects.count ?? 0], ["Communities", communities.count ?? 0]];

  return <div className="mx-auto max-w-6xl"><p className="text-sm font-semibold text-blue-700">{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Welcome, {firstName(session?.profile?.full_name, session?.user.email)}.</h1><p className="mt-2 text-slate-600">{headline.description}</p>
    <section className="mt-8 rounded-2xl bg-slate-950 p-7 text-white sm:p-9"><p className="text-sm font-semibold text-blue-300">{officialOrganization.data?.name ?? "GenZnect"}</p><h2 className="mt-2 text-2xl font-semibold">{headline.title}</h2><p className="mt-2 max-w-2xl text-slate-300">Your account has one primary role. Project and community responsibilities are granted within each space.</p><Link href={headline.href} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-100">{headline.action}</Link></section>
    <div className="mt-6 grid gap-4 sm:grid-cols-3">{stats.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-6"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p></div>)}</div>
    {role === "student" && membershipCount === 0 ? <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-slate-950">Using GenZnect independently</h2><p className="mt-2 text-slate-600">Your Student account works without a university affiliation. A university can connect your account later.</p></section> : null}
  </div>;
}
