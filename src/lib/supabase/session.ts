import "server-only";
import { cache } from "react";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";
import type { Tables } from "./types";

export type SessionProfile = Pick<Tables<"profiles">, "id" | "full_name" | "headline" | "avatar_url" | "role" | "primary_role" | "onboarding_completed" | "account_status">;

export interface SessionContext {
  user: User;
  /** Null means no row was returned; query failures are reported separately. */
  profile: SessionProfile | null;
  profileError: { code: string; message: string } | null;
}

/**
 * Returns the signed-in user and their profile row, or null when signed out.
 * Always uses getUser() rather than getSession() so the token is verified
 * against the auth server instead of trusted from the cookie.
 */
// React cache is scoped to one server render, never shared between users or requests.
export const getSessionContext = cache(async function getSessionContext(
  client?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<SessionContext | null> {
  const supabase = client ?? await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("[auth] user lookup failed", { code: authError.code, message: authError.message });
  }
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, headline, avatar_url, role, primary_role, onboarding_completed, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) console.error("[auth] profile lookup failed", { userId: user.id, code: error.code, message: error.message });
  else if (!profile) console.error("[auth] profile missing for authenticated user", { userId: user.id });

  return { user, profile, profileError: error ? { code: error.code, message: error.message } : null };
});
