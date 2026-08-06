import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirectToPath } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles every link Supabase Auth emails out:
 *   - PKCE / OAuth      -> ?code=...
 *   - Email confirmation and recovery -> ?token_hash=...&type=...
 *
 * Both paths end with session cookies written and a redirect to ?next=.
 * All redirects are relative, so they resolve against the deployment's own
 * origin whether that is localhost, a Vercel preview, or the production domain.
 */

/** Rejects absolute URLs and protocol-relative paths so ?next= cannot be used as an open redirect. */
function safeNext(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function loginWithError(message: string) {
  return redirectToPath(`/login?error=${encodeURIComponent(message)}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"), "/dashboard/overview");

  // Supabase reports link-level failures (expired, already used) as query params.
  const errorDescription = searchParams.get("error_description") ?? searchParams.get("error");
  if (errorDescription) return loginWithError(errorDescription);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginWithError(error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return loginWithError(error.message);
  } else {
    return loginWithError("That link is missing its confirmation code. Please request a new one.");
  }

  return redirectToPath(next);
}
