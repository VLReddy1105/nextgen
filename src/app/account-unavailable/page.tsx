import Link from "next/link";
import { redirect } from "next/navigation";
import { accountRoute, getAccountState } from "@/lib/auth/account-state";
import { getSessionContext } from "@/lib/supabase/session";

export default async function AccountUnavailablePage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  const state = getAccountState(session);
  if (state !== "unavailable") redirect(accountRoute(state));
  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5"><div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8"><p className="text-sm font-semibold text-blue-700">GenZnect account</p><h1 className="mt-3 text-3xl font-semibold text-slate-950">Your account is unavailable.</h1><p className="mt-3 leading-7 text-slate-600">Your account has been suspended or disabled. Contact GenZnect support if you believe this is a mistake.</p><div className="mt-6 flex gap-4"><Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 font-semibold text-slate-800">Home</Link><form action="/auth/signout" method="post"><button className="min-h-11 rounded-full bg-slate-950 px-5 font-semibold text-white">Sign out</button></form></div></div></main>;
}
