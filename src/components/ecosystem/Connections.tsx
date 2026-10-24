"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { Empty } from "@/components/student/StudentModules";

export function Talent() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState("");
  if (!data) return null;
  const applicants = [
    ...new Map(
      data.applications.map((a) => [a.student_id || a.id, a]),
    ).values(),
  ];
  const filtered = applicants.filter((a) =>
    `${a.full_name || ""} ${a.title || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <h1 className="sw-title">Talent</h1>
      <p className="sw-muted mt-3">
        Students who applied to your opportunities. Open an application to view
        the permitted skills and academic summary. Private Student profiles are
        not a public directory.
      </p>
      <input
        className="sw-input my-5"
        aria-label="Search applicants"
        placeholder="Search applicant or opportunity"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filtered.map((a) => (
        <Link
          className="sw-card mb-3 block"
          key={a.id}
          href={`/dashboard/applications/${a.id}`}
        >
          <h2 className="sw-section">{a.full_name || "Applicant"}</h2>
          <p className="sw-muted mt-2">
            {a.title} · {a.status}
          </p>
          <span className="mt-3 block text-sm text-blue-700">
            View permitted applicant information →
          </span>
        </Link>
      ))}
      {!filtered.length && (
        <Empty
          title={query ? "No matching applicants" : "No applicants yet"}
          description={
            query
              ? "Try a different name or opportunity."
              : "Publish an opportunity so eligible students can apply. Only applicants to your opportunities appear here."
          }
          href="/dashboard/opportunities"
          action="Manage opportunities"
        />
      )}
    </>
  );
}
export function SpaceConnections() {
  const { data } = useWorkspace();
  if (!data) return null;
  const groups = [
    { kind: "projects", items: data.projects },
    { kind: "communities", items: data.communities },
  ];
  return (
    <>
      <h1 className="sw-title">Connections</h1>
      <p className="sw-muted mt-3">
        Your network comes from projects and communities you participate in.
        Open a space to view its permitted members, invitations, and activity.
      </p>
      {groups.map(({ kind, items }) => (
        <section key={kind} className="mt-6">
          <h2 className="sw-section capitalize">{kind}</h2>
          {items
            .filter((i) => i.joined)
            .map((i) => (
              <Link
                key={i.id}
                className="sw-card mt-3 block"
                href={`/dashboard/${kind}/${i.id}?tab=${kind === "projects" ? "team" : "posts"}`}
              >
                {i.title || i.name}
                <span className="sw-muted mt-2 block">
                  {i.my_role?.replaceAll("_", " ") || "Member"} ·{" "}
                  {i.member_count ?? 0} members
                </span>
              </Link>
            ))}
          {!items.some((i) => i.joined) && (
            <p className="sw-card mt-3">
              No joined {kind} yet.{" "}
              <Link className="text-blue-700" href={`/dashboard/${kind}`}>
                Explore or create a{" "}
                {kind === "projects" ? "project" : "community"}.
              </Link>
            </p>
          )}
        </section>
      ))}
    </>
  );
}
