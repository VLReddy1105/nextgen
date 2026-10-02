"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { Action } from "@/components/student/StudentModules";
import { StudentUniversity } from "@/components/student/StudentExtras";
import { Editor } from "./Editor";
type CampusData = {
  organizations: { id: string; name: string }[];
  domains: {
    id: string;
    domain: string;
    approved_at: string | null;
    auto_enrollment: boolean;
  }[];
  matching_domains: {
    id: string;
    university_id: string;
    auto_enrollment: boolean;
  }[];
  requests: {
    id: string;
    status: string;
    student_id: string;
    full_name?: string;
  }[];
  invitations: {
    id: string;
    name?: string;
    email?: string;
    status?: string;
    program?: string;
    expires_at: string;
  }[];
  announcements: { id: string; title: string; body: string; url: string }[];
  progress: {
    student_id: string;
    full_name: string;
    program: string;
    year: number;
    study_status: string;
    completion: number;
    projects: number;
    events: number;
    applications: number;
  }[];
};
export function Campus({
  mode = "students",
}: {
  mode?: "students" | "student" | "announcements";
}) {
  const { data } = useWorkspace();
  const [campus, setCampus] = useState<CampusData | null>(null),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [inviteLink, setInviteLink] = useState("");
  const load = () =>
    api<CampusData>("/campus")
      .then(setCampus)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [data]);
  if (error)
    return (
      <section className="sw-card" role="alert">
        {error}
        <button
          className="sw-button mt-4"
          onClick={() => {
            setError("");
            void load();
          }}
        >
          Retry
        </button>
      </section>
    );
  if (!campus || !data) return <p aria-busy="true">Loading campus…</p>;
  const org = data.organizations?.[0];
  if (mode === "student")
    return (
      <>
        <StudentUniversity />
        {campus.matching_domains.filter(d=>!data.profile.memberships.some(m=>m.university_id===d.university_id)).map((d) => (
          <section className="sw-card mt-5" key={d.id}>
            <h2 className="sw-section">Your university is on GenZnect.</h2>
            <p className="sw-muted my-3">
              {campus.organizations.find((o) => o.id === d.university_id)?.name}
              . Your verified email matches its approved domain. Confirm to{" "}
              {d.auto_enrollment ? "connect" : "request approval"}.
            </p>
            <Action
              run={() => api(`/campus/${d.university_id}/connect`, "POST")}
            >
              {d.auto_enrollment
                ? "Confirm university connection"
                : "Request university connection"}
            </Action>
          </section>
        ))}
        {campus.requests.map((r) => (
          <p key={r.id} className="sw-card mt-4">
            Campus connection: {r.status}
          </p>
        ))}
        {campus.invitations.map((i) => (
          <section className="sw-card mt-4" key={i.id}>
            <h2 className="sw-section">Invitation from {i.name}</h2>
            <p className="sw-muted my-3">
              {i.program} · expires{" "}
              {new Date(i.expires_at).toLocaleDateString()}
            </p>
            <div className="flex gap-3">
              {[true, false].map((accept) => (
                <Action
                  key={String(accept)}
                  secondary={!accept}
                  run={() =>
                    api(`/campus/invitations/${i.id}/decision`, "POST", {
                      accept,
                    })
                  }
                >
                  {accept ? "Accept connection" : "Decline"}
                </Action>
              ))}
            </div>
          </section>
        ))}
        <Announcements rows={campus.announcements} />
        <div className="mt-5 grid gap-3">
          {[
            ...data.opportunities.filter((o) => o.university_id),
            ...data.events.filter((e) => e.university_id),
          ].map((r) => (
            <Link
              className="sw-card"
              href={`/dashboard/${r.starts_at ? "events" : "opportunities"}/${r.id}`}
              key={r.id}
            >
              {r.title}
            </Link>
          ))}
        </div>
      </>
    );
  return (
    <>
      <h1 className="sw-title">
        {mode === "announcements"
          ? "Announcements & resources"
          : "Students & campus connections"}
      </h1>
      {!org?.verified ? (
        <p className="sw-card mt-5">
          University verification is pending. Campus management opens after your
          official account is verified.
        </p>
      ) : (
        <>
          {mode === "students" ? (
            <>
              <details className="sw-card mt-5">
                <summary className="font-semibold">
                  University email domains
                </summary>
                <p className="sw-muted mt-3">
                  Domain requests require GenZnect review. Typing a domain never
                  verifies it. Auto-enrollment still requires student
                  confirmation.
                </p>
                <Editor
                  title="Domain"
                  fields={[
                    {
                      key: "domain",
                      label: "Official email domain",
                      required: true,
                    },
                    {
                      key: "auto_enrollment",
                      label: "Allow enrollment after student confirmation",
                      type: "checkbox",
                    },
                  ]}
                  initial={{ domain: "", auto_enrollment: false }}
                  save={(v) => api(`/campus/${org.id}/domain`, "PUT", v)}
                />
                {campus.domains.map((d) => (
                  <p className="sw-muted mt-3" key={d.id}>
                    {d.domain} ·{" "}
                    {d.approved_at
                      ? "Approved"
                      : "Pending platform verification"}{" "}
                    ·{" "}
                    {d.auto_enrollment ? "Confirmation mode" : "Approval mode"}
                  </p>
                ))}
              </details>
              <details className="sw-card mt-5">
                <summary className="font-semibold">Invite a student</summary>
                <Editor
                  title="Campus invitation"
                  fields={[
                    {
                      key: "email",
                      label: "Student email",
                      type: "email",
                      required: true,
                    },
                  ]}
                  initial={{ email: "" }}
                  save={async (v) => {
                    const r = await api<{ token: string }>(
                      `/campus/${org.id}/invitations`,
                      "POST",
                      v,
                    );
                    setInviteLink(
                      `${window.location.origin}/invite/${r.token}`,
                    );
                  }}
                />
                {inviteLink && (
                  <label className="sw-label mt-4">
                    Share this acceptance link
                    <input className="sw-input" readOnly value={inviteLink} />
                  </label>
                )}
                <p className="sw-muted mt-3">
                  Existing students receive an in-app invitation. New students
                  can use the link after signing up with the invited email.
                </p>
                {campus.invitations.map((i) => (
                  <p className="sw-muted mt-3" key={i.id}>
                    {i.email} · {i.status} · expires{" "}
                    {new Date(i.expires_at).toLocaleDateString()}
                  </p>
                ))}
              </details>
              <section className="sw-card mt-5">
                <h2 className="sw-section">Connection requests</h2>
                {campus.requests
                  .filter((r) => r.status === "pending")
                  .map((r) => (
                    <div key={r.id} className="mt-4 flex flex-wrap gap-3">
                      <p>{r.full_name} · verified domain request</p>
                      {[true, false].map((accept) => (
                        <Action
                          key={String(accept)}
                          secondary={!accept}
                          run={() =>
                            api(`/campus/requests/${r.id}/decision`, "POST", {
                              accept,
                            })
                          }
                        >
                          {accept ? "Approve" : "Decline"}
                        </Action>
                      ))}
                    </div>
                  ))}
                {!campus.requests.some((r) => r.status === "pending") && (
                  <p className="sw-muted mt-3">
                    No requests waiting for approval.
                  </p>
                )}
              </section>
              <div className="sw-card mt-5">
                <h2 className="sw-section">
                  {campus.progress.length} enrolled students
                </h2>
                <p className="sw-muted mt-3">
                  Profile completion reflects the shared Student profile checklist.
                  Activity counts include your campus only.
                </p>
                <input
                  className="sw-input my-4"
                  placeholder="Search students or program"
                  aria-label="Search students"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {campus.progress
                    .filter((s) =>
                      `${s.full_name} ${s.program}`
                        .toLowerCase()
                        .includes(q.toLowerCase()),
                    )
                    .slice(0, 100)
                    .map((s) => (
                      <article
                        className="rounded-xl border border-slate-200 p-4"
                        key={s.student_id}
                      >
                        <h3 className="font-semibold">{s.full_name}</h3>
                        <p className="sw-muted mt-2">
                          {s.program} ·{" "}
                          {s.study_status || `Year ${s.year || "not provided"}`}
                        </p>
                        <p className="text-sm mt-3">
                          Profile completion: {s.completion}%
                        </p>
                        <p className="sw-muted mt-2">
                          {s.projects} campus projects · {s.events} events ·{" "}
                          {s.applications} campus applications
                        </p>
                      </article>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Editor
                title="Announcement"
                fields={[
                  { key: "title", label: "Title", required: true },
                  {
                    key: "body",
                    label: "Announcement",
                    type: "textarea",
                    required: true,
                  },
                  { key: "url", label: "Resource URL", type: "url" },
                  {
                    key: "important",
                    label: "Notify connected students",
                    type: "checkbox",
                  },
                ]}
                initial={{ title: "", body: "", url: "", important: false }}
                save={(v) => api(`/campus/${org.id}/announcements`, "POST", v)}
              />
              <Announcements rows={campus.announcements} />
            </>
          )}
        </>
      )}
    </>
  );
}
function Announcements({ rows }: { rows: CampusData["announcements"] }) {
  return (
    <section className="mt-5 space-y-4">
      <h2 className="sw-section">Campus announcements</h2>
      {!rows.length && (
        <p className="sw-muted">
          Campus resources and placement updates will appear here.
        </p>
      )}
      {rows.map((a) => (
        <article className="sw-card" key={a.id} id={a.id}>
          <h3 className="font-semibold">{a.title}</h3>
          <p className="sw-muted mt-3 whitespace-pre-wrap">{a.body}</p>
          {a.url && (
            <a
              className="sw-button sw-secondary mt-3"
              href={a.url}
              target="_blank"
              rel="noreferrer"
            >
              Open resource
            </a>
          )}
        </article>
      ))}
    </section>
  );
}
