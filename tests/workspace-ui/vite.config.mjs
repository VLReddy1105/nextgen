import path from "node:path";
const config = {
  root: path.resolve("tests/workspace-ui"),
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@/lib/api/client": path.resolve("tests/workspace-ui/api.ts"),
      "@": path.resolve("src"),
      "next/link": path.resolve("tests/workspace-ui/link.tsx"),
      "next/navigation": path.resolve("tests/workspace-ui/navigation.ts"),
    },
  },
  css: {
    postcss: { plugins: [(await import("@tailwindcss/postcss")).default()] },
  },
  server: { host: "127.0.0.1", port: 4173, fs: { allow: [path.resolve(".")] } },
};

export default config;
