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

interface State {
  data: Workspace | null;
  error: string;
  loading: boolean;
  refresh: () => Promise<void>;
  mutate: (operation: () => Promise<unknown>) => Promise<void>;
}
export const WorkspaceContext = createContext<State | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const lastSettled = useRef(0);
  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const run = async () => {
      // A write during a read requires a follow-up read, never an overlapping one.
      let version: number;
      do {
        version = revision.current;
        const request = new AbortController();
        controller.current = request;
        try {
          const next = await workspaceApi.load(request.signal);
          if (
            mounted.current &&
            !request.signal.aborted &&
            version === revision.current
          ) {
            setData(next);
            setError("");
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
        if (!mounted.current) controller.current?.abort();
      });
    };
  }, [refresh]);
  const mutate = useCallback(
    async (operation: () => Promise<unknown>) => {
      await operation();
      revision.current++;
      if (mounted.current) await refresh();
    },
    [refresh],
  );
  const value = useMemo(
    () => ({ data, error, loading, refresh, mutate }),
    [data, error, loading, refresh, mutate],
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
  if (loading)
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
      {children}
    </>
  );
}
