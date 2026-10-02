"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { Action } from "@/components/student/StudentModules";
import { Editor, type Values } from "./Editor";
type Connection = {
  student_id: string;
  mentor_id: string;
  full_name: string;
  status: string;
  skills: string[];
};
export function Mentor({
  mode,
}: {
  mode: "profile" | "connections" | "sessions";
}) {
  const { data } = useWorkspace();
  const [profile, setProfile] = useState<Values | null>(null),
    [connections, setConnections] = useState<Connection[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (mode === "profile")
      api<Values>("/mentor/profile")
        .then(setProfile)
        .catch((e) => setError(e.message));
    else
      api<{ items: Connection[] }>("/connections")
        .then((r) => setConnections(r.items))
        .catch((e) => setError(e.message));
  }, [mode, data]);
  if (error)
    return (
      <div className="sw-card" role="alert">
        {error}
        <button
          className="sw-button mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  if (!data) return null;
  if (mode === "profile")
    return profile ? (
      <>
        <h1 className="sw-title">My professional profile</h1>
        <p className="sw-muted mt-3">
          Help students find the right guidance. Your skills inform mentor
          matching.
        </p>
        <Editor
          title="Mentor profile"
          fields={[
            { key: "full_name", label: "Full name", required: true },
            { key: "headline", label: "Professional headline", required: true },
            { key: "current_position", label: "Current position" },
            { key: "company", label: "Company" },
            {
              key: "years_experience",
              label: "Years of experience",
              type: "number",
              min: 0,
              max: 80,
            },
            { key: "bio", label: "About", type: "textarea" },
            { key: "expertise", label: "Expertise", catalog: "skills" },
            { key: "skills", label: "Skills", catalog: "skills" },
            { key: "industry", label: "Industry" },
            { key: "topics", label: "Mentorship topics", catalog: "interests" },
            { key: "linkedin_url", label: "LinkedIn", type: "url" },
            { key: "portfolio_url", label: "Portfolio", type: "url" },
            {
              key: "availability_status",
              label: "Availability",
              options: ["available", "limited", "unavailable"],
            },
          ]}
          initial={Object.fromEntries(
            [
              "full_name",
              "headline",
              "current_position",
              "company",
              "years_experience",
              "bio",
              "expertise",
              "skills",
              "industry",
              "topics",
              "linkedin_url",
              "portfolio_url",
              "availability_status",
            ].map((k) => [
              k,
              profile[k] ??
                (["skills", "expertise", "topics"].includes(k)
                  ? []
                  : k === "years_experience"
                    ? 0
                    : ""),
            ]),
          )}
          save={(v) => api("/mentor/profile", "PUT", v)}
        />
      </>
    ) : (
      <p>Loading profile…</p>
    );
  return (
    <>
      <h1 className="sw-title">
        {mode === "sessions" ? "Sessions" : "Connections"}
      </h1>
      <p className="sw-muted mt-3">
        {mode === "sessions"
          ? "Schedule a confirmed session with an accepted student connection."
          : "Accept requests from students you can support."}
      </p>
      {mode === "connections" ? (
        <div className="mt-5 grid gap-4">
          {connections.map((c) => (
            <section className="sw-card" key={c.student_id}>
              <div className="flex justify-between gap-3">
                <h2 className="sw-section">{c.full_name}</h2>
                <span className="sw-chip">{c.status}</span>
              </div>
              <p className="sw-muted my-3">{c.skills?.join(", ")}</p>
              {c.status === "requested" && (
                <div className="flex gap-3">
                  {[true, false].map((accept) => (
                    <Action
                      key={String(accept)}
                      secondary={!accept}
                      run={() =>
                        api(`/connections/${c.student_id}/decision`, "POST", {
                          accept,
                        })
                      }
                    >
                      {accept ? "Accept" : "Decline"}
                    </Action>
                  ))}
                </div>
              )}
            </section>
          ))}
          {!connections.length && (
            <p className="sw-card">
              No requests yet. Complete your profile and set your availability
              so students can find you.
            </p>
          )}
        </div>
      ) : (
        <>
          {connections.some((c) => c.status === "accepted") ? (
            <Editor
              title="Session"
              fields={[
                {
                  key: "student_id",
                  label: "Accepted student",
                  options: connections
                    .filter((c) => c.status === "accepted")
                    .map((c) => c.student_id),
                  optionLabels: Object.fromEntries(
                    connections.map((c) => [c.student_id, c.full_name]),
                  ),
                  required: true,
                },
                { key: "title", label: "Session topic", required: true },
                {
                  key: "starts_at",
                  label: "Date and time",
                  type: "datetime-local",
                  required: true,
                },
                { key: "meeting_url", label: "Meeting URL", type: "url" },
              ]}
              initial={{
                title: "",
                student_id: "",
                starts_at: "",
                meeting_url: "",
              }}
              save={(v) =>
                api("/sessions", "POST", {
                  ...v,
                  starts_at: new Date(String(v.starts_at)).toISOString(),
                })
              }
            />
          ) : (
            <p className="sw-card mt-5">
              Accept a student connection to schedule your first session.
            </p>
          )}
          {data.sessions.map((s) => (
            <section className="sw-card mt-4" key={s.id}>
              <h2 className="sw-section">{s.title}</h2>
              <p className="sw-muted mt-3">
                {new Date(s.starts_at || "").toLocaleString()} · {s.status}
              </p>
              {s.meeting_url && (
                <a
                  href={s.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="sw-button mt-4"
                >
                  Open meeting
                </a>
              )}
            </section>
          ))}
        </>
      )}
    </>
  );
}
