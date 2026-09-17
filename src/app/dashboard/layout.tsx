import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/layout/DashboardChrome";
import { accountRoute, getAccountState } from "@/lib/auth/account-state";
import { getSessionContext } from "@/lib/supabase/session";
import { displayName, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Middleware already redirects signed-out users. This is the authoritative
  // check: it runs on the server for every dashboard render, so the tree can
  // never be rendered without a verified user even if middleware is bypassed.
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/dashboard/overview");
  const state = getAccountState(session);
  if (state !== "ready") redirect(accountRoute(state));
  if (!session.profile?.primary_role) redirect("/account-error");

  const name = displayName(session.profile?.full_name, session.user.email);

  return (
    <DashboardChrome role={session.profile.primary_role} user={{ name, initials: initials(name) }}>
      {children}
    </DashboardChrome>
  );
}
