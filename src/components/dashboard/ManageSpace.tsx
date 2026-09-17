"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Member = { userId: string; name: string; role: string };

export function ManageSpace({ kind, id, name: initialName, description: initialDescription, members }: { kind: "communities" | "projects"; id: string; name: string; description: string; members: Member[] }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const roles = kind === "communities" ? ["member", "moderator", "captain"] : ["member", "team_lead", "mentor", "project_head"];
  const endpoint = `/api/spaces/${kind}/${id}`;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not save changes."); return; }
      setMessage("Changes saved."); router.refresh();
    } catch { setError("Could not save changes."); }
    finally { setBusy(false); }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) { setError(result.error ?? "Could not add member."); return; }
      if (result.status === "not_found") { setError("No confirmed GenZnect account was found for this email."); return; }
      setMessage("Member assigned."); setEmail(""); router.refresh();
    } catch { setError("Could not add member."); }
    finally { setBusy(false); }
  }

  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
  return <div className="mx-auto max-w-4xl"><Link href={`/dashboard/${kind}`} className="text-sm font-semibold text-blue-700">← Back to {kind}</Link><p className="mt-6 text-sm font-semibold text-blue-700">{kind === "communities" ? "Community Captain" : "Project Head"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Manage {initialName}</h1><p className="mt-2 text-slate-600">Permissions here apply only to this {kind === "communities" ? "community" : "project"}.</p>
    {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}{message ? <p role="status" className="mt-5 rounded-xl bg-blue-50 p-4 text-blue-800">{message}</p> : null}
    <form onSubmit={save} className="mt-7 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Details</h2><label className="text-sm font-semibold text-slate-800">Name<input required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Description<textarea maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} className={field} /></label><button disabled={busy} className="min-h-11 w-fit rounded-full bg-slate-950 px-5 font-semibold text-white disabled:opacity-60">Save details</button></form>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold text-slate-950">Members</h2><div className="mt-4 grid gap-2">{members.map(member => <div key={member.userId} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3"><span className="font-medium text-slate-900">{member.name}</span><span className="text-sm capitalize text-slate-600">{member.role.replaceAll("_", " ")}</span></div>)}</div><form onSubmit={addMember} className="mt-6 grid gap-4 sm:grid-cols-[1fr_180px_auto]"><label className="text-sm font-semibold text-slate-800">Account email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Role<select value={role} onChange={e => setRole(e.target.value)} className={field}>{roles.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><button disabled={busy} className="min-h-11 self-end rounded-full bg-blue-600 px-5 font-semibold text-white disabled:opacity-60">Assign member</button></form></section>
  </div>;
}
