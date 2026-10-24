// Vite component fixtures only; never imported by Next.js or the application API.
export const roleFixture = {
  mentorStatus: "requested",
  campusStatus: "pending",
};
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const scenario = new URLSearchParams(location.search).get("scenario");
  if (scenario === "failure" && ["/connections", "/campus"].includes(path))
    throw Error("Controlled connection read failed");
  if (method !== "GET" && scenario === "roles") {
    if (path === "/connections/test-student/decision")
      roleFixture.mentorStatus = (body as { accept: boolean }).accept
        ? "accepted"
        : "declined";
    else if (path === "/mentorship/mentor/request") {
      if (roleFixture.mentorStatus !== "none")
        throw Error("An active request already exists");
      roleFixture.mentorStatus = "requested";
    } else if (path === "/campus/requests/campus-request/decision")
      roleFixture.campusStatus = (body as { accept: boolean }).accept
        ? "approved"
        : "declined";
    else throw Error("Unsupported fixture mutation");
    return { ok: true } as T;
  }
  if (method !== "GET")
    throw Error("Writes are disabled in the component harness.");
  if (path === "/campus")
    return {
      organizations: [],
      domains: [],
      matching_domains: [],
      requests:
        scenario === "roles"
          ? [
              {
                id: "campus-request",
                student_id: "test-student",
                university_id: "test-organization",
                full_name: "Test Student",
                status: roleFixture.campusStatus,
              },
            ]
          : [],
      invitations: [],
      announcements: [],
      progress: [],
    } as T;
  if (path === "/mentor/profile")
    return {
      full_name: "Python Mentor",
      headline: "Backend engineer",
      expertise: ["python"],
      skills: ["fastapi"],
      topics: [],
      years_experience: 5,
      availability_status: "available",
    } as T;
  if (path === "/connections")
    return {
      items: [
        {
          student_id: "test-student",
          full_name: "Test Student",
          status: scenario === "roles" ? roleFixture.mentorStatus : "accepted",
          skills: ["python"],
        },
      ],
    } as T;
  if (path === "/settings")
    return { in_app_notifications: true, profile_visibility: "members" } as T;
  return {} as T;
}
export async function apiRequest() {
  throw Error("Network writes disabled in fixtures");
}
export class WorkspaceError extends Error {}
