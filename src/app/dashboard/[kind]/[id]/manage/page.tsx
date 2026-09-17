import { notFound } from "next/navigation";
import { ManageSpace } from "@/components/dashboard/ManageSpace";
import { canManageCommunity, canManageProject } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ManageSpacePage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (kind !== "communities" && kind !== "projects") notFound();
  const allowed = kind === "communities" ? await canManageCommunity(id) : await canManageProject(id);
  if (!allowed) notFound();
  const supabase = await createSupabaseServerClient();
  const space = kind === "communities"
    ? await supabase.from("communities").select("id, name, description").eq("id", id).maybeSingle()
    : await supabase.from("projects").select("id, title, description").eq("id", id).maybeSingle();
  if (!space.data) notFound();
  const name = kind === "communities" ? (space.data as { name: string }).name : (space.data as { title: string }).title;
  const result = kind === "communities"
    ? await supabase.from("community_members").select("user_id, role, status").eq("community_id", id).eq("status", "active")
    : await supabase.from("project_members").select("user_id, role, status").eq("project_id", id).eq("status", "active");
  const members = result.data ?? [];
  const { data: profiles, error: profileError } = await supabase.rpc("list_space_member_names", { p_kind: kind, p_space_id: id });
  if (profileError) throw new Error("Could not load space member names.");
  const names = new Map(profiles?.map(item => [item.user_id, item.full_name]) ?? []);
  return <ManageSpace kind={kind} id={id} name={name} description={space.data.description ?? ""} members={members.map(item => ({ userId: item.user_id, name: names.get(item.user_id) || "Member", role: item.role }))} />;
}
