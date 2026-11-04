import { useState } from "react";
import { createRoot } from "react-dom/client";
import { StudentShell } from "../../src/components/student/StudentShell";
import { useWorkspace } from "../../src/components/student/WorkspaceProvider";
import { workspaceApi } from "../../src/lib/api/workspace";
import { emitSession } from "./session-client";
import type { Workspace } from "../../src/lib/api/types";
import "./style.css";
let identity = "one";
const pending: (() => void)[] = [];
workspaceApi.load = (signal) => {
  const id = identity;
  signal?.addEventListener("abort", () => { document.documentElement.dataset[`aborted${id}`] = "true"; }, { once: true });
  return new Promise((resolve) => pending.push(() => resolve({
    profile: { id, full_name: `Private ${id}`, primary_role: "student", email: "fixture@example.test",
      headline: "", email_verified: true, skills: [], interests: [], memberships: [], completion: { percent: 0, checklist: [] } },
    opportunities: [], applications: [], projects: [], communities: [], events: [], mentors: [], notifications: [], sessions: [], counts: {}, module_unread: {},
  } as Workspace)));
};
function Private() {
  const { data, refresh } = useWorkspace();
  return <><p>{data?.profile.full_name}</p><button onClick={() => void refresh()}>Old request</button></>;
}
function App() {
  const [account, setAccount] = useState("one");
  return <>
    <div style={{ position: "fixed", bottom: 0, right: 0, zIndex: 1000, background: "white" }}>
    <button onClick={() => pending.splice(0).forEach((resolve) => resolve())}>Resolve accounts</button>
    <button onClick={() => emitSession("two")}>Change session</button>
    <button onClick={() => { identity = "two"; setAccount("two"); }}>Server identity</button>
    <button onClick={() => emitSession(null)}>Sign out fixture</button>
    </div>
    <StudentShell key={account} identity={account} user={{ name: account, initials: "T" }}><Private /></StudentShell>
  </>;
}
createRoot(document.getElementById("root")!).render(<App />);
