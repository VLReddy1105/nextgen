import Link from "next/link";
import { redirect } from "next/navigation";
import { accountRoute, getAccountState } from "@/lib/auth/account-state";
import { getSessionContext } from "@/lib/supabase/session";

export default async function VerifyEmailPage() {
  const session = await getSessionContext();
  if (session) {
    const state = getAccountState(session);
    if (state !== "verify-email") redirect(accountRoute(state));
  }

  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5"><div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8"><p className="text-sm font-semibold text-blue-700">Email confirmation</p><h1 className="mt-3 text-3xl font-semibold text-slate-950">Check your email</h1><p className="mt-3 leading-7 text-slate-600">Open the confirmation link we sent you, then continue to GenZnect. If you have already confirmed your email, sign in again.</p><div className="mt-6 flex flex-wrap gap-3">{session ? <form action="/auth/signout" method="post"><button className="min-h-11 rounded-full bg-blue-600 px-5 font-semibold text-white">Sign out</button></form> : <Link href="/login" className="inline-flex min-h-11 items-center rounded-full bg-blue-600 px-5 font-semibold text-white">Sign in</Link>}<Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 font-semibold text-slate-800">Home</Link></div></div></main>;
}
