import type { NextConfig } from "next";
import { getSupabaseConfig } from "./src/lib/supabase/config";

// Reject malformed/privileged keys before Next.js builds public browser assets.
// With both values absent, allow the auth UI to explain the missing setup.
if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  getSupabaseConfig();
}

const config: NextConfig = {};
export default config;
