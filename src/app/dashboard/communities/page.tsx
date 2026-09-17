import { ResourceCollection } from "@/components/dashboard/ResourceCollection";
import { requireAuthenticatedUser } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Page() {
  const session = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase.from("community_members").select("community_id, role").eq("user_id", session.user.id).eq("status", "active");
  const ids = memberships?.map(item => item.community_id) ?? [];
  const { data: communities } = ids.length ? await supabase.from("communities").select("id, name, description").in("id", ids) : { data: [] };
  const spaces = (communities ?? []).map(item => ({ ...item, role: memberships?.find(member => member.community_id === item.id)?.role ?? "member" }));
  return <ResourceCollection kind="communities" spaces={spaces} />;
}
