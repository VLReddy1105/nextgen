import type { Workspace } from "./types";

export async function readWorkspaceStream(response: Response, receive: (data: Workspace) => void, signal: AbortSignal): Promise<Workspace> {
    if (!response.body) throw new Error("Workspace response was empty.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let snapshot: Workspace | undefined;
    const accept = (line: string) => {
      if (!line.trim()) return;
      const part = JSON.parse(line) as Partial<Workspace> & { ready?: string; error?: string };
      if (part.error) throw new Error(part.error);
      snapshot = snapshot ? {
        ...snapshot, ...part,
        counts: { ...snapshot.counts, ...part.counts },
        module_unread: { ...snapshot.module_unread, ...part.module_unread },
        pending: snapshot.pending?.filter((key) => key !== part.ready),
      } : part as Workspace;
      if (!signal.aborted) receive(snapshot);
    };
    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let end: number;
        while ((end = buffer.indexOf("\n")) >= 0) {
          accept(buffer.slice(0, end));
          buffer = buffer.slice(end + 1);
        }
        if (done) break;
      }
      accept(buffer);
      if (!snapshot || snapshot.pending?.length) throw new Error("Workspace response was interrupted. Please retry.");
      return snapshot;
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
}
