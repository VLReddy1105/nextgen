// Metadata is attached locally, never accepted from a server or another account.
const writes = new WeakMap<object, { sections: string[]; profile?: object; entity?: string }>();
export function recordWrite(path: string, method: string, result: unknown) {
  if (method === "GET" || !result || typeof result !== "object") return;
  let sections: string[] | undefined;
  if (path.startsWith("/mentor-hub/")) sections = ["mentor_hub", "mentor", "sessions", "notifications", "activity"];
  else if (path.startsWith("/mentorship/") || path.startsWith("/connections/")) sections = ["mentors", "mentor", "connections", "sessions", "notifications"];
  else if (path === "/sessions") sections = ["sessions", "mentor", "mentor_hub", "notifications", "activity"];
  else if (path === "/mentor/profile") sections = ["profile", "mentor", "mentor_hub"];
  else if (path.startsWith("/opportunities") || path.startsWith("/applications")) sections = ["opportunities", "applications", "notifications", "activity"];
  else if (path.startsWith("/events")) sections = ["events", "notifications", "activity"];
  else if (path.startsWith("/campus")) sections = ["profile", "organizations", "campus_progress", "projects", "communities", "events", "opportunities", "notifications"];
  else if (path === "/students/me") sections = ["opportunities", "projects", "communities", "events", "mentors", "notifications"];
  else if (/^\/(relationships|spaces)\/projects|^\/projects|^\/tasks|^\/project-codes/.test(path)) sections = ["projects", "invitations", "notifications", "activity", "mentor"];
  else if (/^\/(relationships|spaces)\/communities|^\/communities|^\/posts/.test(path)) sections = ["communities", "invitations", "notifications", "activity"];
  else if (/^\/(invitations|join-requests)/.test(path)) sections = ["projects", "communities", "invitations", "notifications", "activity", "mentor"];
  else if (path.startsWith("/resources/")) sections = ["projects", "communities", "activity"];
  const entity = path.startsWith("/campus") ? "campus" : path.match(/^\/(?:relationships\/|spaces\/)?(projects|communities|events|opportunities|applications)\/([^/]+)/)?.slice(1).join("/");
  if (sections) writes.set(result, { sections, entity, ...(path === "/students/me" ? { profile: result } : {}) });
}
export function writePlan(result: unknown) {
  return result && typeof result === "object" ? writes.get(result) : undefined;
}
