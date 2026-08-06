"use client";

import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PasswordField } from "./PasswordField";

interface RecoveryFormProps { mode: "forgot" | "reset"; }

export function RecoveryForm({ mode }: RecoveryFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    if (mode === "forgot" && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "reset" && (password.length < 8 || password !== confirm)) {
      setError(password.length < 8 ? "Use at least 8 characters." : "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "forgot") {
        // The link lands on /auth/callback, which establishes the recovery
        // session before handing off to /reset-password.
        const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (requestError) {
          setError(requestError.message);
          return;
        }
        setStatus(`If an account exists for ${email.trim()}, a recovery link is on its way.`);
        return;
      }

      // Requires the recovery session created by /auth/callback.
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          updateError.message.toLowerCase().includes("session")
            ? "This recovery link has expired or was already used. Request a new one."
            : updateError.message,
        );
        return;
      }
      setStatus("Password updated. Taking you to your dashboard…");
      router.push("/dashboard/overview");
      router.refresh();
    } catch {
      setError("Could not reach Supabase. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isForgot = mode === "forgot";
  return (
    <div>
      <Link href="/login" className="inline-flex items-center gap-2 rounded text-[15px] font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"><ArrowLeft aria-hidden="true" className="size-4" />Back to sign in</Link>
      <h1 className="mt-7 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{isForgot ? "Reset your password" : "Choose a new password"}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{isForgot ? "Enter your account email and we’ll send you a secure recovery link." : "Use a strong password you do not use on other services."}</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {isForgot ? (
          <div>
            <label htmlFor="recovery-email" className="text-[15px] font-semibold text-slate-800">Email address</label>
            <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} className={`mt-2 h-13 w-full rounded-xl border bg-white px-4 text-base outline-none transition focus:ring-4 ${error ? "border-red-500 focus:ring-red-600/10" : "border-slate-300 focus:border-blue-500 focus:ring-blue-600/10"}`} />
          </div>
        ) : (
          <>
            <PasswordField label="New password" name="password" autoComplete="new-password" value={password} onChange={setPassword} error={error && password.length < 8 ? error : undefined} />
            <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} error={error && password.length >= 8 ? error : undefined} />
          </>
        )}
        {isForgot && error ? <p role="alert" className="text-[14px] font-medium text-red-600">{error}</p> : null}
        {!isForgot && error && password.length >= 8 && password === confirm ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[14px] leading-6 text-red-700">{error}</p> : null}
        {status ? <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[14px] leading-6 text-blue-800">{status}</p> : null}
        <Button type="submit" disabled={loading} className="w-full rounded-xl">{loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{loading ? (isForgot ? "Sending…" : "Updating…") : isForgot ? "Send recovery link" : "Update password"}</Button>
      </form>
    </div>
  );
}
