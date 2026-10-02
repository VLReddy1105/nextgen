// Vite component fixtures only; never imported by Next.js or the application API.
export async function api<T>(path: string, method = "GET"): Promise<T> {
  if (method !== "GET")
    throw Error("Writes are disabled in the component harness.");
  if (path === "/campus")
    return {
      organizations: [],
      domains: [],
      matching_domains: [],
      requests: [],
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
          status: "accepted",
          skills: ["python"],
        },
      ],
    } as T;
  return {} as T;
}
export async function apiRequest() {
  throw Error("Network writes disabled in fixtures");
}
export class WorkspaceError extends Error {}
