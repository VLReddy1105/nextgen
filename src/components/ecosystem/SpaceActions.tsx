"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { Item, Task } from "@/lib/api/types";
import { Action } from "@/components/student/StudentModules";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
import { CreateSpace } from "@/components/student/CreateSpace";
import { Editor } from "./Editor";
export function SpaceActions({
  kind,
  item,
  tab,
}: {
  kind: "projects" | "communities";
  item: Item;
  tab: string;
}) {
  const { data } = useWorkspace(),
    [code, setCode] = useState("");
  const manager = ["project_head", "captain"].includes(item.my_role || "");
  const pending =
    item.invitations?.filter(
      (i) =>
        i.recipient_user_id === data?.profile.id &&
        i.status === "pending" &&
        new Date(i.expires_at) > new Date(),
    ) || [];
  return (
    <div className="mt-5 space-y-4">
      {pending.map((i) => (
        <section className="sw-card" key={i.id}>
          <h2 className="sw-section">You’re invited</h2>
          <p className="sw-muted my-4">
            {i.inviter_name} invited you to join as {i.requested_role}.
            Visibility: {item.visibility}. Expires{" "}
            {new Date(i.expires_at).toLocaleDateString()}. Accepting adds this
            space to your workspace.
          </p>
          <div className="flex gap-3">
            {[true, false].map((accept) => (
              <Action
                key={String(accept)}
                secondary={!accept}
                run={() =>
                  api(`/invitations/${i.id}/decision`, "POST", { accept })
                }
              >
                {accept ? "Accept invitation" : "Decline"}
              </Action>
            ))}
          </div>
        </section>
      ))}
      {item.joined && !manager && (
        <Action
          secondary
          run={() =>
            api(
              `/relationships/${kind}/${item.id}/members/${data?.profile.id}`,
              "DELETE",
            )
          }
        >
          Leave {kind === "projects" ? "project" : "community"}
        </Action>
      )}
      {item.joined &&
        kind === "projects" &&
        item.visibility === "public" &&
        data?.profile.primary_role === "student" && (
          <div className="flex flex-wrap gap-2">
            <Action
              secondary
              run={() =>
                api(`/projects/${item.id}/portfolio`, "PUT", { enabled: true })
              }
            >
              Show on profile
            </Action>
            <Action
              secondary
              run={() =>
                api(`/projects/${item.id}/portfolio`, "PUT", { enabled: false })
              }
            >
              Hide from profile
            </Action>
          </div>
        )}
      {manager && (
        <>
          <CreateSpace kind={kind} item={item} />
          <details className="sw-card">
            <summary className="font-semibold">
              Invitations and requests
            </summary>
            <Editor
              title="Invitation"
              fields={[
                {
                  key: "email",
                  label: "Student / mentor email",
                  type: "email",
                  required: true,
                },
                {
                  key: "requested_role",
                  label: "Requested role",
                  options:
                    kind === "projects"
                      ? ["member", "team_lead", "mentor"]
                      : ["member", "moderator"],
                  required: true,
                },
              ]}
              initial={{ requested_role: "member", email: "" }}
              save={(v) =>
                api(`/relationships/${kind}/${item.id}/invitations`, "POST", v)
              }
            />
            {item.invitations?.map((i) => (
              <div key={i.id} className="sw-muted mt-3">
                {i.recipient_name} · {i.requested_role} invitation · {i.status}{" "}
                · expires {new Date(i.expires_at).toLocaleDateString()}
                {i.status === "pending" && (
                  <Action
                    secondary
                    run={() => api(`/invitations/${i.id}`, "DELETE")}
                  >
                    Cancel invitation
                  </Action>
                )}
              </div>
            ))}
            {item.requests
              ?.filter((r) => r.status === "pending")
              .map((r) => (
                <div
                  className="mt-4 flex flex-wrap items-center gap-3"
                  key={r.id}
                >
                  <p className="text-sm">{r.full_name} requested to join</p>
                  <Action
                    run={() =>
                      api(`/join-requests/${r.id}/decision`, "POST", {
                        accept: true,
                      })
                    }
                  >
                    Approve
                  </Action>
                  <Action
                    secondary
                    run={() =>
                      api(`/join-requests/${r.id}/decision`, "POST", {
                        accept: false,
                      })
                    }
                  >
                    Decline
                  </Action>
                </div>
              ))}
          </details>
          {kind === "projects" && (
            <details className="sw-card">
              <summary className="font-semibold">Invite code / link</summary>
              <Editor
                title="Invite code"
                fields={[
                  {
                    key: "days",
                    label: "Expires in days",
                    type: "number",
                    min: 1,
                    max: 30,
                    required: true,
                  },
                  {
                    key: "usage_limit",
                    label: "Maximum uses",
                    type: "number",
                    min: 1,
                    max: 100,
                    required: true,
                  },
                ]}
                initial={{ days: 7, usage_limit: 10 }}
                save={async (v) => {
                  const r = await api<{ token: string }>(
                    `/projects/${item.id}/codes`,
                    "POST",
                    v,
                  );
                  setCode(r.token);
                }}
              />
              {code && (
                <div className="mt-4 rounded-xl bg-blue-50 p-4">
                  <p className="text-sm">
                    Copy this link now. The code is shown only once.
                  </p>
                  <input
                    aria-label="Invitation link"
                    readOnly
                    className="sw-input mt-3"
                    value={`${window.location.origin}/dashboard/project-invite?code=${encodeURIComponent(code)}`}
                  />
                </div>
              )}
              {item.codes?.map((c) => (
                <div
                  key={c.id}
                  className="mt-4 flex flex-wrap items-center gap-3"
                >
                  <p className="sw-muted">
                    {c.uses}/{c.usage_limit} uses · expires{" "}
                    {new Date(c.expires_at).toLocaleDateString()}{" "}
                    {c.revoked_at ? "· Revoked" : ""}
                  </p>
                  {!c.revoked_at && (
                    <Action
                      secondary
                      run={() => api(`/project-codes/${c.id}`, "DELETE")}
                    >
                      Revoke
                    </Action>
                  )}
                </div>
              ))}
            </details>
          )}
          {tab === "team" && (
            <section className="sw-card">
              <h2 className="sw-section">Manage team</h2>
              {item.team
                ?.filter((m) => !["project_head", "captain"].includes(m.role))
                .map((m) => (
                  <div
                    className="mt-3 flex flex-wrap items-center justify-between gap-3"
                    key={m.user_id}
                  >
                    <p>
                      {m.full_name} · {m.role}
                    </p>
                    <Action
                      secondary
                      run={() =>
                        api(
                          `/relationships/${kind}/${item.id}/members/${m.user_id}`,
                          "DELETE",
                        )
                      }
                    >
                      Remove member
                    </Action>
                  </div>
                ))}
            </section>
          )}
        </>
      )}
      {kind === "projects" && tab === "tasks" && item.joined && (
        <>
          {manager && (
            <details className="sw-card">
              <summary>Create task</summary>
              <TaskForm item={item} />
            </details>
          )}
          {item.tasks
            ?.filter((t) => manager || t.assignee_id === data?.profile.id)
            .map((t) => (
              <details key={t.id} className="sw-card">
                <summary>Edit {t.title}</summary>
                <TaskForm item={item} task={t} />
              </details>
            ))}
        </>
      )}
    </div>
  );
}
function TaskForm({ item, task }: { item: Item; task?: Task }) {
  return (
    <Editor
      title="Task"
      fields={[
        { key: "title", label: "Title", required: true },
        { key: "description", label: "Description", type: "textarea" },
        ...(item.my_role === "project_head"
          ? [
              {
                key: "assignee_id",
                label: "Assignee (team account)",
                options: item.team?.map((m) => m.user_id),
                optionLabels: Object.fromEntries(
                  item.team?.map((m) => [m.user_id, m.full_name]) || [],
                ),
              },
              {
                key: "priority",
                label: "Priority",
                options: ["low", "medium", "high", "urgent"],
              },
              { key: "deadline", label: "Due date", type: "datetime-local" },
            ]
          : []),
        {
          key: "status",
          label: "Status",
          options: ["todo", "in_progress", "review", "done"],
        },
      ]}
      initial={{
        title: task?.title || "",
        description: task?.description || "",
        assignee_id: task?.assignee_id || "",
        priority: task?.priority || "medium",
        deadline: task?.deadline?.slice(0, 16) || "",
        status: task?.status || "todo",
      }}
      save={(v) =>
        api(
          `/projects/${item.id}/tasks${task ? "/" + task.id : ""}`,
          task ? "PATCH" : "POST",
          {
            ...v,
            assignee_id: v.assignee_id || null,
            deadline:
              item.my_role !== "project_head"
                ? task?.deadline || null
                : v.deadline
                  ? new Date(String(v.deadline)).toISOString()
                  : null,
          },
        )
      }
    />
  );
}
export function ProjectInvite() {
  const router = useRouter();
  const [token, setToken] = useState(""),
    [preview, setPreview] = useState<Item | null>(null);
  return (
    <>
      <h1 className="sw-title">Project invitation</h1>
      <p className="sw-muted mt-3">
        Preview the project, then confirm whether you want to join as a member.
      </p>
      <Editor
        title="Preview"
        fields={[{ key: "token", label: "Invitation code", required: true }]}
        initial={{
          token:
            typeof window === "undefined"
              ? ""
              : new URLSearchParams(window.location.search).get("code") || "",
        }}
        save={async (v) => {
          setToken(String(v.token));
          setPreview(await api<Item>("/project-codes/preview", "POST", v));
        }}
      />
      {preview && (
        <section className="sw-card mt-5">
          <h2 className="sw-section">{preview.title}</h2>
          <p className="sw-muted mt-3">
            {preview.description} · {preview.visibility} · Member role
          </p>
          <Action
            run={async () => {
              const joined = await api<{ id: string }>(
                "/project-codes/accept",
                "POST",
                { token },
              );
              router.push(`/dashboard/projects/${joined.id}`);
              setPreview(null);
            }}
          >
            Accept and join
          </Action>
        </section>
      )}
    </>
  );
}
