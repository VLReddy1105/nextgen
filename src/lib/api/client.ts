import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export class WorkspaceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await apiRequest(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const {
    data: { session },
    error,
  } = await createSupabaseBrowserClient().auth.getSession();
  if (error || !session)
    throw new WorkspaceError(
      "Your session has expired. Please sign in again.",
      "UNAUTHENTICATED",
      401,
    );
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new WorkspaceError(
      "The workspace service is unavailable. Please retry shortly.",
      "SERVICE_UNAVAILABLE",
      503,
    );
  }
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new WorkspaceError(
      result?.error?.message || "The request could not be completed.",
      result?.error?.code || "REQUEST_FAILED",
      response.status,
    );
  }
  return response;
}
