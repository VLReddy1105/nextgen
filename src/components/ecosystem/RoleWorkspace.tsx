"use client";
import Link from "@/components/student/DetailLink";
import { StatusBadge } from "./ui";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useWorkspace, WorkspaceSection } from "@/components/student/WorkspaceProvider";
import { CreateSpace } from "@/components/student/CreateSpace";
import { Publishing } from "./Publishing";
import { roleModules, moduleLabel } from "@/lib/role-workspaces";
import { MentorOverview } from "./MentorOverview";
import { Invitations } from "./Invitations";
export function RoleWorkspace({ module = "overview" }: { module?: string }) {
  const { data } = useWorkspace(),
    search = useSearchParams();
  const [q, setQ] = useState(""),
    [sort, setSort] = useState("newest"),
    [filter, setFilter] = useState(search.get("view") || "");
  useEffect(() => {
    setFilter(search.get("view") || "");
  }, [search]);
  if (!data) return null;
  const organization = data.organizations?.find(
    (o) => o.type === data.profile.primary_role,
  );
  const canPublish =
    module === "events"
      ? ["company", "mentor", "founder"].includes(data.profile.primary_role) ||
        (organization?.type === "university" && organization.verified)
      : module === "opportunities" &&
        !!organization &&
        (organization.type !== "university" || organization.verified);
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
  if (module === "overview" && role === "mentor") return <MentorOverview />;
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
              ([k]) => k !== "notifications" && roleModules[role]?.includes(k),
            )
            .map(([k, n]) => (
              <Link className="sw-card" href={"/dashboard/" + k} key={k}>
                <p className="sw-muted capitalize">
                  {(
                    {
                      opportunities: "Published opportunities",
                      applications: "Active applicants",
                      projects: "Joined projects",
                      communities: "Joined communities",
                      events: "Published upcoming events",
                      students: "Connected students",
                    } as Record<string, string>
                  )[k] || moduleLabel(role, k)}
                </p>
                <p className="mt-2 text-3xl font-semibold">{n}</p>
              </Link>
            ))}
        </div>
        <Invitations />
        {(role === "company" || role === "university") && (
          <WorkspaceSection needs={["applications", "opportunities"]}><section className="sw-card mb-5">
            <h2 className="sw-section">Recent applicants</h2>
            <p className="sw-muted mt-2">
              {data.applications.length} applications ·{" "}
              {
                data.opportunities.filter((o) => o.status === "published")
                  .length
              }{" "}
              published opportunities
            </p>
            {data.applications.slice(0, 5).map((a) => (
              <Link
                key={a.id}
                className="mt-3 block text-sm text-blue-700"
                href={`/dashboard/applications/${a.id}`}
              >
                {a.full_name || "Applicant"} · {a.title} · {a.status}
              </Link>
            ))}
            {!data.applications.length && (
              <Link className="sw-button mt-4" href="/dashboard/opportunities">
                Create or manage opportunities
              </Link>
            )}
          </section></WorkspaceSection>
        )}
        <WorkspaceSection needs={["activity"]}><section className="sw-card">
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
              Activity appears when you and your connected members take part in
              projects, communities, and supported role workflows.
            </p>
          )}
        </section></WorkspaceSection>
      </>
    );
  const filtered = rows
    .filter(
      (r) =>
        (!filter ||
          r.status === filter ||
          (filter === "mine" && r.joined) ||
          (filter === "discover" && !r.joined) ||
          (filter === "invited" && r.invitation_status === "pending")) &&
        (!search.get("opportunity") ||
          module !== "applications" ||
          r.opportunity_id === search.get("opportunity")) &&
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
      <h1 className="sw-title capitalize">{moduleLabel(role, module)}</h1>
      <p className="sw-muted mt-3">
        Manage your {module} and follow real updates from your network.
      </p>
      {role === "university" &&
        ["opportunities", "events"].includes(module) &&
        !data.organizations?.some(
          (o) => o.type === "university" && o.verified,
        ) && (
          <p className="sw-card mt-5">
            Your official university account must be verified before publishing
            campus content.
          </p>
        )}
      {["projects", "communities"].includes(module) && (
        <Invitations kind={module} />
      )}
      {["projects", "communities"].includes(module) ? (
        <CreateSpace kind={module as "projects" | "communities"} />
      ) : canPublish ? (
        <details className="sw-card mt-5">
          <summary className="sw-button w-fit cursor-pointer">
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
          {(module === "applications"
            ? [
                "applied",
                "reviewed",
                "shortlisted",
                "interview",
                "selected",
                "rejected",
                "withdrawn",
              ]
            : module === "events"
              ? ["draft", "published", "cancelled"]
              : module === "opportunities"
                ? ["draft", "published", "closed"]
                : ["mine", "discover", "invited"]
          ).map((s) => (
            <option key={s} value={s}>
              {s === "mine"
                ? "My spaces"
                : s === "discover"
                  ? "Discover spaces"
                  : s === "invited"
                    ? "Invited"
                    : s[0].toUpperCase() + s.slice(1)}
            </option>
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
            {module === "opportunities" && (
              <p className="sw-muted mt-2">
                {
                  data.applications.filter((a) => a.opportunity_id === r.id)
                    .length
                }{" "}
                applicants · Open to edit or review applicants
              </p>
            )}
            {module === "applications" && (
              <p className="sw-muted mt-2">
                {r.organization} · Applied{" "}
                {r.created_at
                  ? new Date(r.created_at).toLocaleDateString()
                  : "date unavailable"}
              </p>
            )}
            {["projects", "communities"].includes(module) && (
              <p className="sw-muted mt-2">
                {r.joined
                  ? `Joined · ${r.my_role?.replaceAll("_", " ") || "member"}`
                  : r.invitation_status === "pending"
                    ? "Invitation pending"
                    : r.join_request_status === "pending"
                      ? "Join request pending"
                      : "Discover"}{" "}
                · {r.visibility}{" "}
                {r.owner_type ? `· ${r.owner_type} project` : ""}
              </p>
            )}
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
            {q || filter || search.get("opportunity")
              ? "Try another search or filter to see other loaded results."
              : module === "applications"
                ? "Student applications appear here after they apply to your published opportunities. Mentor applications are reviewed in Mentor Opportunities."
                : ["projects", "communities"].includes(module)
                  ? "Use Create above to start a space, or accept an invitation to collaborate. Discover shows spaces you can access."
                  : canPublish
                    ? `Use Create ${module === "events" ? "event" : "opportunity"} above to save a draft and publish when ready.`
                    : "Publishing becomes available when your organization account meets the required verification. Existing content will appear here when available."}
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
