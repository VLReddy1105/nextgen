import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import type { Database } from "./types";

/**
 * Refreshes the Supabase auth cookies for this request and reports who is
 * signed in. The caller owns routing decisions -- see src/middleware.ts.
 *
 * The returned response carries the refreshed cookies. If the caller replaces
 * it (e.g. with a redirect) it must copy those cookies across, otherwise a
 * refreshed token is dropped and the user is silently signed out.
 */
export async function updateSupabaseSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });
  let config: ReturnType<typeof getSupabaseConfig>;
  try { config = getSupabaseConfig(); }
  catch { return { response, user: null }; }
  const { url, anonKey } = config;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
