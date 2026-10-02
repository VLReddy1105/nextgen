"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "./types";

export function isSupabaseConfigured() {
  try { getSupabaseConfig(); return true; } catch { return false; }
}

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseConfig();

  return createBrowserClient<Database>(url, anonKey);
}
