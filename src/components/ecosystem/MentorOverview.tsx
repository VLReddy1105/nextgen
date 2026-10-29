"use client";
import Link from "next/link";
import { MentorContextBadge } from "./MentorAffiliations";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { Invitations } from "./Invitations";

export function MentorOverview() {
  const { data } = useWorkspace();
  if (!data?.mentor) return <p aria-busy="true">Loading mentorship…</p>;
  const { mentor } = data;
  const upcoming = data.sessions.filter(
    (s) =>
      s.starts_at &&
      Date.parse(s.starts_at) > Date.now() &&
      s.status !== "cancelled",
  );
  return (
    <>
      <p className="sw-muted">Mentor workspace</p>
      <MentorContextBadge />
      <h1 className="sw-title mt-2">
        Welcome, {data.profile.full_name.split(" ")[0]}
      </h1>
      <p className="sw-muted mt-3">
        Support your mentees, review requests and plan your next session.
      </p>
      {mentor.profile_missing.length > 0 && (
        <section className="sw-card mt-5">
          <h2 className="sw-section">Complete your professional profile</h2>
          <p className="sw-muted mt-3">
            Add {mentor.profile_missing.join(", ").toLowerCase()} to help
            students understand your guidance.
          </p>
          <Link className="sw-button mt-3" href="/dashboard/profile">
            Complete mentor profile
          </Link>
        </section>
      )}
      <div className="my-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Requests", "requests", data.counts.requests || 0],
          ["Active mentees", "students", data.counts.connections || 0],
          ["Upcoming sessions", "sessions", upcoming.length],
        ].map(([label, route, count]) => (
          <Link key={route} href={`/dashboard/${route}`} className="sw-card">
            <p className="sw-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{count}</p>
          </Link>
        ))}
      </div>
      <Invitations />
      <section className="sw-card mt-5">
        <h2 className="sw-section">Students matching your expertise</h2>
        <p className="sw-muted mt-2">
          From your existing mentorship requests and connections.
        </p>
        {mentor.recommended_students.slice(0, 5).map((s) => (
          <Link
            key={s.student_id}
            href={
              s.status === "requested"
                ? "/dashboard/requests"
                : "/dashboard/students"
            }
            className="mt-4 block text-sm"
          >
            {s.full_name} · Matches {s.matched_skills?.join(" + ")}
          </Link>
        ))}
        {!mentor.recommended_students.length && (
          <p className="sw-muted mt-4">
            No matching students found in your current connections.
          </p>
        )}
      </section>
      <section className="sw-card mt-5">
        <h2 className="sw-section">Your projects</h2>
        {data.projects
          .filter((p) => p.joined)
          .slice(0, 5)
          .map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="mt-3 block text-sm"
            >
              {p.title} · {p.my_role?.replaceAll("_", " ") || "member"}
            </Link>
          ))}
        {!data.projects.some((p) => p.joined) && (
          <p className="sw-muted mt-3">You have not joined any projects yet.</p>
        )}
        <Link className="sw-button mt-4" href="/dashboard/projects">
          Explore eligible projects
        </Link>
      </section>
    </>
  );
}
