"use client";
import Link from "next/link";
import { StatusBadge } from "./ui";
import { useState,useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { CreateSpace } from "@/components/student/CreateSpace";
import { Publishing } from "./Publishing";
export function RoleWorkspace({ module = "overview" }: { module?: string }) {
  const { data } = useWorkspace(),
    search = useSearchParams();
  const [q, setQ] = useState(""),
    [sort, setSort] = useState("newest"),
    [filter, setFilter] = useState(search.get("view") || "");
  useEffect(()=>{setFilter(search.get("view")||"");},[search]);
  if (!data) return null;
  const role = data.profile.primary_role,
    rows =
      module === "projects"
        ? data.projects
        : module === "communities"
          ? data.communities
          : module === "applications"
            ? data.applications
            : module === "events"
              ? data.events
              : data.opportunities;
  if (module === "overview")
    return (
      <>
        <p className="sw-muted capitalize">{role} workspace</p>
        <h1 className="sw-title mt-2">
          Welcome, {data.profile.full_name.split(" ")[0]}
        </h1>
        <p className="sw-muted mt-3">
          Your connections, activity and next steps in one place.
        </p>
        <div className="my-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(data.counts)
            .filter(
              ([k]) =>
                k !== "notifications" &&
                (role !== "mentor" ||
                  ["communities", "connections", "sessions"].includes(k)),
            )
            .map(([k, n]) => (
              <Link className="sw-card" href={"/dashboard/" + k} key={k}>
                <p className="sw-muted capitalize">{k.replaceAll("_", " ")}</p>
                <p className="mt-2 text-3xl font-semibold">{n}</p>
              </Link>
            ))}
        </div>
        <section className="sw-card">
          <h2 className="sw-section">Recent activity</h2>
          {data.activity?.length ? (
            data.activity.map((a) => (
              <p
                className="mt-4 border-t border-slate-100 pt-3 text-sm"
                key={a.id}
              >
                {a.message}
                <span className="sw-muted block">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </p>
            ))
          ) : (
            <p className="sw-muted mt-3">
              Activity will appear as students respond to your opportunities and
              invitations.
            </p>
          )}
        </section>
      </>
    );
  const filtered = rows
    .filter(
      (r) =>
        (!filter ||
          r.status === filter ||
          (filter === "mine" && r.joined) ||
          (filter === "discover" && !r.joined)) &&
        `${r.full_name || ""} ${r.title || r.name} ${r.description || ""} ${r.status || ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? (a.title || a.name || "").localeCompare(b.title || b.name || "")
        : (b.created_at || "").localeCompare(a.created_at || ""),
    );
  return (
    <>
      <h1 className="sw-title capitalize">{module}</h1>
      <p className="sw-muted mt-3">
        Manage your {module} and follow real updates from your network.
      </p>
      {["projects", "communities"].includes(module) ? (
        <CreateSpace kind={module as "projects" | "communities"} />
      ) : ["events", "opportunities"].includes(module) && role !== "mentor" ? (
        <details className="sw-card mt-5">
          <summary className="font-semibold">
            Create {module === "events" ? "event" : "opportunity"}
          </summary>
          <Publishing kind={module as "events" | "opportunities"} />
        </details>
      ) : null}
      <div className="my-5 grid gap-3 sm:grid-cols-3">
        <input
          className="sw-input"
          aria-label="Search"
          placeholder={`Search ${module}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="sw-input"
          aria-label="Filter status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {[
            "draft",
            "published",
            "closed",
            "applied",
            "reviewed",
            "shortlisted",
            "interview",
            "selected",
            "rejected",
            "withdrawn",
            "active",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className="sw-input"
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="title">Title</option>
        </select>
      </div>
      <div className="grid gap-4">
        {filtered.slice(0, 100).map((r) => (
          <Link
            className="sw-card block hover:border-blue-300"
            key={r.id}
            href={`/dashboard/${module}/${r.id}`}
          >
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="sw-section">
                {r.full_name ? `${r.full_name} · ` : ""}
                {r.title || r.name}
              </h2>
              <StatusBadge value={r.status || r.visibility || "Active"} />
            </div>
            <p className="sw-muted mt-3 line-clamp-2">{r.description}</p>
            {r.member_count !== undefined && (
              <p className="sw-muted mt-2">
                {r.member_count}{" "}
                {module === "events" ? "registrations" : "members"}
              </p>
            )}
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <section className="sw-card">
          <h2 className="sw-section">
            No {module} {q || filter ? "match your filters" : "yet"}.
          </h2>
          <p className="sw-muted mt-3">
            {module === "applications"
              ? "Applications appear when students apply to your published opportunities."
              : "Create your first " +
                (module === "communities" ? "community" : module.slice(0, -1)) +
                " to start connecting with students."}
          </p>
        </section>
      )}
      <p className="sw-muted mt-4">
        Showing {Math.min(filtered.length, 100)} of {filtered.length} loaded
        results.
      </p>
    </>
  );
}
