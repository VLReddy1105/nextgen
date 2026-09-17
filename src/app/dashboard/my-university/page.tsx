import { requirePrimaryRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyUniversityPage() {
  const session = await requirePrimaryRole("student");
  const supabase = await createSupabaseServerClient();
  const { data: memberships, error } = await supabase.from("university_student_memberships")
    .select("university_id, program, department, joined_at")
    .eq("student_user_id", session.user.id).eq("status", "active").order("joined_at", { ascending: false });
  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">Could not load university affiliations.</p>;
  const ids = memberships?.map(item => item.university_id) ?? [];
  const { data: organizations } = ids.length ? await supabase.from("organizations").select("id, name, website")
    .in("id", ids) : { data: [] };
  const byId = new Map(organizations?.map(item => [item.id, item]) ?? []);
  return <div className="mx-auto max-w-5xl"><p className="text-sm font-semibold text-blue-700">Student workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">My University</h1><p className="mt-2 text-slate-600">Official university affiliations connected to your account.</p>
    {memberships?.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2">{memberships.map(item => { const organization = byId.get(item.university_id); return <article key={item.university_id} className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">University Student · Active</p><h2 className="mt-3 text-xl font-semibold text-slate-950">{organization?.name ?? "University"}</h2>{item.program ? <p className="mt-2 text-sm text-slate-600">{item.program}{item.department ? ` · ${item.department}` : ""}</p> : null}<p className="mt-3 text-sm text-slate-500">Connected {new Date(item.joined_at).toLocaleDateString()}</p></article>; })}</div> : <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-lg font-semibold text-slate-950">University affiliation</h2><p className="mt-2 text-slate-600">You are currently using GenZnect independently.</p></div>}
  </div>;
}
