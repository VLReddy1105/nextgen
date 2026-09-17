import "server-only";
import { redirect } from "next/navigation";
import { accountRoute, getAccountState } from "./account-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/supabase/session";
import type { PrimaryRole } from "@/types";

export async function requireAuthenticatedUser() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  return session;
}

export async function requirePrimaryRole(role: PrimaryRole) {
  const session = await requireAuthenticatedUser();
  const state = getAccountState(session);
  if (state !== "ready") redirect(accountRoute(state));
  if (session.profile?.primary_role !== role) redirect("/dashboard/overview");
  return session;
}

export async function getOfficialOrganization(role: "university" | "company") {
  const session = await requirePrimaryRole(role);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("organizations")
    .select("id, name, website, verified")
    .eq("created_by", session.user.id).eq("type", role).eq("official_account", true).maybeSingle();
  if (error) throw new Error("Could not load your organization.");
  return data;
}

export async function canManageCommunity(communityId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("is_community_captain", { p_community_id: communityId });
  return data === true;
}

export async function canManageProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("is_project_head", { p_project_id: projectId });
  return data === true;
}
