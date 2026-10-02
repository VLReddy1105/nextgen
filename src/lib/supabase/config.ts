export class SupabaseConfigError extends Error {
  readonly code: "CONFIG_MISSING" | "CONFIG_INVALID";

  constructor(code: "CONFIG_MISSING" | "CONFIG_INVALID") {
    super(code === "CONFIG_MISSING"
      ? "Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the development server."
      : "Supabase configuration is invalid. Use your project URL and matching public anon or publishable key, then restart the development server. Never use a secret or service-role key.");
    this.name = "SupabaseConfigError";
    this.code = code;
  }
}

/** Shape validation only: the auth server determines whether a public key is valid. */
export function validateSupabaseConfig(rawUrl: string | undefined, rawKey: string | undefined) {
  if (!rawUrl?.trim() || !rawKey?.trim()) throw new SupabaseConfigError("CONFIG_MISSING");
  const url = rawUrl.trim();
  const anonKey = rawKey.trim();
  const invalid = () => new SupabaseConfigError("CONFIG_INVALID");
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw invalid(); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
      parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/" ||
      /[<>\s]/.test(url)) throw invalid();

  if (anonKey.startsWith("sb_publishable_")) {
    if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(anonKey)) throw invalid();
  } else {
    // Decode only to reject privileged/non-public keys, never to authenticate a JWT.
    try {
      const parts = anonKey.split(".");
      if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw invalid();
      const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
      const header = decode(parts[0]);
      const payload = decode(parts[1]);
      if (header.alg !== "HS256" || payload.role !== "anon" || parts[2].length !== 43) throw invalid();
    } catch { throw invalid(); }
  }
  return { url: parsed.origin, anonKey };
}

export function getSupabaseConfig() {
  // Keep literal accesses so Next.js can inline public environment variables.
  return validateSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
