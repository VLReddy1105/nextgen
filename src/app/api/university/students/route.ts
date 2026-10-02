import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/supabase/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function universityAccess() {
  const session = await getSessionContext();
  if (
    session?.profile?.primary_role !== "university" ||
    !session.profile.onboarding_completed ||
    session.profile.account_status !== "active"
  )
    return null;
  const supabase = await createSupabaseServerClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, verified")
    .eq("created_by", session.user.id)
    .eq("type", "university")
    .eq("official_account", true)
    .maybeSingle();
  return organization?.verified
    ? { supabase, universityId: organization.id }
    : null;
}

export async function POST(request: NextRequest) {
  const access = await universityAccess();
  if (!access)
    return NextResponse.json(
      { error: "University access required." },
      { status: 403 },
    );
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const identifier =
    typeof body.identifier === "string" ? body.identifier.trim() : "";
  const program = typeof body.program === "string" ? body.program.trim() : "";
  const department =
    typeof body.department === "string" ? body.department.trim() : "";
  if (
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    email.length > 320 ||
    [name, identifier, program, department].some((value) => value.length > 160)
  ) {
    return NextResponse.json(
      { error: "Check the email and field lengths." },
      { status: 400 },
    );
  }
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await access.supabase.rpc("eco_campus_invite", {
    p_university_id: access.universityId,
    p_email: email,
    p_token_hash: hash,
    p_student_name: name || null,
    p_student_identifier: identifier || null,
    p_program: program || null,
    p_department: department || null,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    status: data,
    invitationPath: data === "invited" ? `/invite/${token}` : undefined,
  });
}

export async function DELETE(request: NextRequest) {
  const access = await universityAccess();
  if (!access)
    return NextResponse.json(
      { error: "University access required." },
      { status: 403 },
    );
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const studentUserId =
    typeof body.studentUserId === "string" ? body.studentUserId : null;
  const invitationId =
    typeof body.invitationId === "string" ? body.invitationId : null;
  if (Boolean(studentUserId) === Boolean(invitationId))
    return NextResponse.json(
      { error: "Choose one relationship." },
      { status: 400 },
    );
  const { error } = studentUserId
    ? await access.supabase.rpc("revoke_university_student", {
        p_university_id: access.universityId,
        p_student_user_id: studentUserId,
      })
    : await access.supabase.rpc("cancel_university_invitation", {
        p_university_id: access.universityId,
        p_invitation_id: invitationId!,
      });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
