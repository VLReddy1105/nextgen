import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudentShell } from "../../src/components/student/StudentShell";
import { useWorkspace } from "../../src/components/student/WorkspaceProvider";
import "./style.css";

const query = new URLSearchParams(location.search);
const role = query.get("role") || "student";
const scenario = query.get("scenario");
Object.defineProperty(globalThis, "process", { value: { env: { NEXT_PUBLIC_API_BASE_URL: "http://fixture.invalid" } }, configurable: true });
const profile = { id: "fixture", full_name: "Fixture", primary_role: role, email: "fixture@example.test", headline: "",
  skills: [], interests: [], memberships: [], completion: { percent: 0, checklist: [] } };
const workspace = { profile, opportunities: [], projects: [], communities: [], events: [], mentors: [], applications: [],
  notifications: [], sessions: [], invitations: [], organizations: [], activity: [], counts: {}, module_unread: {} };
let calls = 0;
globalThis.fetch = async (input, options) => {
  const url = String(input);
  if (!url.startsWith("http://fixture.invalid/api/v1/workspace")) throw new Error("Unexpected fixture request");
  if ((options?.headers as Record<string, string>).Authorization !== "Bearer fixture-session") throw new Error("Missing session");
  document.documentElement.dataset.calls = String(++calls);
  await new Promise(resolve => setTimeout(resolve, 100));
  if (scenario === "missing") return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
  if (scenario === "expired") return new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Your session has expired. Sign in again." } }), { status: 401 });
  if (url.endsWith("/progressive")) return new Response(JSON.stringify({ ...workspace, pending: [] }) + "\n", { headers: { "Content-Type": "application/x-ndjson" } });
  return Response.json(workspace);
};
function Overview() {
  const { data } = useWorkspace();
  return <h1>{data?.profile.primary_role} overview ready</h1>;
}
createRoot(document.getElementById("root")!).render(<StrictMode>
  <StudentShell identity="fixture" role={role} user={{ name: "Fixture", initials: "F" }}><Overview /></StudentShell>
</StrictMode>);
