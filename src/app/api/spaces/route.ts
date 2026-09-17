import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/supabase/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session?.profile?.onboarding_completed || session.profile.account_status !== "active") return NextResponse.json({ error: "Complete your account setup first." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }
  const kind = body.kind;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if ((kind !== "community" && kind !== "project") || name.length < 2 || name.length > 160 || description.length > 2000) return NextResponse.json({ error: "Check the name and description." }, { status: 400 });
  const slugBase = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "space";
  const slug = `${slugBase}-${randomBytes(4).toString("hex")}`;
  const supabase = await createSupabaseServerClient();
  const result = kind === "community"
    ? await supabase.rpc("create_community", { p_name: name, p_slug: slug, p_description: description || null })
    : await supabase.rpc("create_project", { p_title: name, p_slug: slug, p_description: description || null });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ id: result.data });
}
