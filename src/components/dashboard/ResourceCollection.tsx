"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Space = { id: string; name: string; description: string | null; role: string };

export function ResourceCollection({ kind, spaces }: { kind: "communities" | "projects"; spaces: Space[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const singular = kind === "communities" ? "community" : "project";
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/spaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: singular, name, description }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not create space."); return; }
      setOpen(false); setName(""); setDescription(""); router.refresh();
    } catch { setError("Could not create space."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">Your network</p><h1 className="mt-2 text-3xl font-semibold capitalize tracking-tight text-slate-950">{kind}</h1><p className="mt-2 text-slate-600">Your {kind} and the responsibilities you hold within them.</p></div><button onClick={() => setOpen(value => !value)} className="min-h-11 rounded-full bg-blue-600 px-5 font-semibold text-white">Create {singular}</button></div>
    {open ? <form onSubmit={create} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">New {singular}</h2><label className="text-sm font-semibold text-slate-800">Name<input required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="text-sm font-semibold text-slate-800">Description<textarea maxLength={2000} rows={3} value={description} onChange={e => setDescription(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<button disabled={busy} className="min-h-11 w-fit rounded-full bg-slate-950 px-5 font-semibold text-white disabled:opacity-60">{busy ? "Creating…" : "Create"}</button></form> : null}
    {spaces.length === 0 ? <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-8"><h2 className="font-semibold text-slate-950">No {kind} yet.</h2><p className="mt-2 text-slate-600">Create a {singular} to start collaborating.</p></div> : <div className="mt-7 grid gap-4 sm:grid-cols-2">{spaces.map(space => <article key={space.id} className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{space.role.replaceAll("_", " ")}</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{space.name}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{space.description || "No description yet."}</p>{["captain", "project_head"].includes(space.role) ? <Link href={`/dashboard/${kind}/${space.id}/manage`} className="mt-5 inline-flex min-h-10 items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">Manage</Link> : null}</article>)}</div>}
  </div>;
}
