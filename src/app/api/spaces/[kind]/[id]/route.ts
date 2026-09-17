import { NextResponse, type NextRequest } from "next/server";
import { canManageCommunity, canManageProject } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function access(kind: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return kind === "communities" ? canManageCommunity(id) : kind === "projects" ? canManageProject(id) : false;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!await access(kind, id)) return NextResponse.json({ error: "Management access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (name.length < 2 || name.length > 160 || description.length > 2000) return NextResponse.json({ error: "Check the name and description." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const result = kind === "communities"
    ? await supabase.from("communities").update({ name, description: description || null }).eq("id", id)
    : await supabase.from("projects").update({ title: name, description: description || null }).eq("id", id);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!await access(kind, id)) return NextResponse.json({ error: "Management access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role : "";
  const allowed = kind === "communities" ? ["captain", "moderator", "member"] : ["project_head", "team_lead", "member", "mentor"];
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !allowed.includes(role)) return NextResponse.json({ error: "Enter a valid email and role." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const result = kind === "communities"
    ? await supabase.rpc("assign_community_member_by_email", { p_community_id: id, p_email: email, p_role: role })
    : await supabase.rpc("assign_project_member_by_email", { p_project_id: id, p_email: email, p_role: role });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ status: result.data });
}
