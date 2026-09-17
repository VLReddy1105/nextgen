"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { safeInternalPath } from "@/lib/http";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PasswordField } from "./PasswordField";

interface LoginFormProps {
  /** Surfaced by /auth/callback when a confirmation or recovery link fails. */
  notice?: string;
}

export function LoginForm({ notice }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({ form: notice });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) {
        setErrors({ form: error.message });
        return;
      }

      router.push(safeInternalPath(new URLSearchParams(window.location.search).get("next"), "/dashboard/overview"));
      // Without this the server components above still render the signed-out tree.
      router.refresh();
    } catch {
      setErrors({ form: "Could not reach Supabase. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Sign in to GenZnect</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">Continue to your communities, opportunities, and workspace.</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="login-email" className="text-[15px] font-semibold text-slate-800">Email address</label>
          <input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "login-email-error" : undefined} className={`mt-2 h-13 w-full rounded-xl border bg-white px-4 text-base text-slate-950 outline-none transition focus:ring-4 ${errors.email ? "border-red-500 focus:ring-red-600/10" : "border-slate-300 focus:border-blue-500 focus:ring-blue-600/10"}`} />
          {errors.email ? <p id="login-email-error" role="alert" className="mt-2 text-[14px] font-medium text-red-600">{errors.email}</p> : null}
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold text-slate-800">Password</span>
            <Link href="/forgot-password" className="text-[14px] font-semibold text-blue-700 hover:text-blue-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">Forgot password?</Link>
          </div>
          <PasswordField hideLabel label="Password" name="password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
        </div>
        {errors.form ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[14px] leading-6 text-red-700">{errors.form}</p> : null}
        <Button type="submit" disabled={loading} className="w-full rounded-xl">
          {loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-[13px] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
      <button type="button" disabled className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-[15px] font-semibold text-slate-400">Google sign-in available after setup</button>
      <p className="mt-7 text-center text-[15px] text-slate-600">New to GenZnect? <Link href="/signup" className="font-semibold text-blue-700 hover:text-blue-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">Create an account</Link></p>
    </div>
  );
}
