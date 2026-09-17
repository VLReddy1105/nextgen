import { UniversityStudents } from "@/components/university/UniversityStudents";
import { getOfficialOrganization } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function UniversityStudentsPage() {
  const organization = await getOfficialOrganization("university");
  if (!organization) return <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8"><h1 className="text-3xl font-semibold">Students</h1><p className="mt-3 text-slate-600">Your official university account needs to be set up before managing students.</p></div>;
  if (!organization.verified) return <div className="mx-auto max-w-5xl rounded-2xl border border-amber-200 bg-white p-8"><p className="text-sm font-semibold text-amber-700">Verification pending</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Students</h1><p className="mt-3 max-w-2xl text-slate-600">{organization.name} can enroll students after its official account is verified by GenZnect. Your university profile is saved, and no affiliation has been marked verified.</p></div>;
  const supabase = await createSupabaseServerClient();
  const [studentsResult, invitationsResult] = await Promise.all([
    supabase.rpc("list_university_students", { p_university_id: organization.id }),
    supabase.from("university_student_invitations").select("id, email, student_name, program, status, expires_at")
      .eq("university_id", organization.id).eq("status", "pending")
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
  ]);
  if (studentsResult.error || invitationsResult.error) return <div role="alert" className="rounded-xl bg-red-50 p-6 text-red-700">Could not load students. Check that the GenZnect migrations are applied.</div>;
  return <UniversityStudents universityName={organization.name} students={studentsResult.data ?? []} invitations={invitationsResult.data ?? []} />;
}
