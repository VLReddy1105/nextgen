"use client";
import { useState } from "react";
import { workspaceApi } from "@/lib/api/workspace";
import type { Item } from "@/lib/api/types";
import { Action } from "./StudentModules";

export function ResourceEditor({
  item,
  kind,
  tab,
  manager,
}: {
  item: Item;
  kind: "projects" | "communities";
  tab: string;
  manager: boolean;
}) {
  const [title, setTitle] = useState(""),
    [url, setUrl] = useState(""),
    [assignee, setAssignee] = useState(""),
    [deadline, setDeadline] = useState("");
  const resource =
    kind === "projects" ? (tab === "tasks" ? "task" : "file") : "resource";
  const showResource =
    kind === "projects"
      ? tab === "files" || (tab === "tasks" && manager)
      : tab === "resources" && manager;
  return (
    <>
      {showResource ? (
        <details className="sw-card mt-4">
          <summary className="font-semibold">
            {resource === "task"
              ? "Create a task"
              : resource === "file"
                ? "Share a file link"
                : "Share a resource"}
          </summary>
          <label className="sw-label mt-4 block">
            Title
            <input
              className="sw-input"
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          {resource === "task" ? (
            <>
              <label className="sw-label mt-4 block">
                Assign to
                <select
                  className="sw-input"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {item.team?.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sw-label mt-4 block">
                Deadline (optional)
                <input
                  className="sw-input"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="sw-label mt-4 block">
              HTTPS link
              <input
                className="sw-input"
                type="url"
                maxLength={2048}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
          )}
          <div className="mt-3">
            <Action
              run={async () => {
                await workspaceApi.resource(resource, item.id, {
                  title,
                  url: resource === "task" ? null : url,
                  assignee_id: assignee || null,
                  deadline: deadline ? new Date(deadline).toISOString() : null,
                });
                setTitle("");
                setUrl("");
              }}
            >
              Save {resource}
            </Action>
          </div>
        </details>
      ) : null}
    </>
  );
}
