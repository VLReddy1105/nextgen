import { api } from "./client";
import type { Workspace, Item, Module, StudentProfile } from "./types";

export const workspaceApi = {
  create: (kind: string, body: unknown) =>
    api<{ id: string }>(`/spaces/${kind}`, "POST", body),
  load: () => api<Workspace>("/workspace"),
  profile: () => api<StudentProfile>("/students/me"),
  saveProfile: (body: unknown) =>
    api<StudentProfile>("/students/me", "PATCH", body),
  detail: (kind: Module, id: string) =>
    api<Item>(
      `${kind === "projects" || kind === "communities" ? "/spaces" : ""}/${kind}/${id}`,
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
  task: (id: string, status: string) =>
    api(`/tasks/${id}`, "PATCH", { status }),
  post: (id: string, body: unknown) =>
    api(`/communities/${id}/posts`, "POST", body),
  like: (id: string, enabled: boolean) =>
    api(`/posts/${id}/reaction`, "PUT", { enabled }),
};
