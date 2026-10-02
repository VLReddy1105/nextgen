"use client";
import Link from "next/link";
import { SpaceActions } from "@/components/ecosystem/SpaceActions";
import { Publishing } from "@/components/ecosystem/Publishing";
import { Editor } from "@/components/ecosystem/Editor";
import { api } from "@/lib/api/client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { workspaceApi } from "@/lib/api/workspace";
import type { Item, Module, Post } from "@/lib/api/types";
import { useWorkspace } from "./WorkspaceProvider";
import { ResourceEditor } from "./ResourceEditor";
import { Action, Empty, ItemCard, label } from "./StudentModules";

export function StudentDetail({ kind, id }: { kind: Module; id: string }) {
  const [item, setItem] = useState<Item | null>(null),
    [error, setError] = useState("");
  const search = useSearchParams(),
    { data } = useWorkspace();
  const load = useCallback(async () => {
    try {
      setItem(await workspaceApi.detail(kind, id));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this item.");
    }
  }, [kind, id]);
  useEffect(() => {
    void load();
  }, [load, data]);
  if (error)
    return (
      <div role="alert" className="sw-card">
        <p>{error}</p>
        <button className="sw-button mt-4" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  if (!item)
    return (
      <div
        aria-busy="true"
        className="h-64 animate-pulse rounded-2xl bg-slate-100"
      />
    );
  const tab =
    search.get("tab") || (kind === "communities" ? "posts" : "overview");
  const tabs =
    kind === "projects"
      ? ["overview", "tasks", "team", "files", "activity"]
      : kind === "communities"
        ? ["posts", "events", "projects", "resources"]
        : [];
  return (
    <>
      <Link
        className="text-xs font-semibold text-blue-700"
        href={`/dashboard/${kind}`}
      >
        ← Back to {kind}
      </Link>
      <div className="mt-5">
        <ItemCard
          item={{
            ...data?.[kind === "mentorship" ? "mentors" : kind]?.find(
              (i) => i.id === id,
            ),
            ...item,
          }}
          kind={kind}
        />
      </div>
      {item.description || item.bio ? (
        <p className="sw-card mt-5 whitespace-pre-wrap leading-7 text-slate-600">
          {item.description || item.bio}
        </p>
      ) : null}
      {(kind === "projects" || kind === "communities") && (
        <SpaceActions kind={kind} item={item} tab={tab} />
      )}
      {(kind === "opportunities" || kind === "events") &&
        data?.profile.primary_role !== "student" && (
          <Publishing kind={kind} item={item} />
        )}
      {kind === "applications" && data?.profile.primary_role !== "student" && (
        <>
          <section className="sw-card mt-5">
            <h2 className="sw-section">{item.applicant?.full_name}</h2>
            <p className="sw-muted mt-2">{item.applicant?.headline}</p>
            <p className="mt-3 text-sm">
              {item.applicant?.degree_level} · {item.applicant?.field_of_study}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.applicant?.skills.map((s) => (
                <span className="sw-chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </section>
          <Editor
            title="Application status"
            fields={[
              {
                key: "status",
                label: "Status",
                options: [
                  "reviewed",
                  "shortlisted",
                  "interview",
                  "selected",
                  "rejected",
                ],
                required: true,
              },
              { key: "note", label: "Next step / note", type: "textarea" },
              {
                key: "interview_at",
                label: "Interview date",
                type: "datetime-local",
              },
            ]}
            initial={{
              status: item.status || "reviewed",
              note: "",
              interview_at: "",
            }}
            save={(v) =>
              api(`/applications/${id}/status`, "PATCH", {
                ...v,
                interview_at: v.interview_at
                  ? new Date(String(v.interview_at)).toISOString()
                  : null,
              })
            }
          />
        </>
      )}
      {kind === "mentorship" && data?.profile.primary_role === "student" && (
        <div className="mt-4">
          <Action run={() => api(`/mentorship/${id}/request`, "POST")}>
            Request mentorship
          </Action>
        </div>
      )}
      {kind === "communities" &&
        tab === "events" &&
        item.my_role === "captain" && (
          <details className="sw-card mt-5">
            <summary>Create community event</summary>
            <Publishing kind="events" communityId={item.id} />
          </details>
        )}
      {tabs.length ? (
        <nav aria-label="Workspace tabs" className="my-5 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t}
              href={`/dashboard/${kind}/${id}?tab=${t}`}
              aria-current={tab === t ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-xs font-semibold capitalize ${tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
            >
              {t}
            </Link>
          ))}
        </nav>
      ) : null}
      {(kind === "projects" || kind === "communities") &&
      item.joined &&
      tab !== "tasks" ? (
        <ResourceEditor
          item={item}
          kind={kind}
          tab={tab}
          manager={
            !!item.team?.some(
              (m) =>
                m.user_id === data?.profile.id &&
                ["project_head", "captain"].includes(m.role),
            )
          }
        />
      ) : null}
      {kind === "applications" ? (
        <section className="sw-card mt-5">
          <h2 className="sw-section">Application timeline</h2>
          <ol className="mt-5 space-y-5 border-l border-blue-100 pl-5">
            {item.history?.map((h) => (
              <li key={h.id}>
                <p className="font-semibold capitalize">✓ {label(h.status)}</p>
                <time className="sw-muted">
                  {new Date(h.created_at).toLocaleString()}
                </time>
                {h.note ? <p className="mt-2 text-sm">{h.note}</p> : null}
              </li>
            ))}
          </ol>
          {item.next_step ? (
            <p className="mt-5 rounded-xl bg-blue-50 p-4">
              Next step: {item.next_step}
            </p>
          ) : null}
          {item.interview_at ? (
            <p className="mt-4">
              Interview: {new Date(item.interview_at).toLocaleString()}
            </p>
          ) : null}
          {data?.profile.primary_role === "student" &&
          !["selected", "rejected", "withdrawn"].includes(item.status ?? "") ? (
            <div className="mt-6">
              <Action secondary run={() => workspaceApi.withdraw(id)}>
                Withdraw application
              </Action>
            </div>
          ) : null}
        </section>
      ) : null}
      {kind === "projects" && item.joined ? (
        <section className="sw-card mt-4">
          {tab === "tasks" ? (
            <>
              <h2 className="sw-section mb-5">Task board</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {["todo", "in_progress", "review", "done"].map((state) => (
                  <div key={state} className="rounded-xl bg-slate-50 p-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider">
                      {label(state)}
                    </h3>
                    {item.tasks
                      ?.filter((t) => t.status === state)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="mt-3 rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-medium">{t.title}</p>
                          {t.deadline ? (
                            <p className="sw-muted">
                              Due {new Date(t.deadline).toLocaleDateString()}
                            </p>
                          ) : null}
                          {t.assignee_id === data?.profile.id ||
                          item.team?.some(
                            (m) =>
                              m.user_id === data?.profile.id &&
                              m.role === "project_head",
                          ) ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {["todo", "in_progress", "review", "done"]
                                .filter((s) => s !== state)
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
                          ) : null}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
              {!item.tasks?.length ? (
                <p className="sw-muted mt-4">
                  No tasks assigned yet. Your project lead can add tasks.
                </p>
              ) : null}
            </>
          ) : tab === "team" ? (
            <>
              <h2 className="sw-section">Team</h2>
              {item.team?.map((m) => (
                <div
                  key={m.user_id}
                  className="mt-4 flex justify-between border-b border-slate-100 pb-3"
                >
                  <span>{m.full_name}</span>
                  <span className="sw-chip">{label(m.role)}</span>
                </div>
              ))}
            </>
          ) : tab === "files" ? (
            <>
              <h2 className="sw-section">Project files</h2>
              {item.files?.length ? (
                item.files.map((f) => (
                  <a
                    key={f.id}
                    className="mt-4 block text-blue-700"
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {f.name} ↗
                  </a>
                ))
              ) : (
                <p className="sw-muted mt-3">
                  No files shared with this team yet.
                </p>
              )}
            </>
          ) : tab === "activity" ? (
            <>
              <h2 className="sw-section">Activity</h2>
              {item.activity?.length ? (
                item.activity.map((a) => (
                  <p className="mt-4" key={a.id}>
                    {a.message}
                    <span className="sw-muted block">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </p>
                ))
              ) : (
                <p className="sw-muted mt-3">
                  Project updates will be recorded here.
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="sw-section">Build your next chapter</h2>
              <p className="sw-muted mt-3">
                {item.team?.length ?? 0} team members ·{" "}
                {item.tasks?.filter((t) => t.status === "done").length ?? 0}/
                {item.tasks?.length ?? 0} tasks complete
              </p>
              <Link
                className="sw-button mt-4"
                href={`/dashboard/projects/${id}?tab=tasks`}
              >
                Open tasks →
              </Link>
            </>
          )}
        </section>
      ) : null}
      {kind === "communities" && item.joined ? (
        <section className="mt-5">
          {tab === "events" || tab === "projects" ? (
            <div className="space-y-4">
              {item[tab]?.length ? (
                item[tab]?.map((r) => (
                  <ItemCard key={r.id} item={r} kind={tab} />
                ))
              ) : (
                <Empty
                  title={`No ${tab} shared yet`}
                  description="Content shared with this community will appear here."
                />
              )}
            </div>
          ) : tab === "resources" ? (
            <div className="sw-card">
              <h2 className="sw-section">Resources</h2>
              {item.resources?.length ? (
                item.resources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block text-blue-700"
                  >
                    {r.title} ↗
                  </a>
                ))
              ) : (
                <p className="sw-muted mt-4">No resources shared yet.</p>
              )}
            </div>
          ) : (
            <CommunityFeed item={item} id={id} />
          )}
        </section>
      ) : null}
      {kind === "mentorship" ? (
        <section className="sw-card mt-5">
          <h2 className="sw-section">Expertise & background</h2>
          <p className="sw-muted mt-4">
            {item.current_position}
            {item.company ? ` · ${item.company}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.expertise?.map((t) => (
              <span className="sw-chip" key={t}>
                {t}
              </span>
            ))}
          </div>
          <p className="sw-muted mt-5">
            Mentor discovery is read-only in this release. Ratings and session
            availability are shown only when supported by real records.
          </p>
        </section>
      ) : null}
    </>
  );
}
function Composer({
  id,
  post,
  parent,
  team,
}: {
  id: string;
  post?: string;
  parent?: string;
  team: Item["team"];
}) {
  const [content, setContent] = useState(""),
    [mentions, setMentions] = useState<string[]>([]);
  return (
    <div className="sw-card my-4">
      <label className="sw-label">
        {parent
          ? "Write a reply"
          : post
            ? "Add a comment"
            : "Start a conversation"}
        <textarea
          className="sw-input"
          rows={3}
          maxLength={2000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an idea, ask a question, or offer a little help…"
        />
      </label>
      <label className="sw-label mt-3 block">
        Mention members
        <select
          aria-label="Mention members"
          multiple
          className="sw-input"
          value={mentions}
          onChange={(e) =>
            setMentions(
              Array.from(e.target.selectedOptions)
                .map((o) => o.value)
                .slice(0, 10),
            )
          }
        >
          {team?.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-3">
        <Action
          run={async () => {
            if (!content.trim()) throw new Error("Write a message first.");
            await workspaceApi.post(id, {
              content,
              post_id: post ?? null,
              parent_id: parent ?? null,
              mentions,
            });
            setContent("");
            setMentions([]);
          }}
        >
          {post ? "Reply" : "Publish post"}
        </Action>
      </div>
    </div>
  );
}
function CommunityFeed({ item, id }: { item: Item; id: string }) {
  const { data } = useWorkspace();
  const [reply, setReply] = useState<{ post: string; parent?: string } | null>(
    null,
  );
  const name = (author: string) =>
    item.team?.find((m) => m.user_id === author)?.full_name ||
    "Community member";
  const comments = (post: Post) => (
    <div className="mt-4 border-l border-slate-200 pl-4">
      {item.comments
        ?.filter((c) => c.post_id === post.id)
        .map((c) => (
          <div
            id={`comment-${c.id}`}
            key={c.id}
            className="scroll-mt-24 border-b border-slate-100 py-3"
          >
            <p className="text-xs font-semibold">
              {name(c.author_id)}
              {c.parent_id ? " · Reply" : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{c.content}</p>
            <button
              className="mt-2 text-xs text-blue-700"
              onClick={() => setReply({ post: post.id, parent: c.id })}
            >
              Reply
            </button>
          </div>
        ))}
    </div>
  );
  return (
    <>
      <Composer id={id} team={item.team} />
      {item.posts?.length ? (
        item.posts.map((p) => (
          <article
            id={`post-${p.id}`}
            key={p.id}
            className="sw-card mb-4 scroll-mt-24"
          >
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{name(p.author_id)}</span>
              <time className="text-slate-400">
                {new Date(p.created_at).toLocaleString()}
              </time>
            </div>
            <p className="my-5 whitespace-pre-wrap leading-7">{p.content}</p>
            <div className="flex gap-3">
              <Action
                secondary
                run={() =>
                  workspaceApi.like(
                    p.id,
                    !item.reactions?.some(
                      (r) =>
                        r.post_id === p.id && r.user_id === data?.profile.id,
                    ),
                  )
                }
              >
                {item.reactions?.some(
                  (r) => r.post_id === p.id && r.user_id === data?.profile.id,
                )
                  ? "Liked"
                  : "Like"}{" "}
                ·{" "}
                {item.reactions?.filter((r) => r.post_id === p.id).length ?? 0}
              </Action>
              <button
                className="sw-button sw-secondary"
                onClick={() => setReply({ post: p.id })}
              >
                Comment
              </button>
            </div>
            {comments(p)}
            {reply?.post === p.id ? (
              <Composer
                id={id}
                post={p.id}
                parent={reply.parent}
                team={item.team}
              />
            ) : null}
          </article>
        ))
      ) : (
        <Empty
          title="Be the first to say hello"
          description="Share something useful with your community. Keep conversations professional, kind and constructive."
        />
      )}
    </>
  );
}
