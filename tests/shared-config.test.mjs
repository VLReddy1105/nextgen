import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
for (const mode of ["development", "production", "test"]) {
  test(`Next.js fresh checkout config: ${mode}`, () => {
    const dir = mkdtempSync(join(tmpdir(), "genznect-config-"));
    try {
      copyFileSync(".env.development", join(dir, ".env.development"));
      const env = { ...process.env, NODE_ENV: mode };
      for (const key of Object.keys(env)) if (key.startsWith("NEXT_PUBLIC_") || key === "__NEXT_PROCESSED_ENV" || key === "FRONTEND_ORIGIN") delete env[key];
      const script = `const {loadEnvConfig}=require(${JSON.stringify(require.resolve("@next/env"))}); loadEnvConfig(${JSON.stringify(dir)},${mode === "development"}); const u=process.env.NEXT_PUBLIC_SUPABASE_URL; const k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (${mode === "development"}) { if(u!=="https://orhoolcpcbihfrbkpioz.supabase.co" || !k || k.startsWith("sb_secret_")) process.exit(1); } else if(u || k) process.exit(2);`;
      const result = spawnSync(process.execPath, ["-e", script], { env, encoding: "utf8" });
      assert.equal(result.status, 0, "Configuration separation failed");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
