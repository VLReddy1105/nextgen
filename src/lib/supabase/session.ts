import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";
import type { Tables } from "./types";

export type SessionProfile = Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url" | "role">;

export interface SessionContext {
  user: User;
  /**
   * Null only if the on_auth_user_created trigger has not produced a row yet,
   * or if RLS hid it. Callers should degrade gracefully rather than throw.
   */
  profile: SessionProfile | null;
}

/**
 * Returns the signed-in user and their profile row, or null when signed out.
 * Always uses getUser() rather than getSession() so the token is verified
 * against the auth server instead of trusted from the cookie.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
}
