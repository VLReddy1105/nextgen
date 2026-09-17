import { ResourceCollection } from "@/components/dashboard/ResourceCollection";
import { requireAuthenticatedUser } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page() {
  const session = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase.from("project_members").select("project_id, role").eq("user_id", session.user.id).eq("status", "active");
  const ids = memberships?.map(item => item.project_id) ?? [];
  const { data: projects } = ids.length ? await supabase.from("projects").select("id, title, description").in("id", ids) : { data: [] };
  const spaces = (projects ?? []).map(item => ({ id: item.id, name: item.title, description: item.description, role: memberships?.find(member => member.project_id === item.id)?.role ?? "member" }));
  return <ResourceCollection kind="projects" spaces={spaces} />;
}
