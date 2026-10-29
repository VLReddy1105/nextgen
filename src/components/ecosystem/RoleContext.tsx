"use client";
import Link from "next/link";
import { MentorContextBadge } from "./MentorAffiliations";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
export function RoleContext() {
  const { data } = useWorkspace();
  if (!data) return null;
  const role = data.profile.primary_role;
  const next =
    role === "company"
      ? ["Review applicants", "applications"]
      : role === "university"
        ? ["Review student connections", "student-connections"]
        : role === "mentor"
          ? ["Review mentorship requests", "requests"]
          : ["Manage your projects", "projects"];
  const upcoming = (role === "mentor" ? data.sessions : data.events)
    .filter(
      (e) =>
        e.starts_at &&
        new Date(e.starts_at) > new Date() &&
        e.status !== "cancelled",
    )
    .sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""))
    .slice(0, 3);
  return (
    <aside aria-label="Workspace context" className="sw-context">
      {role === "mentor" && <MentorContextBadge />}
      <section className="sw-card">
        <h2 className="sw-section">
          {role === "company"
            ? "Recent applicants"
            : role === "mentor"
              ? "Mentorship requests"
              : role === "university"
                ? "Campus next steps"
                : "Your projects"}
        </h2>
        {role === "company" ? (
          data.applications.slice(0, 3).map((a) => (
            <Link
              className="sw-muted mt-3 block"
              key={a.id}
              href={`/dashboard/applications/${a.id}`}
            >
              {a.full_name || "Applicant"} · {a.title} · {a.status}
            </Link>
          ))
        ) : role === "mentor" ? (
          <p className="sw-muted mt-3">
            {data.counts.requests || 0} pending requests ·{" "}
            {data.counts.connections || 0} accepted connections
          </p>
        ) : role === "university" ? (
          <p className="sw-muted mt-3">
            {data.counts.students || 0} connected students. Review invitations
            and verified-domain requests before connecting.
          </p>
        ) : (
          <p className="sw-muted mt-3">
            {data.projects.filter((p) => p.joined).length} participating
            projects · {data.communities.filter((c) => c.joined).length} joined
            communities
          </p>
        )}
        {role === "company" && !data.applications.length && (
          <p className="sw-muted mt-3">
            Applicants appear after students apply to your published
            opportunities.
          </p>
        )}
        <Link className="sw-button mt-4" href={`/dashboard/${next[1]}`}>
          {next[0]}
        </Link>
      </section>
      <section className="sw-card">
        <h2 className="sw-section">
          Upcoming {role === "mentor" ? "sessions" : "events"}
        </h2>
        {upcoming.map((e) => (
          <Link
            key={e.id}
            href={
              role === "mentor"
                ? "/dashboard/sessions"
                : `/dashboard/events/${e.id}`
            }
            className="sw-muted mt-3 block"
          >
            {e.title}
            <br />
            {new Date(e.starts_at!).toLocaleString()}
          </Link>
        ))}
        {!upcoming.length && (
          <p className="sw-muted mt-3">
            No upcoming{" "}
            {role === "mentor" ? "sessions scheduled" : "events organized"}.
          </p>
        )}
      </section>
      {role === "mentor" && data.mentor && (
        <section className="sw-card">
          <h2 className="sw-section">Student skill matches</h2>
          {data.mentor.recommended_students.slice(0, 3).map((s) => (
            <Link
              className="sw-muted mt-3 block"
              key={s.student_id}
              href={
                s.status === "requested"
                  ? "/dashboard/requests"
                  : "/dashboard/students"
              }
            >
              {s.full_name} · {s.matched_skills?.join(" + ")}
            </Link>
          ))}
          {!data.mentor.recommended_students.length && (
            <p className="sw-muted mt-3">
              No matching students in your current connections.
            </p>
          )}
          {data.mentor.profile_missing.length > 0 && (
            <Link className="sw-button mt-4" href="/dashboard/profile">
              Complete mentor profile
            </Link>
          )}
        </section>
      )}
      <section className="sw-card">
        <h2 className="sw-section">Recent updates</h2>
        {data.notifications.slice(0, 4).map((n) => (
          <Link key={n.id} className="mt-3 block text-sm" href={n.action_url}>
            {n.title}
            {!n.read_at ? " · Unread" : ""}
          </Link>
        ))}
        {!data.notifications.length && (
          <p className="sw-muted mt-3">
            Responses and activity from your relationships will appear here.
          </p>
        )}
      </section>
    </aside>
  );
}
