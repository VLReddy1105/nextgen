import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { GenZnectLogo } from "@/components/brand/GenZnectLogo";
import { accountRoute, getAccountState } from "@/lib/auth/account-state";
import { safeInternalPath } from "@/lib/http";
import { getSessionContext } from "@/lib/supabase/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSessionContext();
  if (!session) redirect("/login?next=/onboarding");
  const { next: requestedNext } = await searchParams;
  const next = safeInternalPath(requestedNext, "/dashboard/overview");
  const state = getAccountState(session);
  if (state !== "onboarding") redirect(accountRoute(state, next));
  const role = session.profile?.primary_role;
  const supabase = await createSupabaseServerClient();
  const { data: organization } = role === "university" || role === "company"
    ? await supabase.from("organizations").select("name, website").eq("created_by", session.user.id).eq("type", role).order("created_at").limit(1).maybeSingle()
    : { data: null };
  return <main className="min-h-dvh bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="container-shell flex min-h-18 items-center"><GenZnectLogo /></div></header><div className="mx-auto max-w-3xl px-4 py-10 sm:py-16"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"><OnboardingForm initialRole={role ?? null} initialName={session.profile?.full_name ?? ""} initialOrganizationName={organization?.name ?? ""} initialWebsite={organization?.website ?? ""} next={next} /></div></div></main>;
}
