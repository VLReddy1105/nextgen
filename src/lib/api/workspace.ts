import { readWorkspaceStream } from "./workspace-stream";
import { api, apiRequest } from "./client";
import type { Workspace, Item, Module, StudentProfile } from "./types";

export const workspaceApi = {
  progressive: async (receive: (data: Workspace) => void, signal: AbortSignal) => {
    const response = await apiRequest("/workspace/progressive", { signal });
    return readWorkspaceStream(response, receive, signal);
  },
  create: (kind: string, body: unknown) =>
    api<{ id: string }>(`/spaces/${kind}`, "POST", body),
  load: (signal?: AbortSignal) =>
    api<Workspace>("/workspace", "GET", undefined, { signal }),
  summary: (signal?: AbortSignal) =>
    api<Workspace>("/workspace?full_notifications=false", "GET", undefined, { signal }),
  profile: () => api<StudentProfile>("/students/me"),
  saveProfile: (body: unknown) =>
    api<StudentProfile>("/students/me", "PATCH", body),
  detail: (kind: Module, id: string, signal?: AbortSignal) =>
    api<Item>(
      `${kind === "projects" || kind === "communities" ? "/spaces" : ""}/${kind}/${id}`,
      "GET", undefined, { signal },
    ),
  apply: (id: string) =>
    api<{ id: string }>(`/opportunities/${id}/applications`, "POST"),
  save: (id: string, enabled: boolean) =>
    api(`/opportunities/${id}/saved`, "PUT", { enabled }),
  withdraw: (id: string) =>
    api(`/applications/${id}/status`, "PATCH", { status: "withdrawn" }),
  join: (kind: "projects" | "communities", id: string) =>
    api(`/spaces/${kind}/${id}/join`, "POST"),
  invite: (kind: string, id: string, email: string) =>
    api(`/spaces/${kind}/${id}/invitations`, "POST", { email }),
  resource: (kind: string, id: string, body: unknown) =>
    api(`/resources/${kind}/${id}`, "POST", body),
  register: (id: string, enabled: boolean) =>
    api(`/events/${id}/registration`, "PUT", { enabled }),
  read: (id: string) => api(`/notifications/${id}/read`, "PATCH"),
  readAll: () => api("/notifications/read-all", "POST"),
  notifications: (signal?: AbortSignal) =>
    api<{ items: Workspace["notifications"]; unread: number }>(
      "/notifications", "GET", undefined, { signal },
    ),
  task: (id: string, status: string) =>
    api(`/tasks/${id}`, "PATCH", { status }),
  post: (id: string, body: unknown) =>
    api(`/communities/${id}/posts`, "POST", body),
  like: (id: string, enabled: boolean) =>
    api(`/posts/${id}/reaction`, "PUT", { enabled }),
};
