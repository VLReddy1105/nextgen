import Link from "next/link";
import { redirect } from "next/navigation";
import { accountRoute, getAccountState } from "@/lib/auth/account-state";
import { getSessionContext } from "@/lib/supabase/session";
import { acceptInvitation } from "./actions";

export default async function InvitationPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const validShape = /^[0-9a-f]{64}$/.test(token);
  const session = await getSessionContext();
  const state = session ? getAccountState(session) : null;
  if (state && state !== "onboarding" && state !== "ready") redirect(accountRoute(state));
  const next = encodeURIComponent(`/invite/${token}`);
  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10"><p className="text-sm font-semibold text-blue-700">GenZnect invitation</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Connect with your University</h1><p className="mt-3 leading-7 text-slate-600">Use the verified Student account matching the invitation email. Your university affiliation will be added to that account.</p>
    {!validShape || error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">This invitation is invalid, expired, or belongs to a different email address.</p> : null}
    {!session ? <div className="mt-7 flex flex-wrap gap-3"><Link href={`/signup?next=${next}`} className="rounded-full bg-blue-600 px-5 py-3 font-semibold text-white">Create Student account</Link><Link href={`/login?next=${next}`} className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-800">Sign in</Link></div> : session.profile?.primary_role && session.profile.primary_role !== "student" ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A Student account is required. Your current primary role cannot be changed through an invitation.</p> : state === "onboarding" ? <Link href={`/onboarding?next=${next}`} className="mt-7 inline-flex min-h-11 items-center rounded-full bg-blue-600 px-5 font-semibold text-white">Set up Student account</Link> : <form action={acceptInvitation} className="mt-7"><input type="hidden" name="token" value={token} /><button disabled={!validShape} className="min-h-12 rounded-full bg-blue-600 px-6 font-semibold text-white disabled:opacity-50">Accept invitation</button></form>}
  </div></main>;
}
