import type { Item, Module } from "./types";
type Loader = (kind: Module, id: string, signal?: AbortSignal, receive?: (item: Item) => void) => Promise<Item>;
// Owned by one identity-keyed provider. Entries are short-lived and consumed once.
export class DetailReads {
  private entries = new Map<string, { controller: AbortController; promise: Promise<Item>; expires: number; core?: Item; receive?: (item: Item) => void }>();
  private loader: Loader;
  constructor(loader: Loader) { this.loader = loader; }
  clear() {
    for (const entry of this.entries.values()) entry.controller.abort();
    this.entries.clear();
  }
  prefetch(kind: Module, id: string) {
    const key = `${kind}/${id}`;
    for (const [k, entry] of this.entries) if (entry.expires < Date.now()) { entry.controller.abort(); this.entries.delete(k); }
    if (this.entries.has(key) || this.entries.size >= 2) return;
    const entry = { controller: new AbortController(), expires: Date.now() + 3000 } as { controller: AbortController; expires: number; promise: Promise<Item>; core?: Item; receive?: (item: Item) => void };
    entry.promise = this.loader(kind, id, entry.controller.signal, (core) => { entry.core = core; entry.receive?.(core); });
    this.entries.set(key, entry);
    void entry.promise.catch(() => { if (this.entries.get(key) === entry) this.entries.delete(key); });
  }
  read(kind: Module, id: string, signal?: AbortSignal, receive?: (item: Item) => void) {
    const key = `${kind}/${id}`;
    const entry = this.entries.get(key);
    this.entries.delete(key);
    if (!entry || entry.expires < Date.now() || entry.controller.signal.aborted) {
      entry?.controller.abort();
      return this.loader(kind, id, signal, receive);
    }
    const abort = () => entry.controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    entry.receive = (core) => { if (!signal?.aborted) receive?.(core); };
    if (entry.core && !signal?.aborted) receive?.(entry.core);
    return entry.promise.finally(() => { signal?.removeEventListener("abort", abort); entry.receive = undefined; });
  }
}
