import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Static export — the whole app is client-side (keygen, storage, auth all run
  // in the browser), so we ship plain HTML/JS. Served at root on Render Static
  // Site → no basePath, no cold start.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Pin the workspace root to this project (a sibling lockfile exists in the
  // home dir, which otherwise makes Turbopack infer the wrong root).
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
