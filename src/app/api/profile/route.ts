import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/supabase/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session?.profile?.primary_role || !session.profile.onboarding_completed || session.profile.account_status !== "active") return NextResponse.json({ error: "Active account required." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const headline = typeof body.headline === "string" ? body.headline.trim() : "";
  const fieldOfStudy = typeof body.fieldOfStudy === "string" ? body.fieldOfStudy.trim() : "";
  const degree = typeof body.degree === "string" ? body.degree.trim() : "";
  const organizationName = typeof body.organizationName === "string" ? body.organizationName.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";
  const topics = (value: unknown) => typeof value === "string" ? value.split(",").map(item => item.trim()).filter(Boolean) : [];
  const skills = topics(body.skills);
  const interests = topics(body.interests);
  const expertise = topics(body.expertise);
  const portfolioUrl = typeof body.portfolioUrl === "string" ? body.portfolioUrl.trim() : "";
  const linkedinUrl = typeof body.linkedinUrl === "string" ? body.linkedinUrl.trim() : "";
  const githubUrl = typeof body.githubUrl === "string" ? body.githubUrl.trim() : "";
  if (name.length < 2 || name.length > 160 || headline.length > 240 || fieldOfStudy.length > 160 || degree.length > 120 || organizationName.length > 160 ||
      [skills, interests, expertise].some(items => items.length > 20) || [...skills, ...interests, ...expertise].some(item => item.length > 80)) return NextResponse.json({ error: "Check the field lengths." }, { status: 400 });
  for (const value of [website, portfolioUrl, linkedinUrl, githubUrl].filter(Boolean)) {
    try { if (value.length > 2048 || !["http:", "https:"].includes(new URL(value).protocol)) throw new Error(); }
    catch { return NextResponse.json({ error: "Enter valid HTTPS or HTTP URLs." }, { status: 400 }); }
  }
  const supabase = await createSupabaseServerClient();
  const { error: profileError } = await supabase.from("profiles").update({ full_name: name, headline: headline || null }).eq("id", session.user.id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  if (session.profile.primary_role === "student") {
    const { error } = await supabase.from("student_details").upsert({ profile_id: session.user.id, field_of_study: fieldOfStudy || null, degree_level: degree || null,
      skills, interests, portfolio_url: portfolioUrl || null, linkedin_url: linkedinUrl || null, github_url: githubUrl || null });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (session.profile.primary_role === "founder") {
    const { error } = await supabase.from("founder_profiles").upsert({ user_id: session.user.id, headline: headline || null });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (session.profile.primary_role === "mentor") {
    const { error } = await supabase.from("mentor_profiles").upsert({ user_id: session.user.id, headline: headline || null, expertise });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (organizationName.length >= 2) {
    const { error } = await supabase.from("organizations").update({ name: organizationName, website: website || null })
      .eq("created_by", session.user.id).eq("type", session.profile.primary_role).eq("official_account", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
