"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { safeInternalPath } from "@/lib/http";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PrimaryRole } from "@/types";
import { PasswordField } from "./PasswordField";

const SIGNUP_ROLES: { value: PrimaryRole; label: string; description: string }[] = [
  { value: "student", label: "Student", description: "Explore opportunities, projects and mentors." },
  { value: "founder", label: "Founder", description: "Build and connect with talent." },
  { value: "university", label: "University", description: "Manage students and partnerships." },
  { value: "company", label: "Company", description: "Discover talent and industry connections." },
  { value: "mentor", label: "Mentor", description: "Guide students and project teams." },
];

function signupNext() {
  const value = new URLSearchParams(window.location.search).get("next");
  return safeInternalPath(value, "/dashboard/overview");
}

export function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    name: "",
    email: "",
    role: "student" as PrimaryRole,
    password: "",
    confirm: "",
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (values.name.trim().length < 2) nextErrors.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = "Enter a valid email address.";
    if (values.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (values.password !== values.confirm) nextErrors.confirm = "Passwords do not match.";
    if (!values.terms) nextErrors.terms = "Please agree before creating an account.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const onboardingPath = `/onboarding?next=${encodeURIComponent(signupNext())}`;
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          // Read by the on_auth_user_created trigger to populate public.profiles.
          data: { full_name: values.name.trim(), role: values.role },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(signupNext())}`,
        },
      });

      if (error) {
        setErrors({ form: error.message });
        return;
      }

      if (data.session) {
        // Email confirmation is disabled; the user is already signed in.
        router.push(onboardingPath);
        router.refresh();
        return;
      }

      router.push("/verify-email");
      router.refresh();
    } catch {
      setErrors({ form: "Could not reach Supabase. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Join the community</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Create your account</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">One account, with a workspace for your role.</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="signup-name" className="text-[15px] font-semibold text-slate-800">Full name</label>
          <input id="signup-name" name="name" autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} aria-invalid={Boolean(errors.name)} className={`mt-2 h-13 w-full rounded-xl border bg-white px-4 text-base outline-none transition focus:ring-4 ${errors.name ? "border-red-500 focus:ring-red-600/10" : "border-slate-300 focus:border-blue-500 focus:ring-blue-600/10"}`} />
          {errors.name ? <p role="alert" className="mt-2 text-[14px] font-medium text-red-600">{errors.name}</p> : null}
        </div>
        <div>
          <label htmlFor="signup-email" className="text-[15px] font-semibold text-slate-800">Email address</label>
          <input id="signup-email" name="email" type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} aria-invalid={Boolean(errors.email)} className={`mt-2 h-13 w-full rounded-xl border bg-white px-4 text-base outline-none transition focus:ring-4 ${errors.email ? "border-red-500 focus:ring-red-600/10" : "border-slate-300 focus:border-blue-500 focus:ring-blue-600/10"}`} />
          {errors.email ? <p role="alert" className="mt-2 text-[14px] font-medium text-red-600">{errors.email}</p> : null}
        </div>
        <div>
          <fieldset><legend className="text-[15px] font-semibold text-slate-800">How are you joining GenZnect?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SIGNUP_ROLES.map((role) => <label key={role.value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 focus-within:ring-4 focus-within:ring-blue-600/10 ${values.role === role.value ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}><input type="radio" name="role" value={role.value} checked={values.role === role.value} onChange={() => setValues({ ...values, role: role.value })} className="mt-1 accent-blue-600" /><span><span className="block text-sm font-semibold text-slate-900">{role.label}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{role.description}</span></span></label>)}
          </div></fieldset>
        </div>
        <PasswordField label="Password" name="password" autoComplete="new-password" value={values.password} onChange={(password) => setValues({ ...values, password })} error={errors.password} />
        <PasswordField label="Confirm password" name="confirm-password" autoComplete="new-password" value={values.confirm} onChange={(confirm) => setValues({ ...values, confirm })} error={errors.confirm} />
        <div>
          <label className="flex items-start gap-3 text-[15px] leading-6 text-slate-600">
            <input type="checkbox" checked={values.terms} onChange={(event) => setValues({ ...values, terms: event.target.checked })} className="mt-1 size-4 rounded border-slate-300 accent-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20" />
            <span>I agree to the <Link href="/terms" className="font-semibold text-blue-700">Terms</Link> and <Link href="/privacy" className="font-semibold text-blue-700">Privacy Policy</Link>.</span>
          </label>
          {errors.terms ? <p role="alert" className="mt-2 text-[14px] font-medium text-red-600">{errors.terms}</p> : null}
        </div>
        {errors.form ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[14px] leading-6 text-red-700">{errors.form}</p> : null}
        <Button type="submit" disabled={loading} className="w-full rounded-xl">{loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{loading ? "Creating account…" : "Create account"}</Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-[13px] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
      <button type="button" disabled className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-[15px] font-semibold text-slate-400">Google signup available after setup</button>
      <p className="mt-7 text-center text-[15px] text-slate-600">Already a member? <Link href="/login" className="font-semibold text-blue-700">Sign in</Link></p>
    </div>
  );
}
