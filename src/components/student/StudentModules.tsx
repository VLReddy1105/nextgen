"use client";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  Search,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";
import { StudentActivity } from "./StudentActivity";
import { CreateSpace } from "./CreateSpace";
import { workspaceApi } from "@/lib/api/workspace";
import type { Item, Module } from "@/lib/api/types";

export const label = (value?: string) => value?.replaceAll("_", " ") ?? "";
export function Empty({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="sw-card py-10 text-center">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        <BriefcaseBusiness className="size-5" />
      </div>
      <h2 className="sw-section">{title}</h2>
      <p className="sw-muted mx-auto mt-3 max-w-sm">{description}</p>
      {href ? (
        <Link className="sw-button mt-5" href={href}>
          {action || "Explore opportunities"}{" "}
          <ArrowUpRight className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}
export function Action({
  run,
  children,
  secondary = false,
}: {
  run: () => Promise<unknown>;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { mutate } = useWorkspace();
  return (
    <span className="inline-flex max-w-full flex-col items-start gap-2">
      <button
        className={`sw-button ${secondary ? "sw-secondary" : ""}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await mutate(run);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Action failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : children}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </span>
  );
}
export function ItemCard({ item, kind }: { item: Item; kind: Module }) {
  const router = useRouter();
  const { data } = useWorkspace();
  const student = data?.profile.primary_role === "student";
  const title = item.title || item.name || item.full_name || "Untitled";
  return (
    <article className="sw-card flex flex-col transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="sw-chip capitalize">
          {label(item.type || item.category || kind)}
        </span>
        {item.match?.score ? (
          <span className="text-[10px] font-semibold text-emerald-700">
            {item.match.score}% match
          </span>
        ) : null}
      </div>
      <Link
        href={`/dashboard/${kind}/${item.id}`}
        className="mt-5 text-lg font-semibold tracking-tight hover:text-blue-700"
      >
        {title}
      </Link>
      <p className="sw-muted mt-1">
        {item.organization ||
          item.current_position ||
          item.company ||
          item.location ||
          "GenZnect network"}
      </p>
      {item.description || item.bio ? (
        <p className="sw-muted mt-3 line-clamp-2">
          {item.description || item.bio}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(item.tags || item.expertise || []).slice(0, 5).map((t) => (
          <span key={t} className="sw-chip">
            {t}
          </span>
        ))}
      </div>
      {item.match?.matched_skills.length ? (
        <p className="mt-3 text-[11px] text-emerald-700">
          Matches {item.match.matched_skills.join(", ")}
        </p>
      ) : null}
      <div className="sw-muted mt-3 text-xs">
        {item.work_mode ? (
          <p className="capitalize">
            {item.location} · {item.work_mode}
            {item.duration ? ` · ${item.duration}` : ""}
          </p>
        ) : null}
        {item.deadline ? (
          <p>
            Apply / register by {new Date(item.deadline).toLocaleDateString()}
          </p>
        ) : null}
        {item.starts_at ? (
          <p>
            {new Date(item.starts_at).toLocaleString()} · {item.mode}
          </p>
        ) : null}
        {item.status && kind === "applications" ? (
          <span className="sw-chip capitalize">{label(item.status)}</span>
        ) : null}
      </div>
      {kind === "projects" && item.joined ? (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[11px]">
            <span>
              {item.completed_tasks ?? 0}/{item.total_tasks ?? 0} tasks complete
            </span>
            <span>{item.progress ?? 0}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${item.progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : null}
      {item.member_count !== undefined ? (
        <p className="sw-muted mt-3">
          {item.member_count} {kind === "events" ? "registered" : "members"}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-start gap-2 pt-5">
        {kind === "opportunities" && student ? (
          <>
            <Action
              secondary
              run={() => workspaceApi.save(item.id, !item.saved)}
            >
              <Bookmark className="size-3" />
              {item.saved ? "Saved" : "Save"}
            </Action>
            {item.applied ? (
              <Link
                className="sw-button sw-secondary"
                href="/dashboard/applications"
              >
                Applied <Check className="size-3" />
              </Link>
            ) : item.status === "disabled" ||
              (item.deadline && new Date(item.deadline) <= new Date()) ? (
              <span className="sw-chip">Applications closed</span>
            ) : (
              <Action
                run={async () => {
                  const result = await workspaceApi.apply(item.id);
                  router.push(`/dashboard/applications/${result.id}`);
                }}
              >
                Apply now →
              </Action>
            )}
          </>
        ) : kind === "communities" || kind === "projects" ? (
          <>
            <Link
              className="sw-button sw-secondary"
              href={`/dashboard/${kind}/${item.id}`}
            >
              Open {kind === "projects" ? "project" : "community"}
            </Link>
            {item.joined ? (
              <span className="sw-chip">Joined ✓</span>
            ) : item.join_policy === "open_join" ? (
              <Action run={() => workspaceApi.join(kind, item.id)}>Join</Action>
            ) : item.join_policy === "request_to_join" ? (
              <Action
                secondary
                run={() =>
                  api(`/relationships/${kind}/${item.id}/requests`, "POST")
                }
              >
                Request to join
              </Action>
            ) : (
              <span className="sw-chip">Invitation only</span>
            )}
          </>
        ) : kind === "events" && item.status==="cancelled" ? <span className="sw-chip">Event cancelled</span> : kind === "events" &&
          !item.registered &&
          new Date(item.deadline ?? 0) < new Date() ? (
          <span className="sw-chip">Registration closed</span>
        ) : kind === "events" && student ? (
          <Action
            run={() => workspaceApi.register(item.id, !item.registered)}
            secondary={item.registered}
          >
            {item.registered ? "Cancel registration" : "Register"}
          </Action>
        ) : (
          <Link
            href={`/dashboard/${kind}/${item.id}`}
            className="sw-button sw-secondary"
          >
            {kind === "mentorship" ? "View profile" : "View timeline"} →
          </Link>
        )}
      </div>
    </article>
  );
}
const copy: Record<Module, [string, string]> = {
  opportunities: [
    "Find your next step.",
    "Opportunities that connect what you know with what comes next.",
  ],
  applications: [
    "Your progress, in one place.",
    "Follow every application from your first step to the next conversation.",
  ],
  projects: [
    "Build something that matters.",
    "Work with people, develop your skills and turn ideas into experience.",
  ],
  communities: [
    "Find your people.",
    "Share what you know. Learn from people who care about the same things.",
  ],
  events: [
    "Make room for possibility.",
    "Discover conversations, workshops and moments that move you forward.",
  ],
  mentorship: [
    "A little guidance goes a long way.",
    "Meet people with experience in the direction you want to grow.",
  ],
};
export function StudentListing({ kind }: { kind: Module }) {
  const { data } = useWorkspace();
  const search = useSearchParams();
  const [q, setQ] = useState(""),
    [type, setType] = useState(""),
    [skill, setSkill] = useState(""),
    [location, setLocation] = useState(""),
    [mode, setMode] = useState(""),
    [experience, setExperience] = useState(""),
    [sort, setSort] = useState("recommended");
  if (!data) return null;
  const view = search.get("view") || "";
  if (
    (kind === "projects" && ["tasks", "team"].includes(view)) ||
    (kind === "communities" && ["feed", "posts"].includes(view))
  )
    return <StudentActivity kind={kind} view={view} />;
  let items = kind === "mentorship" ? data.mentors : data[kind];
  if (kind === "mentorship" && view === "sessions")
    return (
      <>
        <h1 className="sw-title">Mentorship sessions</h1>
        {data.sessions.length ? (
          data.sessions.map((s) => (
            <section className="sw-card mt-5" key={s.id}>
              <h2 className="sw-section">{s.title}</h2>
              <p className="sw-muted mt-3">
                {new Date(s.starts_at || "").toLocaleString()} · {s.status}
              </p>
              {s.meeting_url && (
                <a
                  className="sw-button mt-4"
                  href={s.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open meeting
                </a>
              )}
            </section>
          ))
        ) : (
          <p className="sw-card mt-5">
            Sessions with your accepted mentors will appear here.
          </p>
        )}
      </>
    );
  if (kind === "mentorship" && view === "mine") return <MentorConnections />;
  if (kind === "opportunities" && view === "saved")
    items = items.filter((i) => i.saved);
  if (kind === "opportunities")
    items = items.filter(
      (i) =>
        (!(type || (view === "saved" ? "" : view)) ||
          i.type === (type || view)) &&
        (!skill ||
          (i.tags ?? []).some((t) =>
            t.toLowerCase().includes(skill.toLowerCase()),
          )) &&
        (!location ||
          i.location?.toLowerCase().includes(location.toLowerCase())) &&
        (!mode || i.work_mode === mode) &&
        (!experience || i.experience === experience),
    );
  if (kind === "applications" && view)
    items = items.filter((i) => i.status === view);
  if (
    (kind === "projects" || kind === "communities") &&
    ["mine", "tasks", "team", "feed", "posts"].includes(view)
  )
    items = items.filter((i) => i.joined);
  if (kind === "events") {
    if (view === "registered") items = items.filter((i) => i.registered);
    if (view === "upcoming")
      items = items.filter((i) => new Date(i.starts_at ?? 0) > new Date());
    if (view === "past")
      items = items.filter((i) => new Date(i.ends_at ?? 0) < new Date());
  }
  items = items.filter((i) =>
    [i.title, i.name, i.organization, ...(i.tags ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  if (sort !== "recommended")
    items = [...items].sort((a, b) =>
      sort === "newest"
        ? (b.created_at ?? "").localeCompare(a.created_at ?? "")
        : (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"),
    );
  return (
    <>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-blue-600">
        {kind}
      </p>
      <h1 className="sw-title">{copy[kind][0]}</h1>
      <p className="sw-muted mt-3">{copy[kind][1]}</p>
      {kind === "projects" || kind === "communities" ? (
        <CreateSpace kind={kind} />
      ) : null}
      {kind === "applications" ? (
        <div className="my-6 grid grid-cols-3 gap-3">
          {["applied", "shortlisted", "interview"].map((status) => (
            <div className="sw-card !p-4" key={status}>
              <p className="text-2xl font-semibold">
                {data.applications.filter((a) => a.status === status).length}
              </p>
              <p className="sw-muted capitalize">{status}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="sw-card my-6 !p-4">
        <label className="relative block">
          <span className="sr-only">Search {kind}</span>
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <input
            className="sw-input !mt-0 !pl-10"
            value={q}
            maxLength={160}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${kind}…`}
          />
        </label>
        {kind === "opportunities" ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              [
                "Type",
                type,
                setType,
                ["job", "internship", "project", "competition", "hiring_drive"],
              ],
              ["Work mode", mode, setMode, ["remote", "hybrid", "on-site"]],
              [
                "Experience",
                experience,
                setExperience,
                ["fresher", "0-1", "1-2", "2+"],
              ],
            ].map(([name, value, set, options]) => (
              <label className="sw-label" key={String(name)}>
                {String(name)}
                <select
                  className="sw-input"
                  value={String(value)}
                  onChange={(e) => (set as (v: string) => void)(e.target.value)}
                >
                  <option value="">All</option>
                  {(options as string[]).map((o) => (
                    <option key={o} value={o}>
                      {label(o)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="sw-label">
              Skill
              <input
                className="sw-input"
                value={skill}
                maxLength={80}
                onChange={(e) => setSkill(e.target.value)}
              />
            </label>
            <label className="sw-label">
              Location
              <input
                className="sw-input"
                value={location}
                maxLength={160}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label className="sw-label">
              Sort
              <select
                className="sw-input"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recommended">Recommended</option>
                <option value="newest">Newest</option>
                <option value="closing">Closing soon</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
      <p className="sw-muted mb-4">
        {items.length} {kind} {view ? `· ${label(view)}` : ""}
      </p>
      {items.length ? (
        <div className="grid gap-4 min-[1500px]:grid-cols-2">
          {items.map((item) => (
            <div key={item.id}>
              {(kind === "projects" && ["tasks", "team"].includes(view)) ||
              (kind === "communities" && ["feed", "posts"].includes(view)) ? (
                <Link
                  className="sw-card block"
                  href={`/dashboard/${kind}/${item.id}?tab=${view === "feed" || view === "posts" ? "posts" : view}`}
                >
                  {item.title || item.name}
                  <span className="sw-muted block">Open {view} →</span>
                </Link>
              ) : kind === "mentorship" && view === "sessions" ? (
                <div className="sw-card">
                  {item.title}
                  <p className="sw-muted">
                    {item.starts_at
                      ? new Date(item.starts_at).toLocaleString()
                      : ""}
                  </p>
                </div>
              ) : (
                <ItemCard item={item} kind={kind} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={`No ${kind} ${q || view ? "found" : "yet"}`}
          description={
            kind === "applications"
              ? "Discover opportunities matched to your skills and take your next step."
              : "Your workspace grows with real activity. Update your profile or adjust your search to discover more."
          }
          href={
            kind === "applications"
              ? "/dashboard/opportunities"
              : "/dashboard/profile"
          }
          action={
            kind === "applications"
              ? "Discover opportunities"
              : "Update profile"
          }
        />
      )}
    </>
  );
}
function MentorConnections() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    import("@/lib/api/client")
      .then(({ api }) =>
        api<{
          items: Item[];
          connections: { mentor_id: string; status: string }[];
        }>("/mentorship"),
      )
      .then((r) =>
        setItems(
          r.items.filter((m) =>
            r.connections.some(
              (c) => c.mentor_id === m.id && c.status === "accepted",
            ),
          ),
        ),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <h1 className="sw-title">My Mentors</h1>
      {loading ? (
        <div
          aria-busy="true"
          className="mt-5 h-40 animate-pulse rounded-xl bg-slate-100"
        />
      ) : error ? (
        <p role="alert">{error}</p>
      ) : items.length ? (
        items.map((i) => <ItemCard key={i.id} item={i} kind="mentorship" />)
      ) : (
        <Empty
          title="Your mentoring connections"
          description="Accepted mentoring relationships will appear here. Start by exploring mentor profiles."
          href="/dashboard/mentorship"
          action="Discover mentors"
        />
      )}
    </>
  );
}
export function StudentOverview() {
  const { data } = useWorkspace();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  if (!data) return null;
  const profile = data.profile;
  const recommended = [
    ...data.opportunities.map((i) => ({ i, kind: "opportunities" as Module })),
    ...data.projects.map((i) => ({ i, kind: "projects" as Module })),
    ...data.communities.map((i) => ({ i, kind: "communities" as Module })),
    ...data.mentors.map((i) => ({ i, kind: "mentorship" as Module })),
    ...data.events
      .filter((e) => new Date(e.starts_at ?? 0) > new Date())
      .map((i) => ({ i, kind: "events" as Module })),
  ]
    .sort((a, b) => (b.i.match?.score ?? 0) - (a.i.match?.score ?? 0))
    .slice(0, 3);
  return (
    <>
      <p className="mb-2 text-[10px] font-bold tracking-[.18em] text-blue-600">
        A LITTLE PROGRESS, EVERY DAY
      </p>
      <h1 className="sw-title">
        {hour === null
          ? "Welcome"
          : hour < 12
            ? "Good morning"
            : hour < 18
              ? "Good afternoon"
              : "Good evening"}
        , {profile.full_name.split(" ")[0]}
        <span className="text-blue-600">.</span>
      </h1>
      <p className="sw-muted mt-3">
        Here’s what’s happening in your GenZnect workspace.
      </p>
      <section className="sw-card mt-7 !border-blue-100 !bg-blue-50/50">
        <div className="flex justify-between">
          <div>
            <h2 className="sw-section">Your next chapter starts with you.</h2>
            <p className="sw-muted mt-2">
              A complete profile helps the right opportunities find you.
            </p>
          </div>
          <span className="text-xl font-semibold text-blue-700">
            {profile.completion.percent}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Profile completion"
          aria-valuenow={profile.completion.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-5 h-1.5 rounded-full bg-blue-100"
        >
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${profile.completion.percent}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {profile.completion.checklist
            .filter((c) => !c.done)
            .map((c) => (
              <Link
                className="text-xs font-semibold text-blue-700"
                key={c.id}
                href={c.href}
              >
                + {c.label}
              </Link>
            ))}
        </div>
      </section>
      <section className="mt-8">
        <div className="mb-4 flex justify-between">
          <h2 className="sw-section">Recommended for you</h2>
          <Link
            className="text-xs text-blue-700"
            href="/dashboard/opportunities"
          >
            Explore all →
          </Link>
        </div>
        {recommended.length ? (
          <div className="grid gap-4">
            {recommended.map(({ i, kind }) => (
              <ItemCard key={i.id} item={i} kind={kind} />
            ))}
          </div>
        ) : (
          <Empty
            title="Your next opportunity starts here"
            description="Add your skills and career preferences. Eligible opportunities from the network will appear here."
            href="/dashboard/profile?section=skills"
            action="Add your skills"
          />
        )}
      </section>
      <section className="mt-8">
        <h2 className="sw-section mb-4">Your Applications</h2>
        {data.applications.length ? (
          data.applications.slice(0, 3).map((a) => (
            <Link
              className="sw-card mb-2 flex items-center justify-between gap-3 !p-4"
              key={a.id}
              href={`/dashboard/applications/${a.id}`}
            >
              <span>
                <span className="font-semibold">{a.title}</span>
                <span className="sw-muted block">{a.organization}</span>
              </span>
              <span className="sw-chip capitalize">{label(a.status)}</span>
            </Link>
          ))
        ) : (
          <Empty
            title="No applications yet"
            description="Find a role that feels like your next step. Track every update here."
            href="/dashboard/opportunities"
          />
        )}
      </section>
      <section className="mt-8">
        <h2 className="sw-section mb-4">Recent Projects</h2>
        {data.projects.some((p) => p.joined) ? (
          data.projects
            .filter((p) => p.joined)
            .slice(0, 2)
            .map((p) => <ItemCard key={p.id} item={p} kind="projects" />)
        ) : (
          <Empty
            title="Make something you’re proud of"
            description="Join a project to collaborate and turn your skills into experience."
            href="/dashboard/projects"
            action="Explore projects"
          />
        )}
      </section>
      <section className="mt-8">
        <h2 className="sw-section mb-4">Your activity</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["applications", "projects", "events", "communities"].map((k) => (
            <Link href={`/dashboard/${k}`} className="sw-card !p-4" key={k}>
              <p className="text-2xl font-semibold">{data.counts[k]}</p>
              <p className="sw-muted capitalize">{k}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="sw-card mt-6">
        <h2 className="sw-section">Continue your journey</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            ["Complete profile", "profile"],
            ["Find an opportunity", "opportunities"],
            ["Join a community", "communities"],
            ["Register for an event", "events"],
            ["Discover mentors", "mentorship"],
          ].map(([title, key]) => (
            <Link
              key={key}
              href={`/dashboard/${key}`}
              className="sw-button sw-secondary"
            >
              {title} →
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
