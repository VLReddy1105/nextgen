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
import { StudentNotifications } from "../../src/components/student/StudentExtras";
import { StudentDetail } from "../../src/components/student/StudentDetail";
import type { Workspace, Module } from "../../src/lib/api/types";
import "./style.css";
import { recordWrite } from "../../src/lib/api/refresh-plan";

let calls = 0;
let sectionCalls = 0;
const sections: (() => void)[] = [];
workspaceApi.sections = async (keys) => {
  const version = ++sectionCalls;
  document.documentElement.dataset.sectionCalls = String(sectionCalls);
  return new Promise(resolve => sections.push(() => resolve({
    ready: keys, projects: [{ id: "p", title: `Section ${version}` }],
    notifications: fixture(0).notifications, counts: { notifications: 1 }, module_unread: { projects: 1 },
  })));
};
const progressive = new URLSearchParams(location.search).has("progressive");
let receiveSection: ((value: Workspace) => void) | undefined;
let finishStream: ((value: Workspace) => void) | undefined;
let partial: Workspace;
const detailPending: Array<{ id: string; resolve: (item: import("../../src/lib/api/types").Item) => void }> = [];
workspaceApi.detail = (_kind, id, signal) => {
  document.documentElement.dataset.detailCalls = String(Number(document.documentElement.dataset.detailCalls || 0) + 1);
  signal?.addEventListener("abort", () => { document.documentElement.dataset.detailAborted = "true"; }, { once: true });
  return new Promise(resolve => detailPending.push({ id, resolve }));
};
let revision = 0;
let noticeCalls = 0;
let resolveNotice: (() => void) | undefined;
let rejectNotice: (() => void) | undefined;
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
    notifications: [{ id: "notice", type: "test", title: "Test", message: "Test", source_module: "projects",
      action_url: "/dashboard/projects", read_at: null, created_at: "2026-01-01" }],
    sessions: [],
    counts: { notifications: 1 },
    module_unread: { projects: 1 },
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
workspaceApi.notifications = (signal) => {
  document.documentElement.dataset.noticeCalls = String(++noticeCalls);
  return new Promise((resolve, reject) => {
    resolveNotice = () => resolve({ items: fixture(0).notifications.map((n) => ({ ...n, read_at: "2026-11-04" })), unread: 0 });
    rejectNotice = () => reject(new Error("Notification read failed"));
    signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
};
workspaceApi.read = async () => ({ ok: true });
workspaceApi.readAll = async () => ({ ok: true });
workspaceApi.progressive = (receive, signal) => {
  document.documentElement.dataset.calls = String(++calls);
  receiveSection = receive;
  return new Promise((resolve, reject) => {
    finishStream = resolve;
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
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
      <output data-testid="unread">{data?.counts.notifications}</output>
      <output data-testid="module-unread">{data?.module_unread.projects}</output>
      <output data-testid="section-result">{data?.projects[0]?.title || "empty"}</output>
      <button onClick={() => void mutate(async () => {
        const result = { ok: true };
        recordWrite("/spaces/projects/p/join", "POST", result);
        return result;
      })}>Targeted mutation</button>
      <button onClick={() => sections.splice(0).forEach(resolve => resolve())}>Resolve sections</button>
      {progressive && <>
        {["A", "B"].map(id => <span key={id}>
          <button onClick={() => { history.replaceState(null, "", `?progressive&page=projects/${id}`); setModule(`detail${id}`); }}>Open detail {id}</button>
          <button onClick={() => { for (let i = detailPending.length - 1; i >= 0; i--) if (detailPending[i].id === id) detailPending.splice(i, 1)[0].resolve({ id, title: `Project ${id}`, joined: false }); }}>Resolve detail {id}</button>
        </span>)}
        <button onClick={() => {
          partial = { ...fixture(0), notifications: [], counts: {}, module_unread: {}, notification_details_loaded: false,
            pending: ["projects", "opportunities", "communities", "events", "mentors", "sessions", "applications", "invitations", "notifications"] };
          receiveSection?.(partial);
        }}>Profile ready</button>
        <button onClick={() => {
          partial = { ...partial, pending: partial.pending?.filter((key) => key !== "projects" && key !== "invitations") };
          receiveSection?.(partial);
        }}>Projects ready</button>
        <button onClick={() => {
          partial = { ...partial, pending: [], counts: { notifications: 1 }, module_unread: { projects: 1 } };
          receiveSection?.(partial); finishStream?.(partial);
        }}>Stream complete</button>
      </>}
      <button onClick={() => void mutate(() => workspaceApi.read("notice"), "notifications").catch(() => {})}>Mark one test</button>
      <button onClick={() => void mutate(() => workspaceApi.readAll(), "notifications").catch(() => {})}>Mark all test</button>
      <button onClick={() => resolveNotice?.()}>Resolve notices</button>
      <button onClick={() => rejectNotice?.()}>Reject notices</button>
      <button onClick={() => void mutate(async () => {}, "none")}>No refresh test</button>
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
        {["overview", "opportunities", "projects", "communities", "events", "notifications"].map(
          (name) => (
            <button key={name} onClick={() => { if (progressive) history.replaceState(null, "", `?progressive&page=${name}`); setModule(name); }}>
              Open {name}
            </button>
          ),
        )}
      </nav>
      <main>
        <WorkspaceGate>
          {module.startsWith("detail") ? <StudentDetail kind="projects" id={module.slice(-1)} /> : module === "overview" ? (
            <StudentOverview />
          ) : module === "notifications" ? (
            <StudentNotifications />
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
        <WorkspaceProvider progressive={progressive}>
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
