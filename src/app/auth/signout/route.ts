import { redirectToPath } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // 303 so the browser follows with GET instead of re-POSTing to /login.
  return redirectToPath("/login", 303);
}
