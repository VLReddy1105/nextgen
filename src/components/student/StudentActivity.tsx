"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { workspaceApi } from "@/lib/api/workspace";
import type { Item } from "@/lib/api/types";
import { useWorkspace } from "./WorkspaceProvider";
import { Action, Empty, label } from "./StudentModules";

export function StudentActivity({
  kind,
  view,
}: {
  kind: "projects" | "communities";
  view: string;
}) {
  const { data } = useWorkspace();
  const [items, setItems] = useState<Item[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!data) return;
    try {
      setItems(
        await Promise.all(
          data[kind]
            .filter((i) => i.joined)
            .map((i) => workspaceApi.detail(kind, i.id)),
        ),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [data, kind]);
  useEffect(() => {
    void load();
  }, [load]);
  const title =
    view === "tasks"
      ? "My Tasks"
      : view === "team"
        ? "Team Members"
        : view === "posts"
          ? "My Posts"
          : "Community Feed";
  const tasks = items.flatMap((i) =>
    (i.tasks ?? [])
      .filter((t) => t.assignee_id === data?.profile.id)
      .map((t) => ({ ...t, project: i })),
  );
  const posts = items
    .flatMap((i) =>
      (i.posts ?? [])
        .filter((p) => view !== "posts" || p.author_id === data?.profile.id)
        .map((p) => ({ ...p, community: i })),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <h1 className="sw-title">{title}</h1>
      <p className="sw-muted my-5">
        Connected to the projects and communities you belong to.
      </p>
      {loading ? (
        <div
          aria-busy="true"
          className="h-48 animate-pulse rounded-xl bg-slate-100"
        />
      ) : error ? (
        <div role="alert" className="sw-card">
          {error}
          <button className="sw-button mt-3" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : view === "tasks" ? (
        tasks.length ? (
          tasks.map((t) => (
            <article key={t.id} className="sw-card mb-3">
              <Link
                className="text-xs text-blue-700"
                href={`/dashboard/projects/${t.project.id}?tab=tasks`}
              >
                {t.project.title}
              </Link>
              <h2 className="sw-section mt-3">{t.title}</h2>
              <p className="sw-muted">
                {label(t.status)}
                {t.deadline
                  ? ` · Due ${new Date(t.deadline).toLocaleDateString()}`
                  : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["todo", "in_progress", "review", "done"]
                  .filter((s) => s !== t.status)
                  .map((s) => (
                    <Action
                      secondary
                      key={s}
                      run={() => workspaceApi.task(t.id, s)}
                    >
                      {label(s)}
                    </Action>
                  ))}
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="No tasks assigned to you"
            description="Your assigned work will appear here when a project lead creates a task."
          />
        )
      ) : view === "team" ? (
        items.length ? (
          items.map((i) => (
            <section key={i.id} className="sw-card mb-3">
              <Link
                href={`/dashboard/projects/${i.id}?tab=team`}
                className="sw-section"
              >
                {i.title}
              </Link>
              {i.team?.map((m) => (
                <p className="mt-4 flex justify-between" key={m.user_id}>
                  {m.full_name}
                  <span className="sw-chip">{label(m.role)}</span>
                </p>
              ))}
            </section>
          ))
        ) : (
          <Empty
            title="Build your first team connection"
            description="Join a project to meet your collaborators."
            href="/dashboard/projects"
            action="Discover projects"
          />
        )
      ) : posts.length ? (
        posts.map((p) => (
          <article className="sw-card mb-3" key={p.id}>
            <Link
              href={`/dashboard/communities/${p.community.id}?tab=posts#post-${p.id}`}
              className="font-semibold text-blue-700"
            >
              {p.community.name}
            </Link>
            <p className="sw-muted mt-2">
              {p.community.team?.find((m) => m.user_id === p.author_id)
                ?.full_name || "Community member"}{" "}
              · {new Date(p.created_at).toLocaleString()}
            </p>
            <p className="my-4 whitespace-pre-wrap">{p.content}</p>
            <Link
              className="text-xs font-semibold text-blue-700"
              href={`/dashboard/communities/${p.community.id}?tab=posts#post-${p.id}`}
            >
              Open conversation →
            </Link>
          </article>
        ))
      ) : (
        <Empty
          title="No conversations yet"
          description="Open a community to share an idea or start a conversation."
          href="/dashboard/communities?view=mine"
          action="My communities"
        />
      )}
    </>
  );
}
