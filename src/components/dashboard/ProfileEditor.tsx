"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PrimaryRole } from "@/types";

export function ProfileEditor({ role, name: initialName, headline: initialHeadline, fieldOfStudy: initialField, degree: initialDegree, skills: initialSkills, interests: initialInterests, expertise: initialExpertise, portfolioUrl: initialPortfolio, linkedinUrl: initialLinkedin, githubUrl: initialGithub, organizationName: initialOrganization, website: initialWebsite }: { role: PrimaryRole; name: string; headline: string; fieldOfStudy: string; degree: string; skills: string; interests: string; expertise: string; portfolioUrl: string; linkedinUrl: string; githubUrl: string; organizationName: string; website: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [fieldOfStudy, setFieldOfStudy] = useState(initialField);
  const [degree, setDegree] = useState(initialDegree);
  const [skills, setSkills] = useState(initialSkills);
  const [interests, setInterests] = useState(initialInterests);
  const [expertise, setExpertise] = useState(initialExpertise);
  const [portfolioUrl, setPortfolioUrl] = useState(initialPortfolio);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedin);
  const [githubUrl, setGithubUrl] = useState(initialGithub);
  const [organizationName, setOrganizationName] = useState(initialOrganization);
  const [website, setWebsite] = useState(initialWebsite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, headline, fieldOfStudy, degree, skills, interests, expertise, portfolioUrl, linkedinUrl, githubUrl, organizationName, website }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not save profile."); return; }
      setSaved(true); router.refresh();
    } catch { setError("Could not save profile."); }
    finally { setBusy(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
  return <div className="mx-auto max-w-3xl"><p className="text-sm font-semibold capitalize text-blue-700">{role} account</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your profile</h1><p className="mt-2 text-slate-600">Keep your GenZnect identity current.</p><form onSubmit={submit} className="mt-7 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><label className="text-sm font-semibold text-slate-800">Full name<input required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={field} /></label>{role === "university" || role === "company" ? <><label className="text-sm font-semibold text-slate-800">Organization name<input required minLength={2} maxLength={160} value={organizationName} onChange={e => setOrganizationName(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Website<input type="url" value={website} onChange={e => setWebsite(e.target.value)} className={field} /></label></> : <label className="text-sm font-semibold text-slate-800">Headline<input maxLength={240} value={headline} onChange={e => setHeadline(e.target.value)} className={field} /></label>}
    {role === "student" ? <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-800">Field of study<input maxLength={160} value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Degree<input maxLength={120} value={degree} onChange={e => setDegree(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Skills <span className="font-normal text-slate-500">(comma separated)</span><input value={skills} onChange={e => setSkills(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Interests <span className="font-normal text-slate-500">(comma separated)</span><input value={interests} onChange={e => setInterests(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">Portfolio URL<input type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">LinkedIn URL<input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className={field} /></label><label className="text-sm font-semibold text-slate-800">GitHub URL<input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} className={field} /></label></div> : null}
    {role === "mentor" ? <label className="text-sm font-semibold text-slate-800">Expertise <span className="font-normal text-slate-500">(comma separated)</span><input value={expertise} onChange={e => setExpertise(e.target.value)} className={field} /></label> : null}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}{saved ? <p role="status" className="rounded-xl bg-blue-50 p-3 text-blue-700">Profile saved.</p> : null}<button disabled={busy} className="min-h-11 w-fit rounded-full bg-blue-600 px-6 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save profile"}</button></form></div>;
}
