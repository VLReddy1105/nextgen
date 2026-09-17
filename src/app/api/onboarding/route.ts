import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PrimaryRole } from "@/types";

const roles: PrimaryRole[] = ["student", "founder", "university", "company", "mentor"];

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: "Confirm your email before completing account setup." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const role = body.role;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const headline = typeof body.headline === "string" ? body.headline.trim() : "";
  const organizationName = typeof body.organizationName === "string" ? body.organizationName.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";
  const fieldOfStudy = typeof body.fieldOfStudy === "string" ? body.fieldOfStudy.trim() : "";
  const degree = typeof body.degree === "string" ? body.degree.trim() : "";
  const topics = (value: unknown) => typeof value === "string" ? value.split(",").map(item => item.trim()).filter(Boolean) : [];
  const skills = topics(body.skills);
  const interests = topics(body.interests);
  const expertise = topics(body.expertise);
  const portfolioUrl = typeof body.portfolioUrl === "string" ? body.portfolioUrl.trim() : "";
  const linkedinUrl = typeof body.linkedinUrl === "string" ? body.linkedinUrl.trim() : "";
  const githubUrl = typeof body.githubUrl === "string" ? body.githubUrl.trim() : "";
  if (!roles.includes(role as PrimaryRole) || name.length < 2 || name.length > 160 ||
      headline.length > 240 || organizationName.length > 160 || fieldOfStudy.length > 160 || degree.length > 120 ||
      [skills, interests, expertise].some(items => items.length > 20) || [...skills, ...interests, ...expertise].some(item => item.length > 80) ||
      ((role === "university" || role === "company") && organizationName.length < 2)) {
    return NextResponse.json({ error: "Check the required fields and try again." }, { status: 400 });
  }
  for (const value of [website, portfolioUrl, linkedinUrl, githubUrl].filter(Boolean)) {
    try { if (value.length > 2048 || !['http:', 'https:'].includes(new URL(value).protocol)) throw new Error(); }
    catch { return NextResponse.json({ error: "Enter a valid website URL." }, { status: 400 }); }
  }
  const { error } = await supabase.rpc("finish_onboarding", {
    p_role: role as PrimaryRole, p_name: name, p_headline: headline || null,
    p_organization_name: organizationName || null, p_website: website || null,
    p_field_of_study: fieldOfStudy || null, p_degree: degree || null,
    p_skills: skills, p_interests: interests, p_expertise: expertise,
    p_portfolio_url: portfolioUrl || null, p_linkedin_url: linkedinUrl || null, p_github_url: githubUrl || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
