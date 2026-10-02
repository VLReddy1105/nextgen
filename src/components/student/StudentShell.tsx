"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Compass,
  FileCheck2,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { GenZnectLogo } from "@/components/brand/GenZnectLogo";
import {
  WorkspaceGate,
  WorkspaceProvider,
  useWorkspace,
} from "./WorkspaceProvider";
import { workspaceApi } from "@/lib/api/workspace";
import "./student.css";

const links = [
  { key: "overview", name: "Overview", icon: LayoutDashboard },
  { key: "my-university", name: "My University", icon: GraduationCap },
  {
    key: "opportunities",
    name: "Opportunities",
    icon: BriefcaseBusiness,
    sub: [
      "All Opportunities",
      "Jobs",
      "Internships",
      "Projects",
      "Competitions",
      "Hiring Drives",
      "Saved",
    ],
    values: [
      "",
      "job",
      "internship",
      "project",
      "competition",
      "hiring_drive",
      "saved",
    ],
  },
  {
    key: "applications",
    name: "Applications",
    icon: FileCheck2,
    sub: [
      "All Applications",
      "Applied",
      "Shortlisted",
      "Interviews",
      "Selected",
      "Rejected",
      "Withdrawn",
    ],
    values: [
      "",
      "applied",
      "shortlisted",
      "interview",
      "selected",
      "rejected",
      "withdrawn",
    ],
  },
  {
    key: "projects",
    name: "Projects",
    icon: FolderKanban,
    sub: ["My Projects", "Discover Projects", "My Tasks", "Team Members"],
    values: ["mine", "discover", "tasks", "team"],
  },
  {
    key: "communities",
    name: "Communities",
    icon: UsersRound,
    sub: [
      "Discover Communities",
      "My Communities",
      "Community Feed",
      "My Posts",
    ],
    values: ["discover", "mine", "feed", "posts"],
  },
  {
    key: "events",
    name: "Events",
    icon: CalendarDays,
    sub: ["Discover Events", "Registered", "Upcoming", "Past Events"],
    values: ["discover", "registered", "upcoming", "past"],
  },
  {
    key: "mentorship",
    name: "Mentorship",
    icon: Compass,
    sub: ["Discover Mentors", "My Mentors", "Sessions"],
    values: ["discover", "mine", "sessions"],
  },
  {
    key: "ai-tools",
    name: "AI Tools",
    icon: Sparkles,
    sub: ["Resume Builder", "Job Search Tool", "Tools for You"],
    values: ["resume", "jobs", "tools"],
  },
  { key: "notifications", name: "Notifications", icon: Bell },
  { key: "profile", name: "My Profile", icon: UserRound },
  { key: "settings", name: "Settings", icon: Settings },
  { key: "help", name: "Help & Support", icon: HelpCircle },
];
function roleLinks(role: string) {
  if (role === "student") return links;
  const keys =
    role === "mentor"
      ? [
          "overview",
          "profile",
          "connections",
          "sessions",
          "communities",
          "notifications",
          "settings",
        ]
      : role === "university"
        ? [
            "overview",
            "students",
            "opportunities",
            "events",
            "projects",
            "communities",
            "announcements",
            "notifications",
            "profile",
            "settings",
          ]
        : [
            "overview",
            "opportunities",
            "applications",
            "projects",
            "communities",
            "events",
            "notifications",
            "profile",
            "settings",
          ];
  return keys.map((key) => {
    const base = links.find((l) => l.key === key) || {
      key,
      name: key[0].toUpperCase() + key.slice(1),
      icon: UsersRound,
    };
    if (key === "opportunities")
      return {
        ...base,
        sub: ["All opportunities", "Draft", "Published", "Closed"],
        values: ["", "draft", "published", "closed"],
      };
    if(key==='projects'||key==='communities')return {...base,sub:[key==='projects'?'My Projects':'My Communities',key==='projects'?'Discover Projects':'Discover Communities'],values:['mine','discover']};
    if (key === "profile")
      return {
        ...base,
        name:
          role === "mentor"
            ? "My Profile"
            : role === "university"
              ? "University Profile"
              : role === "founder"
                ? "Founder Profile"
                : "Company Profile",
      };
    return base;
  });
}
function AccountMenu({ name, initials }: { name: string; initials: string }) {
  const { data } = useWorkspace();
  return (
    <details className="relative">
      <summary className="flex min-h-12 list-none items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{name}</span>
          <span className="text-[11px] text-slate-500 capitalize">
            {data?.profile.primary_role || "Account"}
          </span>
        </span>
        <ChevronDown className="size-3" />
      </summary>
      <div className="absolute bottom-full left-0 z-40 mb-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        {[
          ["Profile", "/dashboard/profile"],
          ["Account", "/dashboard/settings?section=account"],
          ["Verification", "/dashboard/settings?section=verification"],
          ["Settings", "/dashboard/settings"],
        ].map(([label, href]) => (
          <Link
            className="block rounded-lg px-3 py-2 hover:bg-blue-50"
            key={label}
            href={href}
          >
            {label}
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button className="w-full rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50">
            Logout
          </button>
        </form>
      </div>
    </details>
  );
}
function Sidebar({
  name,
  initials,
  onClose,
}: {
  name: string;
  initials: string;
  onClose?: () => void;
}) {
  const pathname = usePathname(),
    { data } = useWorkspace();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex h-full flex-col bg-white px-4 pb-4 pt-6">
      <div className="flex items-start justify-between px-2">
        <div>
          <GenZnectLogo />
          <p className="mt-3 text-[9px] font-bold tracking-[.19em] text-slate-400">
            {data?.profile.primary_role.toUpperCase() || "YOUR"} WORKSPACE
          </p>
        </div>
        {onClose ? (
          <button aria-label="Close navigation" onClick={onClose}>
            <X className="size-5" />
          </button>
        ) : null}
      </div>
      <nav
        aria-label="Workspace navigation"
        className="mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto"
      >
        {roleLinks(data?.profile.primary_role || "student").map(
          (item, index) => {
            const active =
                pathname === `/dashboard/${item.key}` ||
                pathname.startsWith(`/dashboard/${item.key}/`),
              open = expanded === item.key;
            const count =
              item.key === "notifications"
                ? data?.counts.notifications
                : (data?.counts[item.key] ?? 0);
            return (
              <div
                key={item.key}
                className={
                  index === 10 ? "mt-5 border-t border-slate-100 pt-5" : ""
                }
              >
                <div
                  className={`flex items-center rounded-xl ${active ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  <Link
                    onClick={onClose}
                    href={`/dashboard/${item.key}`}
                    className="flex min-h-10 min-w-0 flex-1 items-center gap-3 px-3 text-[12px] font-semibold"
                  >
                    <item.icon className="size-[17px] shrink-0" />
                    {item.name}
                    {item.key === "ai-tools" ? (
                      <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[8px] text-teal-700">
                        NEW
                      </span>
                    ) : count ? (
                      <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[10px] text-slate-600">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                  {item.key !== "notifications" &&
                  (data?.module_unread[item.key] ?? 0) > 0 ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-blue-600"
                      title={`${data?.module_unread[item.key]} unread updates`}
                      aria-label={`${data?.module_unread[item.key]} unread updates`}
                    />
                  ) : null}
                  {item.sub ? (
                    <button
                      className="min-h-10 px-2"
                      aria-label={`Expand ${item.name}`}
                      aria-expanded={open}
                      onClick={() => setExpanded(open ? null : item.key)}
                    >
                      {open ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronRight className="size-3" />
                      )}
                    </button>
                  ) : null}
                </div>
                {open && item.sub ? (
                  <div className="ml-5 mt-1 border-l border-slate-100 pl-5">
                    {item.sub.map((sub, i) => (
                      <Link
                        onClick={onClose}
                        className="block rounded py-2 text-[11px] text-slate-500 hover:text-blue-700"
                        key={sub}
                        href={`/dashboard/${item.key}?view=${item.values?.[i] ?? ""}${item.key === "ai-tools" ? `#${item.values?.[i]}` : ""}`}
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          },
        )}
      </nav>
      <div className="mt-5 border-t border-slate-100 pt-3">
        {data?.profile.primary_role === "student" ? (
          <Link
            href="/dashboard/profile"
            className="mb-3 block px-2 text-[10px] text-slate-500"
          >
            Profile {data.profile.completion.percent}% · Complete profile
            <div className="mt-2 h-1 rounded-full bg-slate-100">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{ width: `${data.profile.completion.percent}%` }}
              />
            </div>
          </Link>
        ) : null}
        <AccountMenu
          name={data?.profile.full_name || name}
          initials={initials}
        />
      </div>
    </div>
  );
}
function ContextPanel() {
  const { data } = useWorkspace();
  if (!data) return null;
  if (data.profile.primary_role !== "student")
    return (
      <aside aria-label="Workspace context" className="sw-context">
        <section className="sw-card">
          <h2 className="sw-section">Recent updates</h2>
          {data.notifications.slice(0, 5).map((n) => (
            <Link className="mt-4 block text-sm" href={n.action_url} key={n.id}>
              {n.title}
            </Link>
          ))}
          {!data.notifications.length && (
            <p className="sw-muted mt-3">
              Updates from your connections will appear here.
            </p>
          )}
        </section>
        <section className="sw-card">
          <h2 className="sw-section">Next steps</h2>
          <Link
            className="sw-button mt-4"
            href={
              data.profile.primary_role === "mentor"
                ? "/dashboard/connections"
                : "/dashboard/projects"
            }
          >
            Manage connections
          </Link>
        </section>
      </aside>
    );
  const now = new Date(),
    today = now.toDateString();
  const schedule = [
    ...data.events.filter((e) => e.status !== "cancelled"),
    ...data.sessions,
    ...data.applications
      .filter((a) => a.interview_at)
      .map((a) => ({ ...a, starts_at: a.interview_at })),
  ].filter(
    (e) => e.starts_at && new Date(e.starts_at).toDateString() === today,
  );
  const deadlines = [
    ...data.opportunities.map((o) => ({
      ...o,
      href: `/dashboard/opportunities/${o.id}`,
    })),
    ...data.projects.flatMap((p) =>
      (p.tasks ?? [])
        .filter((t) => t.status !== "done")
        .map((t) => ({ ...t, href: `/dashboard/projects/${p.id}?tab=tasks` })),
    ),
    ...data.events
      .filter((e) => e.registered)
      .map((e) => ({ ...e, href: `/dashboard/events/${e.id}` })),
  ]
    .filter((e) => e.deadline && new Date(e.deadline) > now)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, 3);
  return (
    <aside aria-label="Workspace context" className="sw-context">
      {[
        [
          "TODAY",
          <div key="today">
            {schedule.length ? (
              schedule.slice(0, 2).map((e) => (
                <div key={e.id} className="mt-3">
                  <p className="text-sm font-semibold">{e.title}</p>
                  <p className="sw-muted">
                    {new Date(e.starts_at!).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <Link
                    href={
                      e.interview_at
                        ? `/dashboard/applications/${e.id}`
                        : data.sessions.some((s) => s.id === e.id)
                          ? "/dashboard/mentorship?view=sessions"
                          : `/dashboard/events/${e.id}`
                    }
                    className="mt-2 inline-block text-xs font-semibold text-blue-700"
                  >
                    View details →
                  </Link>
                </div>
              ))
            ) : (
              <>
                <p className="mt-3 text-sm font-semibold">
                  Room for your next step
                </p>
                <p className="sw-muted mt-2">
                  No events, sessions or interviews today.
                </p>
                <Link
                  className="mt-3 inline-block text-xs font-semibold text-blue-700"
                  href="/dashboard/events"
                >
                  Explore events →
                </Link>
              </>
            )}
          </div>,
        ],
        [
          "APPLICATIONS",
          <div key="apps">
            <p className="mt-3 text-2xl font-semibold">
              {data.counts.applications}
              <span className="ml-2 text-xs font-normal text-slate-500">
                active
              </span>
            </p>
            {data.applications
              .filter(
                (a) =>
                  !["selected", "rejected", "withdrawn"].includes(
                    a.status ?? "",
                  ),
              )
              .slice(0, 2)
              .map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/applications/${a.id}`}
                  className="mt-3 flex justify-between gap-2 text-xs"
                >
                  <span className="truncate">{a.title}</span>
                  <span className="text-blue-600">{a.status}</span>
                </Link>
              ))}
            <Link
              href="/dashboard/applications"
              className="mt-4 inline-block text-xs font-semibold text-blue-700"
            >
              View applications →
            </Link>
          </div>,
        ],
        [
          "DEADLINES",
          <div key="deadlines">
            {deadlines.length ? (
              deadlines.map((d) => (
                <Link
                  href={d.href}
                  key={d.id}
                  className="mt-3 block text-xs font-medium hover:text-blue-700"
                >
                  {d.title}
                  <span className="sw-muted block">
                    {new Date(d.deadline!).toLocaleDateString()}
                  </span>
                </Link>
              ))
            ) : (
              <p className="sw-muted mt-3">
                No approaching deadlines. Your next opportunity is waiting to be
                discovered.
              </p>
            )}
          </div>,
        ],
        [
          "QUICK ACTIONS",
          <div key="actions" className="mt-3 space-y-1">
            {[
              ["Apply for an opportunity", "opportunities"],
              ["Explore a project", "projects"],
              ["Join a community", "communities"],
              ["Register for an event", "events"],
            ].map(([label, key]) => (
              <Link
                className="flex items-center justify-between rounded-lg py-2 text-xs font-medium hover:text-blue-700"
                key={key}
                href={`/dashboard/${key}`}
              >
                {label}
                <ArrowUpRight className="size-3" />
              </Link>
            ))}
          </div>,
        ],
      ].map(([label, content]) => (
        <section className="sw-card" key={String(label)}>
          <h2 className="text-[10px] font-bold tracking-[.13em] text-slate-400">
            {label}
          </h2>
          {content}
        </section>
      ))}
    </aside>
  );
}
export function StudentWorkspaceFrame({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; initials: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    { data, mutate } = useWorkspace();
  const [noticeError, setNoticeError] = useState("");
  return (
    <div className="student-workspace">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[230px] border-r border-slate-200/70 lg:block">
        <Sidebar {...user} />
      </div>
      <dialog
        ref={dialog}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[280px] max-w-[90vw] p-0 backdrop:bg-slate-950/40"
      >
        <Sidebar {...user} onClose={() => dialog.current?.close()} />
      </dialog>
      <div className="sw-body">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/95 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => dialog.current?.showModal()}
            >
              <Menu className="size-5" />
            </button>
            <span className="text-xs text-slate-400">
              Workspace <span className="px-2">/</span>
              <span className="font-medium capitalize text-slate-700">
                {data?.profile.primary_role}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <details className="relative">
              <summary
                aria-label={`${data?.counts.notifications ?? 0} unread notifications`}
                className="relative grid size-10 cursor-pointer list-none place-items-center rounded-full hover:bg-slate-50"
              >
                <Bell className="size-[18px] text-slate-500" />
                {data?.counts.notifications ? (
                  <span className="absolute right-0 top-0 rounded-full bg-blue-600 px-1.5 text-[10px] text-white">
                    {data.counts.notifications}
                  </span>
                ) : null}
              </summary>
              <div className="absolute right-0 mt-3 w-[min(320px,85vw)] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <h2 className="font-semibold">Notifications</h2>
                {noticeError ? <p role="alert">{noticeError}</p> : null}
                {data?.notifications.slice(0, 4).map((n) => (
                  <Link
                    key={n.id}
                    href={n.action_url}
                    onClick={() =>
                      void mutate(() => workspaceApi.read(n.id)).catch((e) =>
                        setNoticeError(e.message),
                      )
                    }
                    className="mt-3 block border-b border-slate-100 pb-3 text-xs"
                  >
                    <span
                      className={
                        !n.read_at ? "font-semibold" : "text-slate-500"
                      }
                    >
                      {n.title}
                    </span>
                  </Link>
                ))}
                {!data?.notifications.length ? (
                  <p className="sw-muted mt-3">You’re all caught up.</p>
                ) : null}
                <Link
                  href="/dashboard/notifications"
                  className="mt-3 block text-xs font-semibold text-blue-700"
                >
                  View all notifications →
                </Link>
              </div>
            </details>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 text-xs font-semibold"
            >
              <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-[10px] text-white">
                {user.initials}
              </span>
              <span className="hidden sm:inline">
                {data?.profile.full_name || user.name}
              </span>
            </Link>
          </div>
        </header>
        <div className="sw-grid">
          <main className="min-w-0">
            <WorkspaceGate>{children}</WorkspaceGate>
          </main>
          <ContextPanel />
        </div>
      </div>
    </div>
  );
}
export function StudentShell(props: {
  children: React.ReactNode;
  user: { name: string; initials: string };
}) {
  return (
    <WorkspaceProvider>
      <StudentWorkspaceFrame {...props} />
    </WorkspaceProvider>
  );
}
