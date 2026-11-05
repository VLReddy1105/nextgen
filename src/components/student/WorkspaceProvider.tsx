"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import { workspaceApi } from "@/lib/api/workspace";
import type { Workspace } from "@/lib/api/types";
import { usePathname } from "next/navigation";
import { writePlan } from "@/lib/api/refresh-plan";
import { DetailReads } from "@/lib/api/detail-reads";

export type RefreshScope = "workspace" | "notifications" | "none";

function withNotifications(data: Workspace, items: Workspace["notifications"]): Workspace {
  return {
    ...data,
    notifications: items,
    notification_details_loaded: true,
    pending: data.pending?.filter((key) => key !== "notifications"),
    counts: { ...data.counts, notifications: items.filter((n) => !n.read_at).length },
    module_unread: Object.fromEntries(Object.keys(data.module_unread).map((module) => [
      module, items.filter((n) => n.source_module === module && !n.read_at).length,
    ])),
  };
}

interface State {
  details?: DetailReads;
  revisions?: Record<string, number>;
  data: Workspace | null;
  error: string;
  loading: boolean;
  refresh: () => Promise<void>;
  loadNotifications?: () => Promise<void>;
  mutate: (operation: () => Promise<unknown>, scope?: RefreshScope) => Promise<void>;
}
export const WorkspaceContext = createContext<State | null>(null);
export function WorkspaceProvider({ children, progressive = false, compactNotifications = progressive }: { children: React.ReactNode; progressive?: boolean; compactNotifications?: boolean }) {
  const [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const details = useMemo(() => new DetailReads(workspaceApi.detail), []);
  const mounted = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const lastSettled = useRef(0);
  const noticeRevision = useRef(0);
  const noticeFlight = useRef<Promise<void> | null>(null);
  const noticeController = useRef<AbortController | null>(null);
  const initialized = useRef(false);
  const notificationsRequested = useRef(false);
  const sectionFlight = useRef<Promise<void> | null>(null);
  const sectionKeys = useRef(new Set<string>());
  const sectionController = useRef<AbortController | null>(null);
  const pendingProfile = useRef<Workspace["profile"] | null>(null);
  const sectionVersion = useRef(0);
  const refreshSections = useCallback((keys: string[], profile?: object): Promise<void> => {
    sectionVersion.current++;
    if (profile) pendingProfile.current = profile as Workspace["profile"];
    keys.forEach((key) => sectionKeys.current.add(key));
    if (sectionFlight.current) return sectionFlight.current;
    const run = async () => {
      // Let an existing bootstrap finish; revision invalidation prevents it
      // overwriting any subsequent targeted result.
      await inFlight.current;
      while (mounted.current && sectionKeys.current.size) {
        const selected = [...sectionKeys.current];
        sectionKeys.current.clear();
        const version = sectionVersion.current;
        const noticeVersion = noticeRevision.current;
        const request = new AbortController();
        sectionController.current = request;
        const next = await workspaceApi.sections(selected, notificationsRequested.current, request.signal);
        if (!mounted.current || request.signal.aborted) return;
        if (version !== sectionVersion.current) {
          selected.forEach((key) => sectionKeys.current.add(key));
          continue;
        }
        const profile = pendingProfile.current;
        setData((previous) => {
          if (!previous) return previous;
          const merged = {
          ...previous, ...next,
          profile: profile || next.profile || previous.profile,
          counts: { ...previous.counts, ...next.counts },
          module_unread: { ...previous.module_unread, ...next.module_unread },
          pending: previous.pending?.filter((key) => !next.ready.includes(key)),
          };
          return noticeVersion !== noticeRevision.current
            ? withNotifications(merged, previous.notifications) : merged;
        });
      }
      pendingProfile.current = null;
    };
    sectionFlight.current = run().finally(() => {
      sectionFlight.current = null;
      sectionController.current = null;
      pendingProfile.current = null;
    });
    return sectionFlight.current;
  }, []);
  const refresh = useCallback((): Promise<void> => {
    if (sectionFlight.current) return sectionFlight.current;
    if (inFlight.current) return inFlight.current;
    const run = async () => {
      // A write during a read requires a follow-up read, never an overlapping one.
      let version: number;
      do {
        version = revision.current;
        const noticeVersion = noticeRevision.current;
        const request = new AbortController();
        controller.current = request;
        try {
          const next = progressive && !initialized.current
            ? await workspaceApi.progressive((partial) => {
                if (mounted.current && !request.signal.aborted && version === revision.current) {
                  setData((previous) => previous && noticeVersion !== noticeRevision.current
                    ? withNotifications(partial, previous.notifications) : partial);
                  setLoading(false);
                }
              }, request.signal)
            : await (compactNotifications && !notificationsRequested.current ? workspaceApi.summary : workspaceApi.load)(request.signal);
          if (
            mounted.current &&
            !request.signal.aborted &&
            version === revision.current
          ) {
            // A full read started before a targeted update must not undo it.
            setData((previous) => previous && noticeVersion !== noticeRevision.current
              ? withNotifications(next, previous.notifications) : next);
            setError("");
            if (initialized.current) setRevisions((previous) => ({ ...previous, workspace: (previous.workspace || 0) + 1 }));
            initialized.current = true;
          }
        } catch (e) {
          if (
            mounted.current &&
            !request.signal.aborted &&
            version === revision.current
          )
            setError(
              e instanceof Error ? e.message : "Could not load workspace.",
            );
        } finally {
          if (mounted.current && version === revision.current)
            setLoading(false);
        }
      } while (mounted.current && version !== revision.current);
    };
    inFlight.current = run().finally(() => {
      inFlight.current = null;
      controller.current = null;
      lastSettled.current = Date.now();
    });
    return inFlight.current;
  }, [progressive, compactNotifications]);
  const refreshNotifications = useCallback((): Promise<void> => {
    notificationsRequested.current = true;
    if (noticeFlight.current) return noticeFlight.current;
    const run = async () => {
      let version: number;
      let workspaceVersion: number;
      do {
        version = noticeRevision.current;
        workspaceVersion = revision.current;
        const request = new AbortController();
        noticeController.current = request;
        const result = await workspaceApi.notifications(request.signal);
        if (!mounted.current || request.signal.aborted) return;
        if (version === noticeRevision.current && workspaceVersion === revision.current) {
          // Invalidate older full snapshots as well as older notification reads.
          noticeRevision.current++;
          setData((previous) => previous ? withNotifications(previous, result.items) : previous);
          return;
        }
      } while (mounted.current);
    };
    noticeFlight.current = run().finally(() => {
      noticeFlight.current = null;
      noticeController.current = null;
    });
    return noticeFlight.current;
  }, []);
  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastSettled.current >= 30000
      )
        await refresh();
      if (!disposed) timer = setTimeout(() => void poll(), 30000);
    };
    void poll();
    const focus = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastSettled.current >= 30000
      )
        void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      disposed = true;
      mounted.current = false;
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      // StrictMode immediately replays this effect; share its existing request.
      queueMicrotask(() => {
        if (!mounted.current) {
          controller.current?.abort();
          noticeController.current?.abort();
          sectionController.current?.abort();
          details.clear();
        }
      });
    };
  }, [refresh, details]);
  const mutate = useCallback(
    async (operation: () => Promise<unknown>, scope: RefreshScope = "workspace") => {
      const result = await operation();
      details.clear();
      if (!mounted.current || scope === "none") return;
      if (scope === "notifications") {
        noticeRevision.current++;
        await refreshNotifications();
        return;
      }
      const plan = writePlan(result);
      if (plan) {
        await refreshSections(plan.sections, plan.profile);
        if (mounted.current) setRevisions((previous) => {
          const next = { ...previous };
          for (const key of [...plan.sections, ...(plan.entity ? [plan.entity] : [])]) next[key] = (next[key] || 0) + 1;
          return next;
        });
        return;
      }
      revision.current++;
      if (sectionFlight.current) await sectionFlight.current;
      if (mounted.current) await refresh();
    },
    [refresh, refreshNotifications, refreshSections, details],
  );
  const value = useMemo(
    () => ({ data, error, loading, refresh, mutate, revisions, details, loadNotifications: refreshNotifications }),
    [data, error, loading, refresh, mutate, revisions, details, refreshNotifications],
  );
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider required");
  return context;
}
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { data, error, loading, refresh } = useWorkspace();
  const pathname = usePathname();
  const routeModule = pathname.split("/")[2];
  const detailRoute = pathname.split("/").filter(Boolean).length === 3 &&
    ["projects", "communities", "opportunities", "events", "applications", "mentorship"].includes(routeModule);
  // Detail endpoints authorize and load their own item; catalogs are secondary.
  const role = data?.profile.primary_role;
  const required = detailRoute ? []
    : routeModule === "mentorship" ? ["mentors", "sessions"]
    : ["mentors", "mentor-opportunities"].includes(routeModule) ? ["mentor_hub"]
    : role === "mentor" && ["overview", "profile", "requests", "students", "connections"].includes(routeModule) ? ["mentor"]
    : role === "mentor" && routeModule === "sessions" ? ["mentor", "sessions"]
    : routeModule === "talent" ? ["applications"]
    : role === "founder" && routeModule === "connections" ? ["projects", "communities"]
    : role !== "student" && ["opportunities", "events"].includes(routeModule) ? [routeModule, "organizations"]
    : [routeModule];
  const pending = data?.pending?.some((key) => required.includes(key));
  if (loading || (pending && !error))
    return (
      <div
        aria-busy="true"
        aria-label="Loading workspace"
        className="space-y-5"
      >
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  if (error && !data)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-white p-7"
      >
        <h1 className="text-xl font-semibold">
          Let’s reconnect your workspace
        </h1>
        <p className="mt-3 text-slate-600">{error}</p>
        <button className="sw-button mt-5" onClick={() => void refresh()}>
          Retry
        </button>
        <p className="mt-4 text-sm text-slate-500">
          You can retry or sign in again if your session has expired.
        </p>
      </div>
    );
  return (
    <>
      {error ? (
        <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm">
          Updates paused: {error}{" "}
          <button onClick={() => void refresh()} className="underline">
            Retry
          </button>
        </p>
      ) : null}
      {pending ? <p role="status">This section has not loaded yet.</p> : children}
    </>
  );
}

export function WorkspaceSection({ needs, children }: { needs: string[]; children: React.ReactNode }) {
  const { data } = useWorkspace();
  if (data?.pending?.some((key) => needs.includes(key))) return (
    <div role="status" aria-busy="true" className="sw-card my-5 text-sm text-slate-500">Loading this section…</div>
  );
  return <>{children}</>;
}
