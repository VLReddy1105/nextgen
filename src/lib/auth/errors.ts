export const AUTH_MESSAGES = {
  CONFIG_MISSING: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the development server.",
  CONFIG_INVALID: "Supabase configuration is invalid. Check the project URL and matching public anon or publishable key, then restart the development server. Never use a secret or service-role key.",
  NETWORK_ERROR: "Could not connect to the authentication service. Check your connection and whether your Supabase project is running, then try again.",
  INVALID_CREDENTIALS: "The email or password is incorrect. Please try again.",
  EMAIL_NOT_VERIFIED: "Confirm your email before signing in. Check your inbox for the verification link.",
  ACCOUNT_PENDING: "Your email is confirmed. Your account is awaiting approval before you can enter the workspace.",
  ACCOUNT_DISABLED: "Your account has been suspended or disabled. Contact GenZnect support if you believe this is a mistake.",
  LINK_INVALID: "This authentication link is invalid or has expired. Request a new link and try again.",
  RATE_LIMITED: "Too many attempts. Please wait a little before trying again.",
  WEAK_PASSWORD: "Choose a stronger password with at least eight characters.",
  UNKNOWN_AUTH_ERROR: "Authentication could not be completed. Please try again or contact support if the problem continues.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_MESSAGES;

export function authErrorMessage(code: string | undefined) {
  return code && Object.prototype.hasOwnProperty.call(AUTH_MESSAGES, code)
    ? AUTH_MESSAGES[code as AuthErrorCode] : AUTH_MESSAGES.UNKNOWN_AUTH_ERROR;
}

/** Never pass provider messages, callback query strings, or exception details to the UI. */
export function mapAuthError(error: unknown): { code: AuthErrorCode; message: string } {
  const value = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  let code: AuthErrorCode = "UNKNOWN_AUTH_ERROR";
  if (value.name === "SupabaseConfigError" && (value.code === "CONFIG_MISSING" || value.code === "CONFIG_INVALID")) code = value.code;
  else if (value.code === "invalid_credentials") code = "INVALID_CREDENTIALS";
  else if (value.code === "email_not_confirmed") code = "EMAIL_NOT_VERIFIED";
  else if (value.code === "user_banned") code = "ACCOUNT_DISABLED";
  else if (value.code === "weak_password") code = "WEAK_PASSWORD";
  else if (["otp_expired", "flow_state_expired", "flow_state_not_found", "bad_code_verifier", "validation_failed"].includes(String(value.code))) code = "LINK_INVALID";
  else if (value.status === 429 || ["over_request_rate_limit", "over_email_send_rate_limit"].includes(String(value.code))) code = "RATE_LIMITED";
  else if (value.status === 0 || value.name === "AuthRetryableFetchError" ||
    (value.name === "TypeError" && /^(failed to fetch|fetch failed|networkerror when attempting to fetch resource\.?|load failed)$/i.test(String(value.message)))) code = "NETWORK_ERROR";
  return { code, message: AUTH_MESSAGES[code] };
}
