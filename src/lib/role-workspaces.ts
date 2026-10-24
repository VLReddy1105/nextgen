// Navigation is a UX boundary; server role guards and database RLS remain authoritative.
export const roleModules: Record<string, string[]> = {
  student: [
    "overview",
    "my-university",
    "opportunities",
    "applications",
    "projects",
    "communities",
    "events",
    "mentorship",
    "ai-tools",
    "notifications",
    "profile",
    "settings",
    "help",
    "project-invite",
  ],
  company: [
    "overview",
    "opportunities",
    "applications",
    "projects",
    "talent",
    "communities",
    "events",
    "notifications",
    "profile",
    "settings",
  ],
  university: [
    "overview",
    "students",
    "student-connections",
    "opportunities",
    "applications",
    "projects",
    "communities",
    "events",
    "announcements",
    "notifications",
    "profile",
    "settings",
  ],
  mentor: [
    "overview",
    "profile",
    "students",
    "requests",
    "connections",
    "sessions",
    "projects",
    "communities",
    "events",
    "notifications",
    "settings",
  ],
  founder: [
    "overview",
    "projects",
    "communities",
    "connections",
    "events",
    "notifications",
    "profile",
    "settings",
  ],
};
export function moduleLabel(role: string, key: string) {
  if (key === "applications" && role !== "student") return "Applicants";
  if (key === "connections" && role === "mentor") return "Mentorship";
  if (key === "student-connections") return "Student Connections";
  if (key === "profile")
    return role === "student" || role === "mentor"
      ? "My Profile"
      : `${role[0].toUpperCase()}${role.slice(1)} Profile`;
  return key[0].toUpperCase() + key.slice(1);
}
export function canOpenModule(role: string, module: string) {
  return roleModules[role]?.includes(module) ?? false;
}
export function canManageSpace(kind: string, contextualRole?: string) {
  return kind === "projects"
    ? contextualRole === "project_head"
    : kind === "communities" && contextualRole === "captain";
}
export function canEditPublication(
  kind: string,
  userId: string,
  item: { created_by?: string; organizer_id?: string },
) {
  return kind === "opportunities"
    ? item.created_by === userId
    : kind === "events" && item.organizer_id === userId;
}
