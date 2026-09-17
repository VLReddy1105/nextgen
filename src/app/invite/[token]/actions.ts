"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function acceptInvitation(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) redirect("/dashboard/my-university?error=invalid");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  const hash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.rpc("accept_university_invitation", { p_token_hash: hash });
  if (error) redirect(`/invite/${token}?error=invalid`);
  redirect("/dashboard/my-university");
}
