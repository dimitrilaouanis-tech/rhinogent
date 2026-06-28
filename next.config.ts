import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// GitHub Pages serves a project site under /<repo>; Render/local serve at root.
// PAGES=true switches on the subpath for the Pages build only.
const isPages = process.env.PAGES === "true";

const nextConfig: NextConfig = {
  // Static export — the whole app is client-side (keygen, storage, auth all run
  // in the browser), so we ship plain HTML/JS. No cold start.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isPages ? { basePath: "/rhinogent", assetPrefix: "/rhinogent" } : {}),
  // Pin the workspace root to this project (a sibling lockfile exists in the
  // home dir, which otherwise makes Turbopack infer the wrong root).
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
