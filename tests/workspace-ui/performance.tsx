// Isolated, credential-free tests of the real provider and module components.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  WorkspaceProvider,
  WorkspaceGate,
  useWorkspace,
} from "../../src/components/student/WorkspaceProvider";
import {
  StudentListing,
  StudentOverview,
} from "../../src/components/student/StudentModules";
import { workspaceApi } from "../../src/lib/api/workspace";
import type { Workspace, Module } from "../../src/lib/api/types";
import "./style.css";

let calls = 0;
let revision = 0;
const pending: Array<{
  resolve: (data: Workspace) => void;
  reject: (error: Error) => void;
  revision: number;
}> = [];
function fixture(version: number): Workspace {
  return {
    profile: {
      id: "fixture",
      full_name: `Revision ${version}`,
      headline: "",
      email_verified: true,
      primary_role: "student",
      email: "fixture@example.test",
      skills: [],
      interests: [],
      memberships: [],
      completion: { percent: 0, checklist: [] },
    },
    opportunities: [],
    projects: [],
    communities: [],
    events: [],
    applications: [],
    mentors: [],
    notifications: [],
    sessions: [],
    counts: {},
    module_unread: {},
  } as Workspace;
}
workspaceApi.load = (signal) => {
  calls++;
  document.documentElement.dataset.calls = String(calls);
  return new Promise<Workspace>((resolve, reject) => {
    pending.push({ resolve, reject, revision });
    signal?.addEventListener(
      "abort",
      () => {
        document.documentElement.dataset.aborted = "true";
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
};
function Controls() {
  const { data, refresh, mutate } = useWorkspace();
  const [module, setModule] = useState("overview");
  return (
    <>
      <output data-testid="revision">
        {data?.profile.full_name || "empty"}
      </output>
      <button onClick={() => void refresh()}>Refresh test</button>
      <button
        onClick={() =>
          void mutate(async () => {
            revision++;
          })
        }
      >
        Mutate test
      </button>
      <button
        onClick={() => {
          for (const item of pending.splice(0))
            item.resolve(fixture(item.revision));
        }}
      >
        Resolve test
      </button>
      <button
        onClick={() => {
          for (const item of pending.splice(0))
            item.reject(new Error("Test failure"));
        }}
      >
        Reject test
      </button>
      <nav>
        {["overview", "opportunities", "projects", "communities", "events"].map(
          (name) => (
            <button key={name} onClick={() => setModule(name)}>
              Open {name}
            </button>
          ),
        )}
      </nav>
      <main>
        <WorkspaceGate>
          {module === "overview" ? (
            <StudentOverview />
          ) : (
            <StudentListing key={module} kind={module as Module} />
          )}
        </WorkspaceGate>
      </main>
    </>
  );
}
function App() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <button onClick={() => setVisible(false)}>Unmount test</button>
      {visible ? (
        <WorkspaceProvider>
          <Controls />
        </WorkspaceProvider>
      ) : null}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
