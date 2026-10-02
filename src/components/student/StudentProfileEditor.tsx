"use client";
import Link from "next/link";
import { fieldCatalog } from "@/lib/forms/catalogs";
import { StructuredEntries, type Entry } from "./StructuredEntries";
type Value = string | string[] | number | null | boolean | Entry[];

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { TagSelect } from "./TagSelect";
import { workspaceApi } from "@/lib/api/workspace";
import type { StudentProfile } from "@/lib/api/types";

const steps = [
  { id: "about", label: "About", fields: ["full_name", "headline", "bio"] },
  {
    id: "education",
    label: "Education",
    fields: [
      "institution",
      "degree_level",
      "field_of_study",
      "study_status",
      "current_year",
      "start_year",
      "graduation_year",
    ],
  },
  {
    id: "skills",
    label: "Skills & interests",
    fields: [
      "skills",
      "soft_skills",
      "interests",
      "project_interests",
      "community_interests",
      "career_interests",
    ],
  },
  {
    id: "career",
    label: "Career preferences",
    fields: [
      "preferred_roles",
      "preferred_industries",
      "preferred_locations",
      "work_mode",
      "availability",
    ],
  },
  {
    id: "projects",
    label: "Experience",
    fields: ["personal_projects", "experience", "certifications", "languages"],
  },
  {
    id: "resume",
    label: "Links & CV",
    fields: ["github_url", "linkedin_url", "portfolio_url"],
  },
  { id: "review", label: "Review", fields: [] },
];
const labels: Record<string, string> = {
  full_name: "Full name",
  headline: "Professional headline",
  bio: "About you",
  institution: "University / institution (self-declared)",
  degree_level: "Degree",
  field_of_study: "Specialization / branch",
  study_status: "Study status",
  current_year: "Current study year",
  start_year: "Start year",
  graduation_year: "Graduation year",
  skills: "Technical skills",
  soft_skills: "Soft skills",
  interests: "Technical interests",
  project_interests: "Project interests",
  community_interests: "Community interests",
  career_interests: "Career interests",
  preferred_roles: "Preferred roles",
  preferred_industries: "Preferred industries",
  preferred_locations: "Preferred locations",
  work_mode: "Work mode",
  availability: "Availability",
  personal_projects: "Projects / portfolio experience",
  experience: "Experience",
  certifications: "Certifications",
  languages: "Languages",
  github_url: "GitHub",
  linkedin_url: "LinkedIn",
  portfolio_url: "Portfolio",
};
const arrays = [
  "skills",
  "soft_skills",
  "interests",
  "project_interests",
  "community_interests",
  "career_interests",
  "preferred_roles",
  "preferred_industries",
  "preferred_locations",
  "languages",
];
const long = ["bio", "personal_projects", "experience", "certifications"];
const numeric = ["current_year", "start_year", "graduation_year"];
const choices: Record<string, string[]> = {
  start_year: Array.from({ length: 151 }, (_, i) => String(1950 + i)).reverse(),
  graduation_year: Array.from({ length: 151 }, (_, i) =>
    String(1950 + i),
  ).reverse(),
  current_year: Array.from({ length: 12 }, (_, i) => String(i + 1)),
  field_of_study: [
    "Computer Science",
    "Information Technology",
    "Engineering",
    "Business",
    "Design",
    "Arts",
    "Science",
    "Other",
  ],
  degree_level: ["Bachelor’s", "Master’s", "Doctorate", "Diploma", "Other"],
  work_mode: ["remote", "hybrid", "on-site"],
  availability: ["immediately", "15 days", "30 days", "60 days", "not looking"],
  study_status: [
    "First Year",
    "Second Year",
    "Third Year",
    "Fourth Year",
    "Final Year",
    "Graduated",
  ],
};
function Editor({ profile }: { profile: StudentProfile }) {
  const search = useSearchParams();
  const [step, setStep] = useState(
    Math.max(
      0,
      steps.findIndex((s) => s.id === search.get("section")),
    ),
  );
  const [values, setValues] = useState<Record<string, Value>>(() =>
    Object.fromEntries(
      steps
        .flatMap((s) => s.fields)
        .map((key) => [
          key,
          (profile as unknown as Record<string, Value>)[key] ??
            (arrays.includes(key) ? [] : numeric.includes(key) ? null : ""),
        ]),
    ),
  );
  const [entries, setEntries] = useState<{
    experience_entries: Entry[];
    certification_entries: Entry[];
    portfolio_entries: Entry[];
    no_experience: boolean;
    no_certifications: boolean;
  }>({
    experience_entries: profile.experience_entries || [],
    certification_entries: profile.certification_entries || [],
    portfolio_entries: profile.portfolio_entries || [],
    no_experience: profile.no_experience || false,
    no_certifications: profile.no_certifications || false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function validate(index: number) {
    const required =
      index === 0
        ? ["full_name", "headline"]
        : index === 1
          ? [
              "degree_level",
              "field_of_study",
              "study_status",
              "graduation_year",
              ...(values.study_status === "Graduated" ? [] : ["current_year"]),
            ]
          : index === 2
            ? ["skills"]
            : index === 3
              ? ["preferred_roles", "availability"]
              : [];
    const errors: Record<string, string> = {};
    for (const k of required)
      if (
        !values[k] ||
        (Array.isArray(values[k]) && !(values[k] as string[]).length)
      )
        errors[k] = `${labels[k]} is required.`;
    if (
      index === 1 &&
      values.start_year &&
      values.graduation_year &&
      Number(values.start_year) > Number(values.graduation_year)
    )
      errors.graduation_year = "Graduation must follow your start year.";
    setFieldErrors(errors);
    setError(
      Object.keys(errors).length
        ? "Please complete the required fields before continuing."
        : "",
    );
    return !Object.keys(errors).length;
  }
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [finalSaved, setFinalSaved] = useState(false),
    [busy, setBusy] = useState(false);
  const { mutate } = useWorkspace();
  const set = (key: string, value: Value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
    setFinalSaved(false);
  };
  async function save(final = false) {
    setBusy(true);
    setError("");
    try {
      await mutate(() =>
        workspaceApi.saveProfile({
          ...values,
          ...entries,
          current_year:
            values.study_status === "Graduated" ? null : values.current_year,
        }),
      );
      setSaved(true);
      setFinalSaved(final);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[.18em] text-blue-600">
            YOUR PROFESSIONAL STORY
          </p>
          <h1 className="sw-title">My Profile</h1>
          <p className="sw-muted mt-3">
            One profile. Better opportunities, communities and connections.
          </p>
        </div>
        <span className="sw-chip">{profile.completion.percent}% complete</span>
      </div>
      <div className="my-6 flex flex-wrap gap-2" aria-label="Profile sections">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              if (i < step || validate(step)) setStep(i);
            }}
            aria-pressed={step === i}
            className={`rounded-full px-3 py-2 text-xs font-semibold ${step === i ? "bg-slate-900 text-white" : "bg-white text-slate-500"}`}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </div>
      <form
        className="sw-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < steps.length - 1) {
            if (validate(step)) setStep(step + 1);
          } else {
            const invalid = steps
              .slice(0, -1)
              .findIndex((_, i) => !validate(i));
            if (invalid >= 0) setStep(invalid);
            else void save(true);
          }
        }}
      >
        <h2 className="sw-section">{steps[step].label}</h2>
        {step === 1 ? (
          <p className="sw-muted mt-3">
            Your education belongs here even if you’re using GenZnect
            independently. Official university verification comes from a
            university invitation or enrollment.
          </p>
        ) : null}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {steps[step].fields
            .filter(
              (k) =>
                !(
                  values.study_status === "Graduated" && k === "current_year"
                ) &&
                !["experience", "certifications", "personal_projects"].includes(
                  k,
                ),
            )
            .map((key) => (
              <div
                key={key}
                className={
                  arrays.includes(key) || long.includes(key)
                    ? "sm:col-span-2"
                    : ""
                }
              >
                {arrays.includes(key) ? (
                  <TagSelect
                    label={labels[key]}
                    value={values[key] as string[]}
                    onChange={(v) => set(key, v)}
                    catalog={fieldCatalog[key]}
                    strict
                  />
                ) : (
                  <label className="sw-label">
                    {labels[key]}
                    {long.includes(key) ? (
                      <textarea
                        className="sw-input"
                        rows={4}
                        maxLength={
                          key === "bio"
                            ? 4000
                            : key === "certifications"
                              ? 3000
                              : 5000
                        }
                        value={String(values[key] ?? "")}
                        onChange={(e) => set(key, e.target.value)}
                      />
                    ) : choices[key] ? (
                      <select
                        className="sw-input"
                        value={String(values[key] ?? "")}
                        onChange={(e) =>
                          set(
                            key,
                            numeric.includes(key)
                              ? e.target.value
                                ? Number(e.target.value)
                                : null
                              : e.target.value,
                          )
                        }
                      >
                        <option value="">Select when ready</option>
                        {values[key] &&
                        !choices[key].includes(String(values[key])) ? (
                          <option value={String(values[key])}>
                            {String(values[key])}
                          </option>
                        ) : null}
                        {choices[key].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="sw-input"
                        required={key === "full_name"}
                        minLength={key === "full_name" ? 2 : undefined}
                        maxLength={
                          key.endsWith("url")
                            ? 2048
                            : key === "headline"
                              ? 240
                              : 160
                        }
                        type={
                          numeric.includes(key)
                            ? "number"
                            : key.endsWith("url")
                              ? "url"
                              : "text"
                        }
                        min={key === "current_year" ? 1 : 1950}
                        max={key === "current_year" ? 12 : 2100}
                        value={(values[key] as string | number) ?? ""}
                        onChange={(e) =>
                          set(
                            key,
                            numeric.includes(key)
                              ? e.target.value
                                ? Number(e.target.value)
                                : null
                              : e.target.value,
                          )
                        }
                      />
                    )}
                  </label>
                )}
                {fieldErrors[key] && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {fieldErrors[key]}
                  </p>
                )}
              </div>
            ))}
        </div>
        {step === 4 ? (
          <div className="mt-5">
            <label className="sw-label">
              <input
                type="checkbox"
                checked={entries.no_experience}
                onChange={(e) =>
                  setEntries({ ...entries, no_experience: e.target.checked })
                }
              />{" "}
              I have no professional experience yet
            </label>
            {!entries.no_experience && (
              <StructuredEntries
                kind="experience"
                value={entries.experience_entries}
                onChange={(v) =>
                  setEntries({ ...entries, experience_entries: v })
                }
              />
            )}
            <label className="sw-label mt-6">
              <input
                type="checkbox"
                checked={entries.no_certifications}
                onChange={(e) =>
                  setEntries({
                    ...entries,
                    no_certifications: e.target.checked,
                  })
                }
              />{" "}
              I have no certifications yet
            </label>
            {!entries.no_certifications && (
              <StructuredEntries
                kind="certifications"
                value={entries.certification_entries}
                onChange={(v) =>
                  setEntries({ ...entries, certification_entries: v })
                }
              />
            )}
            <h3 className="font-semibold mt-6">Portfolio projects</h3>
            <StructuredEntries
              kind="projects"
              value={entries.portfolio_entries}
              onChange={(v) => setEntries({ ...entries, portfolio_entries: v })}
            />
            <h3 className="font-semibold mt-6">Your connected projects</h3>
            <ConnectedProjects />
          </div>
        ) : null}
        {step === 5 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-5">
            <h3 className="font-semibold">CV / Resume · optional</h3>
            <p className="sw-muted mt-2">
              Your CV is private. Upload a PDF to use with your professional
              profile.
            </p>
            <ResumeUpload />
          </div>
        ) : null}
        {step === 6 ? (
          <div className="mt-5 space-y-4">
            {steps.slice(0, -1).map((section, i) => (
              <section
                key={section.id}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="flex justify-between">
                  <h3 className="font-semibold">{section.label}</h3>
                  <button
                    type="button"
                    className="text-sm font-semibold text-blue-700"
                    onClick={() => setStep(i)}
                  >
                    Edit {section.label}
                  </button>
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {section.fields
                    .filter(
                      (k) =>
                        values[k] &&
                        (!Array.isArray(values[k]) ||
                          (values[k] as string[]).length),
                    )
                    .map((k) => (
                      <div key={k}>
                        <dt className="text-xs text-slate-500">{labels[k]}</dt>
                        <dd className="mt-1 break-words text-sm">
                          {Array.isArray(values[k])
                            ? (values[k] as string[]).map((v) => (
                                <span className="sw-chip mr-1 mb-1" key={v}>
                                  {v}
                                </span>
                              ))
                            : String(values[k])}
                        </dd>
                      </div>
                    ))}
                </dl>
                {section.id === "projects" && (
                  <>
                    <p className="sw-muted mt-4">
                      {entries.no_experience
                        ? "Fresher — no professional experience yet"
                        : `${entries.experience_entries.length} experience entries`}{" "}
                      ·{" "}
                      {entries.no_certifications
                        ? "No certifications yet"
                        : `${entries.certification_entries.length} certifications`}
                    </p>
                    {[
                      ...entries.experience_entries,
                      ...entries.certification_entries,
                      ...entries.portfolio_entries,
                    ].map((entry, n) => (
                      <dl
                        className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3"
                        key={n}
                      >
                        {Object.entries(entry)
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k}>
                              <dt className="sw-muted capitalize">
                                {k.replaceAll("_", " ")}
                              </dt>
                              <dd className="text-sm break-words">{v}</dd>
                            </div>
                          ))}
                      </dl>
                    ))}
                  </>
                )}
              </section>
            ))}
          </div>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="mt-5 text-emerald-700">
            Profile saved. Your recommendations are up to date.
          </p>
        ) : null}
        {!(finalSaved && step === 6) && (
          <div className="mt-7 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className="sw-button sw-secondary"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="sw-button sw-secondary"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy ? "Saving…" : "Save progress"}
              </button>
              <button className="sw-button" disabled={busy}>
                {step === 6 ? "Save profile" : "Continue"}
              </button>
            </div>
          </div>
        )}
      </form>
      {finalSaved && step === 6 ? (
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/overview" className="sw-button mt-5">
            Continue to workspace →
          </Link>
          <button
            className="sw-button sw-secondary mt-5"
            onClick={() => {
              setSaved(false);
              setFinalSaved(false);
              setStep(0);
            }}
          >
            Edit profile
          </button>
        </div>
      ) : null}
    </>
  );
}
function ConnectedProjects() {
  const { data } = useWorkspace();
  const projects = data?.projects.filter((p) => p.joined) ?? [];
  return projects.length ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {projects.map((p) => (
        <Link
          key={p.id}
          className="sw-chip"
          href={`/dashboard/projects/${p.id}`}
        >
          {p.title} ·{" "}
          {p.visibility === "public" && p.show_on_profile
            ? "Shown in portfolio"
            : "Not shared in portfolio"}
        </Link>
      ))}
    </div>
  ) : (
    <p className="sw-muted mt-2">
      Projects you join on GenZnect will appear here.
    </p>
  );
}
function ResumeUpload() {
  const { data, refresh } = useWorkspace();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3">
      {data?.profile.resume_path ? (
        <button
          type="button"
          className="sw-button sw-secondary mb-4"
          onClick={async () => {
            try {
              const { downloadResume } = await import("@/lib/api/students");
              await downloadResume();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Download failed.");
            }
          }}
        >
          Download current resume
        </button>
      ) : null}
      <input
        aria-label="Upload PDF resume"
        type="file"
        accept="application/pdf"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setMessage("");
          try {
            const { uploadResume } = await import("@/lib/api/students");
            await uploadResume(file);
            await refresh();
            setMessage("Your private resume was uploaded.");
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Upload failed.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <p role="status" className="sw-muted mt-2">
        {busy
          ? "Uploading…"
          : message ||
            (data?.profile.resume_path
              ? "A private resume is saved."
              : "PDF only, up to 5 MB.")}
      </p>
    </div>
  );
}
export function StudentProfileEditor() {
  const { data } = useWorkspace();
  const search = useSearchParams();
  return data ? (
    <Editor key={search.get("section") || "about"} profile={data.profile} />
  ) : null;
}
