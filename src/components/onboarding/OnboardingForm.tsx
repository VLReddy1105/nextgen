"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PrimaryRole } from "@/types";

const options: { role: PrimaryRole; label: string; description: string }[] = [
  { role: "student", label: "Student", description: "Discover opportunities, projects, communities and mentors." },
  { role: "founder", label: "Founder", description: "Build, collaborate and connect with talent." },
  { role: "university", label: "University", description: "Manage students and connect with the ecosystem." },
  { role: "company", label: "Company", description: "Discover talent and build industry connections." },
  { role: "mentor", label: "Mentor", description: "Guide students, founders and project teams." },
];

export function OnboardingForm({ initialRole, initialName, initialOrganizationName, initialWebsite, next }: { initialRole: PrimaryRole | null; initialName: string; initialOrganizationName: string; initialWebsite: string; next: string }) {
  const router = useRouter();
  const [role, setRole] = useState<PrimaryRole>(initialRole ?? "student");
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState("");
  const [organizationName, setOrganizationName] = useState(initialOrganizationName);
  const [website, setWebsite] = useState(initialWebsite);
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [degree, setDegree] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [expertise, setExpertise] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name, headline, organizationName, website, fieldOfStudy, degree, skills, interests, expertise, portfolioUrl, linkedinUrl, githubUrl }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not save your profile."); return; }
      router.push(next); router.refresh();
    } catch { setError("Could not save your profile. Please try again."); }
    finally { setBusy(false); }
  }

  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
  return <form onSubmit={submit} className="space-y-7">
    <div><p className="text-sm font-semibold text-blue-700">Account setup</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Make GenZnect yours.</h1><p className="mt-2 text-slate-600">Set up your account to enter the right workspace.</p></div>
    <fieldset><legend className="text-base font-semibold text-slate-900">How are you joining?</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">
      {options.map((option) => <label key={option.role} className={`flex cursor-pointer gap-3 rounded-xl border p-4 focus-within:ring-4 focus-within:ring-blue-600/10 ${role === option.role ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}>
        <input type="radio" name="primary-role" value={option.role} checked={role === option.role} disabled={Boolean(initialRole)} onChange={() => setRole(option.role)} className="mt-1 accent-blue-600" />
        <span><span className="block font-semibold text-slate-950">{option.label}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{option.description}</span></span>
      </label>)}
    </div>{initialRole ? <p className="mt-2 text-sm text-slate-500">Your primary role was selected at signup.</p> : null}</fieldset>
    <label className="block text-sm font-semibold text-slate-800">Full name<input required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={field} /></label>
    {(role === "university" || role === "company") ? <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-slate-800">{role === "university" ? "University" : "Company"} name<input required minLength={2} maxLength={160} value={organizationName} onChange={e => setOrganizationName(e.target.value)} className={field} /></label>
      <label className="block text-sm font-semibold text-slate-800">Website <span className="font-normal text-slate-500">(optional)</span><input type="url" value={website} onChange={e => setWebsite(e.target.value)} className={field} placeholder="https://" /></label>
      {role === "university" ? <p className="text-sm leading-6 text-slate-600 sm:col-span-2">Student enrollment becomes available after GenZnect verifies your official university account.</p> : null}
    </div> : <label className="block text-sm font-semibold text-slate-800">Headline <span className="font-normal text-slate-500">(optional)</span><input maxLength={240} value={headline} onChange={e => setHeadline(e.target.value)} className={field} placeholder="What are you studying, building or sharing?" /></label>}
    {role === "student" ? <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-slate-800">Field of study<input maxLength={160} value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} className={field} /></label>
      <label className="block text-sm font-semibold text-slate-800">Degree<input maxLength={120} value={degree} onChange={e => setDegree(e.target.value)} className={field} /></label>
      <label className="block text-sm font-semibold text-slate-800">Skills <span className="font-normal text-slate-500">(comma separated)</span><input value={skills} onChange={e => setSkills(e.target.value)} className={field} placeholder="Research, Python, Design" /></label>
      <label className="block text-sm font-semibold text-slate-800">Interests <span className="font-normal text-slate-500">(comma separated)</span><input value={interests} onChange={e => setInterests(e.target.value)} className={field} placeholder="Climate, Startups" /></label>
      <label className="block text-sm font-semibold text-slate-800">Portfolio URL<input type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} className={field} placeholder="https://" /></label>
      <label className="block text-sm font-semibold text-slate-800">LinkedIn URL<input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className={field} placeholder="https://" /></label>
      <label className="block text-sm font-semibold text-slate-800">GitHub URL<input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} className={field} placeholder="https://" /></label>
    </div> : null}
    {role === "mentor" ? <label className="block text-sm font-semibold text-slate-800">Areas of expertise <span className="font-normal text-slate-500">(comma separated)</span><input value={expertise} onChange={e => setExpertise(e.target.value)} className={field} placeholder="Product, Engineering, Career growth" /></label> : null}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <button disabled={busy} className="min-h-12 rounded-full bg-blue-600 px-7 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Saving…" : "Enter GenZnect"}</button>
  </form>;
}
