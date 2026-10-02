"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    try {
      const next = await workspaceApi.load();
      if (version === generation.current) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (version === generation.current)
        setError(e instanceof Error ? e.message : "Could not load workspace.");
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => {
      invalidate();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh, invalidate]);
  const mutate = async (operation: () => Promise<unknown>) => {
    await operation();
    await refresh();
  };
  return (
    <WorkspaceContext.Provider
      value={{ data, error, loading, refresh, mutate }}
    >
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
