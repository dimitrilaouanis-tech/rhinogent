// scripts/fetch_metrics.mjs
// Pull the latest metrics.json from a public bucket (R2/S3) and write it locally.
// Useful for GitHub Actions to keep `public/metrics.json` up‑to‑date before committing.

import { promises as fs } from "node:fs";
import path from "node:path";
import fetch from "node-fetch";

// ==== Configuration ====================================================
// Public URL of the metrics file. Example for Cloudflare R2:
//   https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET>/metrics.json
// You can also point to an S3 public URL or any raw file URL.
const METRICS_URL = process.env.METRICS_URL || "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/YOUR_PUBLIC_BUCKET/metrics.json";

async function fetchAndWrite() {
  try {
    const res = await fetch(METRICS_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch metrics: ${res.status} ${res.statusText}`);
    }
    const data = await res.text();
    const targetPath = path.resolve(import.meta.url, "../..", "public", "metrics.json");
    await fs.writeFile(targetPath, data, "utf8");
    console.log(`✅ metrics.json refreshed from ${METRICS_URL}`);
  } catch (err) {
    console.error("❌ Error fetching metrics.json:", err);
    process.exit(1);
  }
}

fetchAndWrite();
