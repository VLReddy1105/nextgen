"use client";
import { useState } from "react";
import Link from "next/link";
import { MentorContextBadge } from "./MentorAffiliations";
import { api } from "@/lib/api/client";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { Action } from "@/components/student/StudentModules";
import { Editor } from "./Editor";
export function Mentor({
  mode,
}: {
  mode: "profile" | "connections" | "sessions" | "requests" | "students";
}) {
  const { data } = useWorkspace();
  const [studentView, setStudentView] = useState("active");
  if (!data) return null;
  const mentor = data.mentor;
  if (!mentor) return <p aria-busy="true">Loading mentorship…</p>;
  const profile = mentor.profile;
  const connections = mentor.connections;
  const visible = connections.filter((c) =>
    mode === "requests"
      ? c.status === "requested"
      : mode === "students"
        ? studentView === "recommended"
          ? mentor.recommended_students.some(
              (m) => m.student_id === c.student_id,
            )
          : c.status === "accepted"
        : true,
  );
  if (mode === "profile")
    return profile ? (
      <>
        <h1 className="sw-title">My professional profile</h1>
        <MentorContextBadge />
        <p className="sw-muted mt-3">
          Help students find the right guidance. Your skills inform mentor
          matching. Your employer text describes your experience; it does not
          establish an approved affiliation.
        </p>
        {mentor.profile_missing.length > 0 && (
          <p className="sw-card mt-4">
            Complete your mentor profile: {mentor.profile_missing.join(", ")}.
          </p>
        )}
        <Editor
          title="Mentor profile"
          fields={[
            { key: "full_name", label: "Full name", required: true },
            { key: "headline", label: "Professional headline", required: true },
            { key: "current_position", label: "Current position" },
            {
              key: "company",
              label: "Employer (professional background only)",
            },
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
        {mode === "sessions"
          ? "Sessions"
          : mode === "requests"
            ? "Mentorship requests"
            : mode === "students"
              ? "My students"
              : "Mentorship"}
      </h1>
      <p className="sw-muted mt-3">
        {mode === "sessions"
          ? "Schedule a confirmed session with an accepted student connection."
          : "Accept requests from students you can support."}
      </p>
      {mode === "students" && (
        <section className="sw-card mt-5">
          <label htmlFor="mentor-student-view">Student view</label>
          <select
            id="mentor-student-view"
            className="sw-input mt-2"
            value={studentView}
            onChange={(e) => setStudentView(e.target.value)}
          >
            <option value="active">Active mentees</option>
            <option value="recommended">
              Skill matches in your connections
            </option>
          </select>
          <p className="sw-muted mt-3">
            Matches use shared skills and expertise from students who have
            requested or accepted mentorship with you.
          </p>
          <Link className="sw-button mt-3" href="/dashboard/projects">
            View projects and permitted invitations
          </Link>
        </section>
      )}
      {mode !== "sessions" ? (
        <div className="mt-5 grid gap-4">
          {visible.map((c) => (
            <section className="sw-card" key={c.student_id}>
              <div className="flex justify-between gap-3">
                <h2 className="sw-section">{c.full_name}</h2>
                <span className="sw-chip">{c.status}</span>
              </div>
              <p className="sw-muted my-3">{c.skills?.join(", ")}</p>
              {mentor.recommended_students.find(
                (m) => m.student_id === c.student_id,
              )?.matched_skills?.length ? (
                <p className="sw-muted mb-3">
                  Matches{" "}
                  {mentor.recommended_students
                    .find((m) => m.student_id === c.student_id)!
                    .matched_skills!.join(" + ")}
                </p>
              ) : null}
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
          {!visible.length && (
            <p className="sw-card">
              {mode === "students"
                ? studentView === "recommended"
                  ? "No matching students found in your current connections. Update your skills and expertise to improve matching."
                  : "No active mentees yet. Accept an eligible mentorship request to establish a connection."
                : "No mentorship requests in this view. Complete your profile and availability so students can find you."}
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
                ...(data.mentor_hub?.available
                  ? [
                      {
                        key: "organization_id",
                        label: "Share session with affiliation (optional)",
                        options: (data.mentor_hub.affiliations || [])
                          .filter((a) => a.status === "accepted")
                          .map((a) => a.organization_id),
                        optionLabels: Object.fromEntries(
                          (data.mentor_hub.affiliations || []).map((a) => [
                            a.organization_id,
                            a.organization_name,
                          ]),
                        ),
                      },
                    ]
                  : []),
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
              save={(v) => {
                if (new Date(String(v.starts_at)) <= new Date())
                  throw new Error("Choose a future session time.");
                if (
                  v.meeting_url &&
                  !String(v.meeting_url).startsWith("https://")
                )
                  throw new Error("Use an HTTPS meeting URL.");
                const { organization_id, ...session } = v;
                return api(
                  organization_id ? "/mentor-hub/sessions" : "/sessions",
                  "POST",
                  {
                    ...session,
                    ...(organization_id ? { organization_id } : {}),
                    starts_at: new Date(String(v.starts_at)).toISOString(),
                  },
                );
              }}
            />
          ) : (
            <p className="sw-card mt-5">
              Accept a student connection to schedule your first session.
            </p>
          )}
          {!data.sessions.some(
            (s) =>
              s.starts_at &&
              Date.parse(s.starts_at) > Date.now() &&
              s.status !== "cancelled",
          ) && (
            <p className="sw-muted mt-4">No upcoming mentorship sessions.</p>
          )}
          {[...data.sessions]
            .sort((a, b) =>
              (b.starts_at || "").localeCompare(a.starts_at || ""),
            )
            .map((s) => (
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
