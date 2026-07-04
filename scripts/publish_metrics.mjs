// scripts/publish_metrics.mjs
// Upload the local public/metrics.json file to a public bucket (e.g., Cloudflare R2, AWS S3, or any S3‑compatible storage).
// This allows the GitHub Action to expose a live metrics.json that anyone can fetch via a simple URL.

import { promises as fs } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ==== Configuration ====================================================
// The bucket where we store the public metrics file.
const METRICS_BUCKET = process.env.METRICS_BUCKET || "YOUR_PUBLIC_BUCKET";
// Endpoint for the S3‑compatible service (Cloudflare R2, etc.)
const METRICS_ENDPOINT = process.env.METRICS_ENDPOINT || "https://<ACCOUNT_ID>.r2.cloudflarestorage.com";

// Create the S3 client – same pattern used in backup_state.mjs
const s3 = new S3Client({
  endpoint: METRICS_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.METRICS_ACCESS_KEY_ID || "YOUR_ACCESS_KEY_ID",
    secretAccessKey: process.env.METRICS_SECRET_ACCESS_KEY || "YOUR_SECRET_ACCESS_KEY",
  },
});

async function uploadMetrics() {
  const metricsPath = path.resolve(import.meta.url, "../..", "public", "metrics.json");
  try {
    const data = await fs.readFile(metricsPath);
    const command = new PutObjectCommand({
      Bucket: METRICS_BUCKET,
      Key: "metrics.json",
      Body: data,
      ContentType: "application/json",
      // Make the object publicly readable – most S3‑compatible services honor this ACL.
      ACL: "public-read",
    });
    await s3.send(command);
    console.log("✅ metrics.json uploaded to", `${METRICS_ENDPOINT}/${METRICS_BUCKET}/metrics.json`);
  } catch (err) {
    console.error("❌ Failed to publish metrics.json:", err);
    process.exit(1);
  }
}

uploadMetrics();
