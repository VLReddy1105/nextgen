"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useWorkspace } from "./WorkspaceProvider";
import { workspaceApi } from "@/lib/api/workspace";
import { Action, Empty } from "./StudentModules";
import { helpTopics, roleHelp } from "@/lib/workspace-help";

export function StudentNotifications() {
  const { data, mutate, loadNotifications } = useWorkspace();
  const [error, setError] = useState("");
  const needsDetails = data?.notification_details_loaded === false;
  useEffect(() => {
    if (needsDetails) void loadNotifications?.().catch((e) => setError(e.message));
  }, [needsDetails, loadNotifications]);
  const mark = (id: string) =>
    void mutate(() => workspaceApi.read(id), "notifications").catch((e) => setError(e.message));
  if (!data) return null;
  if (needsDetails) return <section><h1 className="sw-title">Your updates</h1>
    {error ? <p role="alert">{error} <button onClick={() => void loadNotifications?.().catch((e) => setError(e.message))}>Retry</button></p>
      : <p role="status" aria-busy="true">Loading notifications…</p>}</section>;
  return (
    <>
      <h1 className="sw-title">Your updates</h1>
      {error ? <p role="alert">{error}</p> : null}
      <p className="sw-muted mt-3">
        The moments that move your journey forward.
      </p>
      <div className="my-5">
        <Action secondary refreshScope="notifications" run={() => workspaceApi.readAll()}>
          Mark all read
        </Action>
      </div>
      {data.notifications.length ? (
        data.notifications.map((n) => (
          <article
            key={n.id}
            className={`sw-card mb-3 ${!n.read_at ? "!border-blue-200" : ""}`}
          >
            <div className="flex justify-between gap-3">
              <Link
                href={n.action_url}
                onClick={() => mark(n.id)}
                className="font-semibold hover:text-blue-600"
              >
                {n.title}
              </Link>
              {!n.read_at ? <span className="sw-chip">Unread</span> : null}
            </div>
            <p className="sw-muted mt-2">{n.message}</p>
            <p className="sw-muted mt-2">
              {new Date(n.created_at).toLocaleString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={n.action_url}
                onClick={() => mark(n.id)}
                className="sw-button sw-secondary"
              >
                Open update →
              </Link>
              {!n.read_at ? (
                <Action secondary refreshScope="notifications" run={() => workspaceApi.read(n.id)}>
                  Mark read
                </Action>
              ) : null}
            </div>
          </article>
        ))
      ) : (
        <Empty
          title="You’re all caught up"
          description="Application changes, invitations, conversations and events will reach you here."
        />
      )}
    </>
  );
}
export function StudentUniversity({ organizations }: { organizations?: { id: string; name: string; verified: boolean }[] } = {}) {
  const { data } = useWorkspace();
  const [orgs, setOrgs] = useState<
      { id: string; name: string; verified: boolean }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (organizations) return;
    const controller = new AbortController();
    api<{ organizations: { id: string; name: string; verified: boolean }[] }>(
      "/students/me/universities", "GET", undefined, { signal: controller.signal },
    )
      .then((r) => { if (!controller.signal.aborted) setOrgs(r.organizations); })
      .catch((e) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [organizations]);
  if (!data) return null;
  return (
    <>
      <p className="mb-2 text-[10px] font-bold tracking-widest text-blue-600">
        YOUR CAMPUS CONNECTION
      </p>
      <h1 className="sw-title">My University</h1>
      <p className="sw-muted mt-3">
        Your campus is part of your story. Your possibilities go beyond it.
      </p>
      {error ? (
        <p role="alert" className="sw-card mt-5">
          {error}
        </p>
      ) : data.profile.memberships.length ? (
        data.profile.memberships.map((m) => (
          <section className="sw-card mt-6" key={m.university_id}>
            <span className="sw-chip">
              {(organizations || orgs).find((o) => o.id === m.university_id)?.verified
                ? "Verified university"
                : "Active membership"}
            </span>
            <h2 className="sw-section mt-5">
              {(organizations || orgs).find((o) => o.id === m.university_id)?.name || "University"}
            </h2>
            <p className="sw-muted mt-3">
              {data.profile.degree_level} ·{" "}
              {m.program || data.profile.field_of_study} · {m.department}
            </p>
            <p className="sw-muted">
              {data.profile.start_year} – {data.profile.graduation_year}
            </p>
            <p className="sw-muted mt-3">
              Connected {new Date(m.joined_at).toLocaleDateString()}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/dashboard/events" className="sw-button sw-secondary">
                Campus events
              </Link>
              <Link
                href="/dashboard/opportunities"
                className="sw-button sw-secondary"
              >
                Opportunities
              </Link>
            </div>
          </section>
        ))
      ) : (
        <section className="sw-card mt-6">
          <span className="sw-chip">University not verified</span>
          <h2 className="sw-section mt-5">Your journey is yours to build.</h2>
          <p className="sw-muted mt-3">
            You have full access to general GenZnect opportunities, projects,
            communities and events. Connecting a university can also unlock
            campus opportunities and placement drives.
          </p>
          <Link
            href="/dashboard/profile?section=education"
            className="sw-button mt-5"
          >
            Add University →
          </Link>
          <p className="sw-muted mt-4">
            Add your education to your profile. For official verification, ask
            your university to enroll your account or send an invitation to your
            verified email.
          </p>
        </section>
      )}
    </>
  );
}
const domains = [
  {
    name: "AI / ML",
    skills: [
      "python",
      "tensorflow",
      "pytorch",
      "nlp",
      "genai",
      "machine learning",
    ],
    tools: [
      "Google Colab",
      "Kaggle",
      "Hugging Face Hub",
      "Papers with Code",
      "LeetCode",
      "W&B",
    ],
  },
  {
    name: "Java Full Stack",
    skills: ["java", "spring", "spring boot"],
    tools: ["Spring Initializr", "GitHub", "Postman", "LeetCode", "HackerRank"],
  },
  {
    name: "Data Science",
    skills: ["pandas", "data science", "power bi", "sql"],
    tools: [
      "Kaggle",
      "Google Colab",
      "Tableau Public",
      "SQL practice resources",
    ],
  },
  {
    name: "Web Development",
    skills: [
      "javascript",
      "typescript",
      "react",
      "next.js",
      "html",
      "css",
      "node",
    ],
    tools: ["GitHub", "CodePen", "Postman", "Vercel"],
  },
  {
    name: "Cybersecurity",
    skills: ["cybersecurity", "networking", "linux", "pen-testing"],
    tools: ["TryHackMe", "Hack The Box", "OWASP"],
  },
];
export function StudentAITools() {
  const { data } = useWorkspace();
  const scores = domains
    .map((d) => ({
      ...d,
      score: d.skills.filter((s) =>
        data?.profile.skills.some((t) => t.toLowerCase() === s),
      ).length,
    }))
    .sort((a, b) => b.score - a.score);
  const domain = scores[0]?.score ? scores[0] : null;
  return (
    <>
      <p className="mb-2 text-[10px] font-bold tracking-widest text-teal-600">
        BUILT AROUND YOU · PREVIEW
      </p>
      <h1 className="sw-title">AI Tools</h1>
      <p className="sw-muted mt-3">
        Your personal toolkit, matched to your profile.
      </p>
      <div className="my-7 rounded-2xl border border-teal-100 bg-teal-50 p-5 text-sm text-teal-900">
        Personalized AI Tools automation is launching soon.
      </div>
      <div className="grid gap-4">
        {[
          [
            "Resume Builder",
            "A future home for your professional story, built from your profile.",
          ],
          [
            "Job Search Tool",
            "A future way to explore roles around your skills and preferences.",
          ],
          [
            "Tools for You",
            "A preview of resources associated with your skill domain.",
          ],
        ].map(([name, description]) => (
          <section
            className="sw-card"
            id={
              name.startsWith("Resume")
                ? "resume"
                : name.startsWith("Job")
                  ? "jobs"
                  : "tools"
            }
            key={name}
          >
            <span className="sw-chip">Launching Soon</span>
            <h2 className="sw-section mt-4">{name}</h2>
            <p className="sw-muted mt-2">{description}</p>
          </section>
        ))}
      </div>
      <section className="sw-card mt-6">
        <h2 className="sw-section">
          {domain ? `Tools for ${domain.name}` : "Make this toolkit yours"}
        </h2>
        <p className="sw-muted mt-2">
          {domain
            ? "Preview based on your current skill tags. These tools are not connected to your account."
            : "Add skills to see a domain-based resource preview."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {domain?.tools.map((t) => (
            <span className="sw-chip" key={t}>
              {t}
            </span>
          ))}
        </div>
        <Link
          className="mt-5 inline-block text-xs font-semibold text-blue-700"
          href="/dashboard/profile?section=skills"
        >
          Update your skills →
        </Link>
      </section>
    </>
  );
}
export function StudentSettings() {
  const { data } = useWorkspace();
  const [enabled, setEnabled] = useState(true),
    [visibility, setVisibility] = useState("private"),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api<{ in_app_notifications: boolean; profile_visibility: string }>(
      "/settings", "GET", undefined, { signal: controller.signal },
    )
      .then((r) => {
        if (controller.signal.aborted) return;
        setEnabled(r.in_app_notifications);
        setVisibility(r.profile_visibility);
        setLoaded(true);
      })
      .catch((e) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  return (
    <>
      <h1 className="sw-title">Settings</h1>
      <p className="sw-muted mt-3">Your account. Your preferences.</p>
      <section id="account" className="sw-card mt-6">
        <h2 className="sw-section">Account & security</h2>
        <p className="sw-muted mt-3">{data?.profile.email}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="sw-button sw-secondary" href="/forgot-password">
            Reset password
          </Link>
          <form action="/auth/signout" method="post">
            <button className="sw-button sw-secondary">Logout</button>
          </form>
        </div>
      </section>
      <section id="verification" className="sw-card mt-4">
        <h2 className="sw-section">
          {data?.profile.primary_role === "student"
            ? "Email & university verification"
            : "Account verification"}
        </h2>
        <p className="sw-muted mt-3">
          {data?.profile.email_verified
            ? "Email verified ✓"
            : "Email not verified"}{" "}
          ·{" "}
          {data?.profile.primary_role !== "student"
            ? `${data?.profile.primary_role} account`
            : data?.profile.memberships.length
              ? "University connected"
              : "Using GenZnect independently"}
        </p>
        {data?.profile.primary_role === "student" && (
          <Link
            href="/dashboard/my-university"
            className="mt-4 inline-block text-blue-700"
          >
            Manage university connection →
          </Link>
        )}
      </section>
      <section className="sw-card mt-4">
        <h2 className="sw-section">Notifications</h2>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <>
            <label className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                disabled={!loaded}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Receive new in-app notifications
            </label>
            <div className="mt-4">
              {loaded && (
                <Action
                  refreshScope="none"
                  run={() =>
                    api("/settings", "PUT", {
                      in_app_notifications: enabled,
                      profile_visibility: visibility,
                    })
                  }
                >
                  Save preferences
                </Action>
              )}
            </div>
          </>
        )}
        <p className="sw-muted mt-3">
          Your applications and memberships continue to update. Email and push
          delivery are not enabled.
        </p>
      </section>
      <section className="sw-card mt-4">
        <h2 className="sw-section">Appearance & language</h2>
        <p className="sw-muted mt-3">
          This release uses the light workspace theme and English. Theme and
          language selection are coming later.
        </p>
      </section>
      <section className="sw-card mt-4">
        <h2 className="sw-section">Privacy & connected accounts</h2>
        <p className="sw-muted mt-3">
          {data?.profile.primary_role === "student"
            ? "Your resume is private. Edit supported links in your profile."
            : "Your profile and organization details can be edited from your role profile page."}{" "}
          Automatic imports and external account connections are not enabled.
        </p>
      </section>
    </>
  );
}
export function StudentHelp() {
  const { data } = useWorkspace();
  const role = data?.profile.primary_role || "student";
  const [category, setCategory] = useState("Login / Account"),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [received, setReceived] = useState("");
  return (
    <>
      <h1 className="sw-title">Help & Support</h1>
      <p className="sw-muted mt-3">A little clarity for your next step.</p>
      <section className="sw-card mt-6">
        <h2 className="sw-section">Help Center</h2>
        {[
          ...(roleHelp[role] || []),
          [
            "How do I protect my account?",
            "Use Settings to reset your password. Never share passwords, verification codes, access tokens or private invitation links in a support report.",
            "settings",
          ],
        ].map(([q, a, route]) => (
          <details key={q} className="mt-4 border-b border-slate-100 pb-4">
            <summary className="font-medium">{q}</summary>
            <p className="sw-muted mt-3">{a}</p>
            <Link
              href={`/dashboard/${route}`}
              className="mt-3 inline-block text-blue-700"
            >
              Open workspace page →
            </Link>
          </details>
        ))}
      </section>
      <section className="sw-card mt-4">
        <h2 className="sw-section">Community Guidelines</h2>
        <p className="sw-muted mt-3">
          Communicate professionally. Do not harass others, misrepresent
          opportunities, share confidential information without permission, or
          publish work you do not have the rights to use. Report harmful
          behavior and suspicious opportunities using the available reporting
          options.
        </p>
      </section>
      <section className="sw-card mt-4">
        <h2 className="sw-section">Report a problem / Contact support</h2>
        <p className="sw-muted mt-3">
          Do not share passwords, verification codes, tokens, or private
          invitation links.
        </p>
        {helpTopics[role] && (
          <>
            <label className="sw-label mt-4 block">
              Category
              <select
                className="sw-input"
                value={category}
                aria-label="Category"
                onChange={(e) => {
                  setCategory(e.target.value);
                  setReceived("");
                }}
              >
                {(helpTopics[role] || []).map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <label className="sw-label mt-4 block">
              Subject
              <input
                className="sw-input"
                value={subject}
                aria-label="Subject"
                maxLength={160}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setReceived("");
                }}
              />
            </label>
            <label className="sw-label mt-4 block">
              Details
              <textarea
                className="sw-input"
                value={message}
                aria-label="Details"
                maxLength={3900}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setReceived("");
                }}
              />
            </label>
            <div className="mt-4">
              <Action
                refreshScope="none"
                run={async () => {
                  if (subject.trim().length < 2 || message.trim().length < 10)
                    throw new Error(
                      "Enter a subject and at least ten characters of detail.",
                    );
                  const r = await api<{ id: string }>(
                    "/support/reports",
                    "POST",
                    {
                      category:
                        category === "Suspicious Opportunity"
                          ? "opportunity"
                          : ["Suggestion", "Other"].includes(category)
                            ? "support"
                            : "problem",
                      subject: subject.trim(),
                      message: `[${category}] ${message.trim()}`,
                    },
                  );
                  setReceived(r.id);
                  setMessage("");
                }}
              >
                Submit report
              </Action>
            </div>
            {received ? (
              <p role="status" className="mt-4 text-sm text-emerald-700">
                Report saved. Reference: {received}. The project maintainer can
                review it; no response time is guaranteed.
              </p>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
