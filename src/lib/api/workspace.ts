import { readWorkspaceStream } from "./workspace-stream";
import { api, apiRequest } from "./client";
import type { Workspace, Item, Module, StudentProfile } from "./types";

export const workspaceApi = {
  sections: (keys: string[], fullNotifications: boolean, signal?: AbortSignal) =>
    api<Partial<Workspace> & { ready: string[] }>(`/workspace/sections?keys=${keys.join(",")}&full_notifications=${fullNotifications}`, "GET", undefined, { signal }),
  activity: (kind: string, view: string, signal?: AbortSignal) =>
    api<{ items: Item[] }>(`/space-activity/${kind}?view=${view}`, "GET", undefined, { signal }),
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
  detail: async (kind: Module, id: string, signal?: AbortSignal, receive?: (item: Item) => void) => {
    if (receive && (kind === "projects" || kind === "communities")) {
      const response = await apiRequest(`/space-details/${kind}/${id}`, { signal });
      if (!response.body) throw Error("Detail response was empty.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: Item | undefined;
      let complete = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          let end: number;
          while ((end = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
            if (!line.trim()) continue;
            const frame = JSON.parse(line);
            if (frame.error) throw Error(frame.error);
            complete = frame.complete === true;
            result = { ...frame.item, detail_pending: !complete };
            if (!signal?.aborted) receive(result as Item);
          }
          if (done) break;
        }
        if (!complete || !result) throw Error("Detail response was interrupted. Please retry.");
        return result;
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    }
    return api<Item>(
      `${kind === "projects" || kind === "communities" ? "/spaces" : ""}/${kind}/${id}`,
      "GET", undefined, { signal },
    );
  },
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
