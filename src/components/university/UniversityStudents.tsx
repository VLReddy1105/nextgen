"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type Student = { student_user_id: string; full_name: string | null; email: string; program: string | null; department: string | null; student_identifier: string | null; status: "active" | "revoked" | "graduated"; joined_at: string };
type Invitation = { id: string; email: string; student_name: string | null; program: string | null; status: "pending" | "accepted" | "cancelled"; expires_at: string };

export function UniversityStudents({ universityName, students, invitations }: { universityName: string; students: Student[]; invitations: Invitation[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [program, setProgram] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const active = students.filter(student => student.status === "active").length;
  const filtered = useMemo(() => students.filter(student => `${student.full_name ?? ""} ${student.email} ${student.program ?? ""}`.toLowerCase().includes(search.toLowerCase())), [students, search]);
  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setInvitationLink("");
    try {
      const response = await fetch("/api/university/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, identifier, program, department }) });
      const result = await response.json() as { status?: string; invitationPath?: string; error?: string };
      if (!response.ok) { setError(result.error ?? "Could not add student."); return; }
      if (result.status === "not_student") setError("This account cannot currently be enrolled as a Student.");
      else if (result.status === "already_enrolled") setMessage("This Student is already connected to your University.");
      else if (result.status === "enrolled") { setMessage("Student connected to your University."); setOpen(false); router.refresh(); }
      else if (result.status === "invited") { setMessage("Invitation created. Share this private link with the student."); setInvitationLink(result.invitationPath ? `${window.location.origin}${result.invitationPath}` : ""); router.refresh(); }
    } catch { setError("Could not add student. Please try again."); }
    finally { setBusy(false); }
  }

  async function remove(payload: { studentUserId?: string; invitationId?: string }) {
    const wording = payload.studentUserId ? "Revoke this university membership? The student's GenZnect account stays active." : "Cancel this invitation?";
    if (!window.confirm(wording)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/university/students", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not update relationship."); return; }
      setMessage(payload.studentUserId ? "University membership revoked." : "Invitation cancelled."); router.refresh();
    } catch { setError("Could not update relationship."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">{universityName}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Students</h1><p className="mt-2 text-slate-600">Manage students connected to your university.</p></div><button onClick={() => setOpen(value => !value)} className="min-h-11 rounded-full bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 focus-visible:ring-4 focus-visible:ring-blue-600/20">{open ? "Close form" : "Add Student"}</button></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">{[["Total students", students.length], ["Active", active], ["Pending invitations", invitations.length]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p></div>)}</div>
    {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{message}</p> : null}
    {invitationLink ? <div className="mt-3 rounded-xl border border-blue-200 bg-white p-4"><p className="text-sm font-semibold text-slate-900">Private invitation link</p><p className="mt-1 text-sm text-slate-600">Copy and send it to the student. Email delivery has not been configured.</p><input readOnly aria-label="Invitation link" value={invitationLink} onFocus={e => e.target.select()} className={`${field} text-sm`} /></div> : null}
    {open ? <form onSubmit={add} className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7"><div className="sm:col-span-2"><h2 className="text-xl font-semibold text-slate-950">Add Student</h2><p className="mt-1 text-sm text-slate-600">Existing students are connected immediately. For new students, you will get a private link to share.</p></div><label className="text-sm font-semibold text-slate-800">Student email *<input type="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Student name <span className="font-normal text-slate-500">(optional)</span><input maxLength={160} value={name} onChange={e => setName(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">University Student ID<input maxLength={160} value={identifier} onChange={e => setIdentifier(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Program<input maxLength={160} value={program} onChange={e => setProgram(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Department<input maxLength={160} value={department} onChange={e => setDepartment(e.target.value)} className={field} /></label><div className="flex items-end"><button disabled={busy} className="min-h-12 rounded-full bg-slate-950 px-6 font-semibold text-white disabled:opacity-60">{busy ? "Checking…" : "Add Student"}</button></div></form> : null}
    <section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-950">Enrolled students</h2><label className="text-sm text-slate-600">Search students<input type="search" value={search} onChange={e => setSearch(e.target.value)} className="ml-3 min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 focus:border-blue-600" /></label></div>
      {students.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8"><p className="font-semibold text-slate-900">No students enrolled yet.</p><p className="mt-2 text-sm text-slate-600">Add your first Student to begin building your university&apos;s GenZnect network.</p></div> : filtered.length === 0 ? <p className="mt-4 text-sm text-slate-600">No students match your search.</p> : <div className="mt-4 grid gap-3">{filtered.map(student => <article key={student.student_user_id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div className="min-w-0"><h3 className="font-semibold text-slate-950">{student.full_name || student.email}</h3><p className="break-all text-sm text-slate-600">{student.email}</p><p className="mt-1 text-sm text-slate-500">{student.program || "Program not specified"}{student.department ? ` · ${student.department}` : ""} · Joined {new Date(student.joined_at).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${student.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{student.status}</span>{student.status === "active" ? <button disabled={busy} onClick={() => remove({ studentUserId: student.student_user_id })} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Revoke</button> : null}</div></article>)}</div>}</section>
    <section className="mt-8"><h2 className="text-xl font-semibold text-slate-950">Pending invitations</h2>{invitations.length === 0 ? <p className="mt-3 text-sm text-slate-600">No invitations pending.</p> : <div className="mt-4 grid gap-3">{invitations.map(invitation => <article key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div><p className="font-semibold text-slate-950">{invitation.student_name || invitation.email}</p><p className="text-sm text-slate-600">{invitation.email} · Expires {new Date(invitation.expires_at).toLocaleDateString()}</p></div><button disabled={busy} onClick={() => remove({ invitationId: invitation.id })} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Cancel</button></article>)}</div>}</section>
  </div>;
}
