export type AccountState =
  | "verify-email"
  | "profile-error"
  | "profile-missing"
  | "pending"
  | "unavailable"
  | "onboarding"
  | "ready";

type AccountSnapshot = {
  user: { email_confirmed_at?: string | null };
  profile: {
    primary_role: string | null;
    onboarding_completed: boolean;
    account_status: string;
  } | null;
  profileError: { code: string; message: string } | null;
};

/** Email verification, profile health, and account approval are separate states. */
export function getAccountState(session: AccountSnapshot): AccountState {
  if (!session.user.email_confirmed_at) return "verify-email";
  if (session.profileError) return "profile-error";
  if (!session.profile) return "profile-missing";

  if (session.profile.account_status === "suspended" || session.profile.account_status === "disabled") return "unavailable";
  if (session.profile.account_status === "pending") return "pending";
  if (session.profile.account_status !== "active") return "profile-error";
  if (!session.profile.primary_role && session.profile.onboarding_completed) return "profile-error";
  if (!session.profile.primary_role || !session.profile.onboarding_completed) return "onboarding";
  return "ready";
}

/** `next` must already be validated as a same-origin path by its caller. */
export function accountRoute(state: AccountState, next = "/dashboard/overview") {
  switch (state) {
    case "verify-email": return "/verify-email";
    case "profile-error":
    case "profile-missing": return "/account-error";
    case "pending": return "/pending-approval";
    case "unavailable": return "/account-unavailable";
    case "onboarding": return `/onboarding?next=${encodeURIComponent(next)}`;
    case "ready": return next;
  }
}
