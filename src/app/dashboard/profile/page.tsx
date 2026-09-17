import { requireAuthenticatedUser } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

export default async function ProfilePage() {
  const session = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const role = session.profile?.primary_role ?? "student";
  const [student, mentor, organization] = await Promise.all([
    role === "student" ? supabase.from("student_details").select("field_of_study, degree_level, skills, interests, portfolio_url, linkedin_url, github_url").eq("profile_id", session.user.id).maybeSingle() : Promise.resolve({ data: null }),
    role === "mentor" ? supabase.from("mentor_profiles").select("expertise").eq("user_id", session.user.id).maybeSingle() : Promise.resolve({ data: null }),
    role === "university" || role === "company" ? supabase.from("organizations").select("name, website").eq("created_by", session.user.id).eq("official_account", true).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return <ProfileEditor role={role} name={session.profile?.full_name ?? ""} headline={session.profile?.headline ?? ""} fieldOfStudy={student.data?.field_of_study ?? ""} degree={student.data?.degree_level ?? ""}
    skills={student.data?.skills.join(", ") ?? ""} interests={student.data?.interests.join(", ") ?? ""} expertise={mentor.data?.expertise.join(", ") ?? ""}
    portfolioUrl={student.data?.portfolio_url ?? ""} linkedinUrl={student.data?.linkedin_url ?? ""} githubUrl={student.data?.github_url ?? ""}
    organizationName={organization.data?.name ?? ""} website={organization.data?.website ?? ""} />;
}
