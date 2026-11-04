// Only the isolated Vite harness resolves this module; no real sessions or tokens.
type Listener = (event: string, session: { user: { id: string } } | null) => void;
const listeners = new Set<Listener>();
export function emitSession(id: string | null) {
  for (const listener of listeners) listener(id ? "SIGNED_IN" : "SIGNED_OUT", id ? { user: { id } } : null);
}
export function createSupabaseBrowserClient() {
  return { auth: { async getSession() {
    return { data: { session: { user: { id: "fixture" }, access_token: "fixture-session" } }, error: null };
  }, onAuthStateChange(listener: Listener) {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  } } };
}
