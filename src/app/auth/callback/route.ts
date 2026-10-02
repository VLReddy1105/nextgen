import { mapAuthError } from "@/lib/auth/errors";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { accountRoute, getAccountState } from "@/lib/auth/account-state";
import { redirectToPath, safeInternalPath } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/supabase/session";

/**
 * Handles every link Supabase Auth emails out:
 *   - PKCE / OAuth      -> ?code=...
 *   - Email confirmation and recovery -> ?token_hash=...&type=...
 *
 * Both paths end with session cookies written and a redirect to ?next=.
 * All redirects are relative, so they resolve against the deployment's own
 * origin whether that is localhost, a Vercel preview, or the production domain.
 */

function loginWithError(message: string) {
  return redirectToPath(`/login?error=${encodeURIComponent(message)}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const requestedNext = safeInternalPath(searchParams.get("next"), "/dashboard/overview");
  // Older confirmation emails nested the final destination inside /onboarding.
  const next = requestedNext.startsWith("/onboarding?")
    ? safeInternalPath(new URL(requestedNext, "https://genznect.invalid").searchParams.get("next"), "/dashboard/overview")
    : requestedNext;

  // Supabase reports link-level failures (expired, already used) as query params.
  const errorDescription = searchParams.get("error_description") ?? searchParams.get("error");
  if (errorDescription) return loginWithError("LINK_INVALID");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return loginWithError(mapAuthError(error).code);
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) return loginWithError(mapAuthError(error).code);
    } else {
      return loginWithError("LINK_INVALID");
    }

    // Recovery needs its authenticated session but must be allowed to reach the
    // password form even if the profile is pending, suspended, or unavailable.
    if (next === "/reset-password") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return loginWithError("LINK_INVALID");
      return redirectToPath(next);
    }

    const session = await getSessionContext(supabase);
    if (!session) return loginWithError("LINK_INVALID");

    const state = getAccountState(session);
    // Keep invitation paths and other token-bearing destinations out of logs.
    console.info("[auth] confirmation redirect", { userId: session.user.id, accountState: state });
    return redirectToPath(accountRoute(state, next));
  } catch (error) {
    return loginWithError(mapAuthError(error).code);
  }
}
