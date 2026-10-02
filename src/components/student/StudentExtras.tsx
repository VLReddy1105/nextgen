"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useWorkspace } from "./WorkspaceProvider";
import { workspaceApi } from "@/lib/api/workspace";
import { Action, Empty } from "./StudentModules";

export function StudentNotifications() {
  const { data, mutate } = useWorkspace();
  const [error, setError] = useState("");
  const mark = (id: string) =>
    void mutate(() => workspaceApi.read(id)).catch((e) => setError(e.message));
  if (!data) return null;
  return (
    <>
      <h1 className="sw-title">Your updates</h1>
      {error ? <p role="alert">{error}</p> : null}
      <p className="sw-muted mt-3">
        The moments that move your journey forward.
      </p>
      <div className="my-5">
        <Action secondary run={() => workspaceApi.readAll()}>
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
                <Action secondary run={() => workspaceApi.read(n.id)}>
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
export function StudentUniversity() {
  const { data } = useWorkspace();
  const [orgs, setOrgs] = useState<
      { id: string; name: string; verified: boolean }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ organizations: { id: string; name: string; verified: boolean }[] }>(
      "/students/me/universities",
    )
      .then((r) => setOrgs(r.organizations))
      .catch((e) => setError(e.message));
  }, []);
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
              {orgs.find((o) => o.id === m.university_id)?.verified
                ? "Verified university"
                : "Active membership"}
            </span>
            <h2 className="sw-section mt-5">
              {orgs.find((o) => o.id === m.university_id)?.name || "University"}
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
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ in_app_notifications: boolean }>("/settings")
      .then((r) => {
        setEnabled(r.in_app_notifications);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
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
        <h2 className="sw-section">Email & university verification</h2>
        <p className="sw-muted mt-3">
          Email verified ✓ ·{" "}
          {data?.profile.memberships.length
            ? "University connected"
            : "Using GenZnect independently"}
        </p>
        <Link
          href="/dashboard/my-university"
          className="mt-4 inline-block text-blue-700"
        >
          Manage university connection →
        </Link>
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
              <Action
                run={() =>
                  api("/settings", "PUT", {
                    in_app_notifications: enabled,
                    profile_visibility: "private",
                  })
                }
              >
                Save preferences
              </Action>
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
          Your resume is private. LinkedIn/GitHub links are editable in your
          profile; automatic imports and external account connections are not
          enabled.
        </p>
      </section>
    </>
  );
}
export function StudentHelp() {
  const [category, setCategory] = useState("problem"),
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
          [
            "How do I verify my university?",
            "Add your education to your profile, then ask your university to enroll your verified account or send an invitation.",
          ],
          [
            "Where can I track applications?",
            "Open Applications to see your status and timeline. Updates also appear in Notifications.",
          ],
          [
            "Can I use GenZnect independently?",
            "Yes. University verification is only required for restricted campus content.",
          ],
          [
            "How are recommendations chosen?",
            "Your skills, interests and preferences are matched using deterministic rules. Update My Profile to refresh them.",
          ],
        ].map(([q, a]) => (
          <details key={q} className="mt-4 border-b border-slate-100 pb-4">
            <summary className="font-medium">{q}</summary>
            <p className="sw-muted mt-3">{a}</p>
          </details>
        ))}
      </section>
      <section className="sw-card mt-4">
        <h2 className="sw-section">Community Guidelines</h2>
        <p className="sw-muted mt-3">
          Communicate professionally. Do not harass others, misrepresent
          opportunities, share confidential information without permission, or
          publish work you do not have the rights to use. Report harmful
          behavior and suspicious opportunities below.
        </p>
      </section>
      <section className="sw-card mt-4">
        <h2 className="sw-section">Report a problem / Contact support</h2>
        <label className="sw-label mt-4 block">
          Category
          <select
            className="sw-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="problem">Report a problem</option>
            <option value="opportunity">Report an opportunity</option>
            <option value="support">Contact support</option>
          </select>
        </label>
        <label className="sw-label mt-4 block">
          Subject
          <input
            className="sw-input"
            value={subject}
            maxLength={160}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="sw-label mt-4 block">
          Details
          <textarea
            className="sw-input"
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <div className="mt-4">
          <Action
            run={async () => {
              if (subject.trim().length < 2 || message.trim().length < 10)
                throw new Error(
                  "Enter a subject and at least ten characters of detail.",
                );
              const r = await api<{ id: string }>("/support/reports", "POST", {
                category,
                subject,
                message,
              });
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
      </section>
    </>
  );
}
